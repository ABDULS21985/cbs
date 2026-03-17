package com.cbs.payments.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.payments.entity.*;
import com.cbs.payments.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PaymentService {

    private final PaymentInstructionRepository paymentRepository;
    private final PaymentBatchRepository batchRepository;
    private final FxRateRepository fxRateRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;
    private final CurrentActorProvider currentActorProvider;

    // ========================================================================
    // INTERNAL TRANSFER (Cap 27)
    // ========================================================================

    @Transactional
    public PaymentInstruction executeInternalTransfer(Long debitAccountId, Long creditAccountId,
                                                        BigDecimal amount, String narration) {
        Account debitAccount = accountRepository.findById(debitAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", debitAccountId));
        Account creditAccount = accountRepository.findById(creditAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", creditAccountId));

        if (debitAccount.getAvailableBalance().compareTo(amount) < 0) {
            throw new BusinessException("Insufficient balance", "INSUFFICIENT_BALANCE");
        }
        if (debitAccountId.equals(creditAccountId)) {
            throw new BusinessException("Cannot transfer to the same account", "SAME_ACCOUNT");
        }

        Long seq = paymentRepository.getNextInstructionSequence();
        String ref = String.format("TRF%015d", seq);

        PaymentInstruction payment = PaymentInstruction.builder()
                .instructionRef(ref).paymentType(PaymentType.INTERNAL_TRANSFER)
                .debitAccount(debitAccount).debitAccountNumber(debitAccount.getAccountNumber())
                .creditAccount(creditAccount).creditAccountNumber(creditAccount.getAccountNumber())
                .beneficiaryName(creditAccount.getCustomer().getDisplayName())
                .amount(amount).currencyCode(debitAccount.getCurrencyCode())
                .paymentRail("INTERNAL").clearingSystem("BOOK_TRANSFER")
                .remittanceInfo(narration)
                .status(PaymentStatus.PROCESSING).build();

        // Cross-currency check
        if (!debitAccount.getCurrencyCode().equals(creditAccount.getCurrencyCode())) {
            FxRate rate = getLatestRate(debitAccount.getCurrencyCode(), creditAccount.getCurrencyCode());
            BigDecimal converted = amount.multiply(rate.getSellRate()).setScale(2, RoundingMode.HALF_UP);
            payment.setFxRate(rate.getSellRate());
            payment.setFxSourceCurrency(debitAccount.getCurrencyCode());
            payment.setFxTargetCurrency(creditAccount.getCurrencyCode());
            payment.setFxConvertedAmount(converted);
            accountPostingService.postTransfer(
                    debitAccount,
                    creditAccount,
                    amount,
                    converted,
                    narration != null ? narration : "Internal transfer to " + creditAccount.getAccountNumber(),
                    "Internal transfer from " + debitAccount.getAccountNumber(),
                    TransactionChannel.SYSTEM,
                    ref);
        } else {
            accountPostingService.postTransfer(
                    debitAccount,
                    creditAccount,
                    amount,
                    amount,
                    narration != null ? narration : "Internal transfer to " + creditAccount.getAccountNumber(),
                    "Internal transfer from " + debitAccount.getAccountNumber(),
                    TransactionChannel.SYSTEM,
                    ref);
        }

        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setExecutionDate(LocalDate.now());
        PaymentInstruction saved = paymentRepository.save(payment);

        log.info("Internal transfer completed: ref={}, amount={}, {} → {}",
                ref, amount, debitAccount.getAccountNumber(), creditAccount.getAccountNumber());
        return saved;
    }

    // ========================================================================
    // DOMESTIC INSTANT (Cap 27)
    // ========================================================================

    @Transactional
    public PaymentInstruction initiateDomesticPayment(Long debitAccountId, String creditAccountNumber,
                                                        String beneficiaryName, String beneficiaryBankCode,
                                                        BigDecimal amount, String currencyCode,
                                                        String narration, boolean isInstant) {
        Account debitAccount = accountRepository.findById(debitAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", debitAccountId));

        if (debitAccount.getAvailableBalance().compareTo(amount) < 0) {
            throw new BusinessException("Insufficient balance", "INSUFFICIENT_BALANCE");
        }

        Long seq = paymentRepository.getNextInstructionSequence();
        String ref = String.format("PAY%015d", seq);

        PaymentInstruction payment = PaymentInstruction.builder()
                .instructionRef(ref)
                .paymentType(isInstant ? PaymentType.DOMESTIC_INSTANT : PaymentType.DOMESTIC_BATCH)
                .debitAccount(debitAccount).debitAccountNumber(debitAccount.getAccountNumber())
                .creditAccountNumber(creditAccountNumber)
                .beneficiaryName(beneficiaryName).beneficiaryBankCode(beneficiaryBankCode)
                .amount(amount).currencyCode(currencyCode)
                .paymentRail(isInstant ? "INSTANT" : "ACH")
                .remittanceInfo(narration)
                .screeningStatus("CLEAR") // Simplified — production would invoke sanctions screening
                .status(PaymentStatus.VALIDATED).build();

        // Debit immediately
        accountPostingService.postDebit(
                debitAccount,
                TransactionType.TRANSFER_OUT,
                amount,
                narration != null ? narration : "Domestic payment to " + creditAccountNumber,
                TransactionChannel.SYSTEM,
                ref + ":DR");

        // For internal bank transfers, check if credit account exists locally
        Account localCreditAccount = accountRepository.findByAccountNumber(creditAccountNumber).orElse(null);
        if (localCreditAccount != null) {
            accountPostingService.postCredit(
                    localCreditAccount,
                    TransactionType.TRANSFER_IN,
                    amount,
                    narration != null ? narration : "Domestic payment from " + debitAccount.getAccountNumber(),
                    TransactionChannel.SYSTEM,
                    ref + ":CR");
            payment.setCreditAccount(localCreditAccount);
            payment.setStatus(PaymentStatus.COMPLETED);
            payment.setExecutionDate(LocalDate.now());
        } else {
            // External — mark as submitted for clearing
            payment.setStatus(PaymentStatus.SUBMITTED);
        }

        PaymentInstruction saved = paymentRepository.save(payment);
        log.info("Domestic payment initiated: ref={}, type={}, amount={}", ref, payment.getPaymentType(), amount);
        return saved;
    }

    // ========================================================================
    // INTERNATIONAL WIRE / SWIFT (Cap 29)
    // ========================================================================

    @Transactional
    public PaymentInstruction initiateSwiftTransfer(Long debitAccountId, String creditAccountNumber,
                                                      String beneficiaryName, String beneficiaryBankCode,
                                                      String beneficiaryBankName, BigDecimal amount,
                                                      String sourceCurrency, String targetCurrency,
                                                      String purposeCode, String remittanceInfo,
                                                      String chargeType) {
        Account debitAccount = accountRepository.findById(debitAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", debitAccountId));

        Long seq = paymentRepository.getNextInstructionSequence();
        String ref = String.format("SWF%015d", seq);
        String uetr = UUID.randomUUID().toString();

        PaymentInstruction payment = PaymentInstruction.builder()
                .instructionRef(ref).paymentType(PaymentType.INTERNATIONAL_WIRE)
                .debitAccount(debitAccount).debitAccountNumber(debitAccount.getAccountNumber())
                .creditAccountNumber(creditAccountNumber)
                .beneficiaryName(beneficiaryName)
                .beneficiaryBankCode(beneficiaryBankCode).beneficiaryBankName(beneficiaryBankName)
                .amount(amount).currencyCode(sourceCurrency)
                .paymentRail("SWIFT").clearingSystem("SWIFT_FIN")
                .swiftMessageType("MT103").swiftUetr(uetr)
                .purposeCode(purposeCode).remittanceInfo(remittanceInfo)
                .chargeType(chargeType != null ? chargeType : "SHA")
                .screeningStatus("PENDING")
                .status(PaymentStatus.SCREENING).build();

        // FX conversion if cross-currency
        if (!sourceCurrency.equals(targetCurrency)) {
            FxRate rate = getLatestRate(sourceCurrency, targetCurrency);
            BigDecimal converted = amount.multiply(rate.getSellRate()).setScale(2, RoundingMode.HALF_UP);
            payment.setFxRate(rate.getSellRate());
            payment.setFxSourceCurrency(sourceCurrency);
            payment.setFxTargetCurrency(targetCurrency);
            payment.setFxConvertedAmount(converted);
        }

        // Calculate charges
        BigDecimal charges = amount.multiply(new BigDecimal("0.0025"))
                .setScale(2, RoundingMode.HALF_UP).max(new BigDecimal("25.00"));
        payment.setChargeAmount(charges);

        // Debit total (amount + charges if OUR)
        BigDecimal totalDebit = "OUR".equals(chargeType) ? amount.add(charges) : amount;
        if (debitAccount.getAvailableBalance().compareTo(totalDebit) < 0) {
            throw new BusinessException("Insufficient balance including charges", "INSUFFICIENT_BALANCE");
        }
        accountPostingService.postDebit(
                debitAccount,
                TransactionType.DEBIT,
                totalDebit,
                remittanceInfo != null ? remittanceInfo : "SWIFT transfer " + ref,
                TransactionChannel.SYSTEM,
                ref + ":DR");

        // In production: submit to sanctions screening, then to SWIFT gateway
        payment.setScreeningStatus("CLEAR");
        payment.setStatus(PaymentStatus.SUBMITTED);

        PaymentInstruction saved = paymentRepository.save(payment);
        log.info("SWIFT transfer initiated: ref={}, uetr={}, amount={} {}, dest={}",
                ref, uetr, amount, sourceCurrency, beneficiaryBankCode);
        return saved;
    }

    // ========================================================================
    // BULK PAYMENTS (Cap 28)
    // ========================================================================

    @Transactional
    public PaymentBatch createBatch(Long debitAccountId, BatchType batchType, String narration,
                                      List<BatchPaymentItem> items) {
        Account debitAccount = accountRepository.findById(debitAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", debitAccountId));

        Long batchSeq = batchRepository.getNextBatchSequence();
        String batchRef = String.format("BAT%012d", batchSeq);

        BigDecimal totalAmount = items.stream().map(i -> i.amount).reduce(BigDecimal.ZERO, BigDecimal::add);

        if (debitAccount.getAvailableBalance().compareTo(totalAmount) < 0) {
            throw new BusinessException("Insufficient balance for batch total: " + totalAmount, "INSUFFICIENT_BALANCE");
        }

        PaymentBatch batch = PaymentBatch.builder()
                .batchRef(batchRef).batchType(batchType)
                .debitAccount(debitAccount)
                .totalRecords(items.size()).totalAmount(totalAmount)
                .currencyCode(debitAccount.getCurrencyCode())
                .narration(narration).status("PENDING").build();
        batchRepository.save(batch);

        // Create individual payment instructions
        int seq = 1;
        for (BatchPaymentItem item : items) {
            Long instrSeq = paymentRepository.getNextInstructionSequence();
            String instrRef = String.format("PAY%015d", instrSeq);

            PaymentInstruction pi = PaymentInstruction.builder()
                    .instructionRef(instrRef).paymentType(PaymentType.DOMESTIC_BATCH)
                    .debitAccount(debitAccount).debitAccountNumber(debitAccount.getAccountNumber())
                    .creditAccountNumber(item.creditAccountNumber)
                    .beneficiaryName(item.beneficiaryName)
                    .beneficiaryBankCode(item.beneficiaryBankCode)
                    .amount(item.amount).currencyCode(debitAccount.getCurrencyCode())
                    .paymentRail("BATCH").batchId(batchRef).batchSequence(seq++)
                    .remittanceInfo(item.narration)
                    .status(PaymentStatus.PENDING).build();
            paymentRepository.save(pi);
        }

        log.info("Batch created: ref={}, type={}, records={}, total={}",
                batchRef, batchType, items.size(), totalAmount);
        return batch;
    }

    @Transactional
    public PaymentBatch processBatch(String batchRef) {
        PaymentBatch batch = batchRepository.findByBatchRef(batchRef)
                .orElseThrow(() -> new ResourceNotFoundException("PaymentBatch", "batchRef", batchRef));

        String approvedBy = currentActorProvider.getCurrentActor();
        batch.setApprovedBy(approvedBy);
        batch.setApprovedAt(Instant.now());
        batch.setStatus("PROCESSING");
        batchRepository.save(batch);

        List<PaymentInstruction> items = paymentRepository.findByBatchIdOrderByBatchSequenceAsc(batchRef);
        Account debitAccount = batch.getDebitAccount();
        int success = 0; int failed = 0;
        BigDecimal successAmt = BigDecimal.ZERO; BigDecimal failedAmt = BigDecimal.ZERO;

        for (PaymentInstruction pi : items) {
            try {
                if (debitAccount.getAvailableBalance().compareTo(pi.getAmount()) < 0) {
                    pi.setStatus(PaymentStatus.FAILED);
                    pi.setFailureReason("Insufficient balance");
                    failed++;
                    failedAmt = failedAmt.add(pi.getAmount());
                } else {
                    Account localCredit = accountRepository.findByAccountNumber(pi.getCreditAccountNumber()).orElse(null);
                    if (localCredit != null) {
                        accountPostingService.postTransfer(
                                debitAccount,
                                localCredit,
                                pi.getAmount(),
                                pi.getAmount(),
                                pi.getRemittanceInfo() != null ? pi.getRemittanceInfo() : "Batch payment to " + pi.getCreditAccountNumber(),
                                "Batch payment from " + debitAccount.getAccountNumber(),
                                TransactionChannel.SYSTEM,
                                pi.getInstructionRef());
                        pi.setCreditAccount(localCredit);
                        pi.setStatus(PaymentStatus.COMPLETED);
                    } else {
                        accountPostingService.postDebit(
                                debitAccount,
                                TransactionType.TRANSFER_OUT,
                                pi.getAmount(),
                                pi.getRemittanceInfo() != null ? pi.getRemittanceInfo() : "Batch payment to " + pi.getCreditAccountNumber(),
                                TransactionChannel.SYSTEM,
                                pi.getInstructionRef() + ":DR");
                        pi.setStatus(PaymentStatus.SUBMITTED);
                    }
                    pi.setExecutionDate(LocalDate.now());
                    success++;
                    successAmt = successAmt.add(pi.getAmount());
                }
                paymentRepository.save(pi);
            } catch (Exception e) {
                pi.setStatus(PaymentStatus.FAILED);
                pi.setFailureReason(e.getMessage());
                paymentRepository.save(pi);
                failed++;
                failedAmt = failedAmt.add(pi.getAmount());
            }
        }

        batch.setSuccessfulCount(success);
        batch.setFailedCount(failed);
        batch.setSuccessfulAmount(successAmt);
        batch.setFailedAmount(failedAmt);
        batch.setStatus(failed == 0 ? "COMPLETED" : (success == 0 ? "FAILED" : "PARTIAL"));
        batchRepository.save(batch);

        log.info("Batch processed: ref={}, success={}, failed={}", batchRef, success, failed);
        return batch;
    }

    // ========================================================================
    // QUERIES
    // ========================================================================

    public PaymentInstruction getPayment(Long id) {
        return paymentRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("PaymentInstruction", "id", id));
    }

    public Page<PaymentInstruction> getAccountPayments(Long accountId, Pageable pageable) {
        return paymentRepository.findByDebitAccountId(accountId, pageable);
    }

    public FxRate getLatestRate(String source, String target) {
        return fxRateRepository.findLatestRate(source, target).stream().findFirst()
                .orElseThrow(() -> new BusinessException("No FX rate found for " + source + "/" + target, "NO_FX_RATE"));
    }

    public record BatchPaymentItem(String creditAccountNumber, String beneficiaryName,
                                     String beneficiaryBankCode, BigDecimal amount, String narration) {}
}
