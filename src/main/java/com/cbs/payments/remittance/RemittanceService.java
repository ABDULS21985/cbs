package com.cbs.payments.remittance;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.payments.entity.FxRate;
import com.cbs.payments.orchestration.PaymentOrchestrationService;
import com.cbs.payments.repository.FxRateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class RemittanceService {

    private final RemittanceCorridorRepository corridorRepository;
    private final RemittanceBeneficiaryRepository beneficiaryRepository;
    private final RemittanceTransactionRepository txnRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;
    private final FxRateRepository fxRateRepository;
    private final PaymentOrchestrationService orchestrationService;

    // ========================================================================
    // CORRIDOR MANAGEMENT
    // ========================================================================

    @Transactional
    public RemittanceCorridor createCorridor(RemittanceCorridor corridor) {
        corridorRepository.findBySourceCountryAndDestinationCountryAndIsActiveTrue(
                corridor.getSourceCountry(), corridor.getDestinationCountry())
                .ifPresent(existing -> { throw new BusinessException("Corridor already exists", "DUPLICATE_CORRIDOR"); });
        RemittanceCorridor saved = corridorRepository.save(corridor);
        log.info("Remittance corridor created: {} → {}", corridor.getSourceCountry(), corridor.getDestinationCountry());
        return saved;
    }

    public List<RemittanceCorridor> getAllCorridors() {
        return corridorRepository.findByIsActiveTrueOrderBySourceCountryAscDestinationCountryAsc();
    }

    // ========================================================================
    // BENEFICIARY MANAGEMENT
    // ========================================================================

    @Transactional
    public RemittanceBeneficiary addBeneficiary(RemittanceBeneficiary beneficiary) {
        return beneficiaryRepository.save(beneficiary);
    }

    public List<RemittanceBeneficiary> getCustomerBeneficiaries(Long customerId) {
        return beneficiaryRepository.findByCustomerIdAndIsActiveTrueOrderByBeneficiaryNameAsc(customerId);
    }

    // ========================================================================
    // REMITTANCE QUOTE
    // ========================================================================

    public RemittanceQuote getQuote(String sourceCountry, String destinationCountry, BigDecimal sourceAmount) {
        RemittanceCorridor corridor = corridorRepository
                .findBySourceCountryAndDestinationCountryAndIsActiveTrue(sourceCountry, destinationCountry)
                .orElseThrow(() -> new BusinessException("No active corridor: " + sourceCountry + " → " + destinationCountry, "NO_CORRIDOR"));

        // Validate amount
        if (corridor.getMinAmount() != null && sourceAmount.compareTo(corridor.getMinAmount()) < 0) {
            throw new BusinessException("Amount below corridor minimum: " + corridor.getMinAmount(), "BELOW_MIN");
        }
        if (corridor.getMaxAmount() != null && sourceAmount.compareTo(corridor.getMaxAmount()) > 0) {
            throw new BusinessException("Amount exceeds corridor maximum: " + corridor.getMaxAmount(), "EXCEEDS_MAX");
        }

        // Fees
        BigDecimal totalFee = corridor.calculateFee(sourceAmount);

        // FX rate with markup
        FxRate fxRate = fxRateRepository.findLatestRate(corridor.getSourceCurrency(), corridor.getDestinationCurrency())
                .stream().findFirst()
                .orElseThrow(() -> new BusinessException("No FX rate for " + corridor.getSourceCurrency() + "/" + corridor.getDestinationCurrency(), "NO_FX_RATE"));

        BigDecimal markupMultiplier = BigDecimal.ONE.subtract(corridor.getFxMarkupPct().divide(BigDecimal.valueOf(100), 8, RoundingMode.HALF_UP));
        BigDecimal effectiveRate = fxRate.getSellRate().multiply(markupMultiplier).setScale(8, RoundingMode.HALF_UP);
        BigDecimal fxMarkup = sourceAmount.multiply(corridor.getFxMarkupPct()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        BigDecimal destinationAmount = sourceAmount.multiply(effectiveRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalDebit = sourceAmount.add(totalFee);

        return new RemittanceQuote(corridor.getCorridorCode(), corridor.getSourceCurrency(), corridor.getDestinationCurrency(),
                sourceAmount, destinationAmount, effectiveRate, fxMarkup, totalFee, totalDebit, corridor.getSettlementDays());
    }

    // ========================================================================
    // SEND REMITTANCE
    // ========================================================================

    @Transactional
    public RemittanceTransaction sendRemittance(Long senderCustomerId, Long senderAccountId,
                                                   Long beneficiaryId, String sourceCountry,
                                                   String destinationCountry, BigDecimal sourceAmount,
                                                   String purposeCode, String purposeDescription,
                                                   String sourceOfFunds) {
        RemittanceBeneficiary beneficiary = beneficiaryRepository.findById(beneficiaryId)
                .orElseThrow(() -> new ResourceNotFoundException("RemittanceBeneficiary", "id", beneficiaryId));

        RemittanceCorridor corridor = corridorRepository
                .findBySourceCountryAndDestinationCountryAndIsActiveTrue(sourceCountry, destinationCountry)
                .orElseThrow(() -> new BusinessException("No active corridor", "NO_CORRIDOR"));

        // Compliance checks
        if (Boolean.TRUE.equals(corridor.getRequiresPurposeCode()) && (purposeCode == null || purposeCode.isEmpty())) {
            throw new BusinessException("Purpose code required for this corridor", "PURPOSE_CODE_REQUIRED");
        }
        if (Boolean.TRUE.equals(corridor.getRequiresSourceOfFunds()) && (sourceOfFunds == null || sourceOfFunds.isEmpty())) {
            throw new BusinessException("Source of funds required for this corridor", "SOURCE_OF_FUNDS_REQUIRED");
        }
        if (corridor.getBlockedPurposeCodes() != null && corridor.getBlockedPurposeCodes().contains(purposeCode)) {
            throw new BusinessException("Purpose code is blocked for this corridor: " + purposeCode, "PURPOSE_CODE_BLOCKED");
        }

        // Quote
        RemittanceQuote quote = getQuote(sourceCountry, destinationCountry, sourceAmount);

        // Debit sender
        Account senderAccount = accountRepository.findById(senderAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", senderAccountId));
        if (senderAccount.getAvailableBalance().compareTo(quote.totalDebit()) < 0) {
            throw new BusinessException("Insufficient balance for remittance", "INSUFFICIENT_BALANCE");
        }
        Long seq = txnRepository.getNextRemittanceSequence();
        String ref = String.format("RMT%012d", seq);
        accountPostingService.postDebit(
                senderAccount,
                TransactionType.DEBIT,
                quote.totalDebit(),
                "Remittance " + ref,
                TransactionChannel.SYSTEM,
                ref + ":DR");

        // Route through orchestration

        var routingDecision = orchestrationService.routePayment(ref, sourceCountry, destinationCountry,
                corridor.getSourceCurrency(), sourceAmount, "REMITTANCE");

        RemittanceTransaction txn = RemittanceTransaction.builder()
                .remittanceRef(ref).senderCustomerId(senderCustomerId).senderAccountId(senderAccountId)
                .beneficiaryId(beneficiaryId).corridorId(corridor.getId())
                .sourceAmount(sourceAmount).sourceCurrency(corridor.getSourceCurrency())
                .destinationAmount(quote.destinationAmount()).destinationCurrency(corridor.getDestinationCurrency())
                .fxRate(quote.effectiveRate()).fxMarkup(quote.fxMarkup())
                .flatFee(corridor.getFlatFee())
                .percentageFee(quote.totalFee().subtract(corridor.getFlatFee()))
                .totalFee(quote.totalFee()).totalDebitAmount(quote.totalDebit())
                .purposeCode(purposeCode).purposeDescription(purposeDescription)
                .sourceOfFunds(sourceOfFunds)
                .paymentRailCode(routingDecision.railCode())
                .status("COMPLIANCE_CHECK").build();

        // In production: trigger async sanctions screening here
        txn.setSanctionsCheckStatus("PASSED"); // Simplified
        txn.setStatus("PROCESSING");

        RemittanceTransaction saved = txnRepository.save(txn);
        log.info("Remittance sent: ref={}, {} {} → {} {}, fee={}, rail={}",
                ref, sourceAmount, corridor.getSourceCurrency(),
                quote.destinationAmount(), corridor.getDestinationCurrency(),
                quote.totalFee(), routingDecision.railCode());
        return saved;
    }

    @Transactional
    public RemittanceTransaction updateStatus(String remittanceRef, String newStatus, String message) {
        RemittanceTransaction txn = txnRepository.findByRemittanceRef(remittanceRef)
                .orElseThrow(() -> new ResourceNotFoundException("RemittanceTransaction", "ref", remittanceRef));
        txn.setStatus(newStatus);
        txn.setStatusMessage(message);
        txn.setUpdatedAt(Instant.now());
        if ("SENT".equals(newStatus)) txn.setSentAt(Instant.now());
        if ("DELIVERED".equals(newStatus)) txn.setDeliveredAt(Instant.now());
        if ("COMPLETED".equals(newStatus)) txn.setCompletedAt(Instant.now());
        return txnRepository.save(txn);
    }

    public Page<RemittanceTransaction> getCustomerRemittances(Long customerId, Pageable pageable) {
        return txnRepository.findBySenderCustomerIdOrderByCreatedAtDesc(customerId, pageable);
    }

    public record RemittanceQuote(String corridorCode, String sourceCurrency, String destinationCurrency,
                                    BigDecimal sourceAmount, BigDecimal destinationAmount,
                                    BigDecimal effectiveRate, BigDecimal fxMarkup,
                                    BigDecimal totalFee, BigDecimal totalDebit, int settlementDays) {}
}
