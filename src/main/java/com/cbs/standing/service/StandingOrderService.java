package com.cbs.standing.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.entity.PaymentStatus;
import com.cbs.payments.entity.PaymentType;
import com.cbs.payments.repository.PaymentInstructionRepository;
import com.cbs.standing.entity.*;
import com.cbs.standing.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class StandingOrderService {

    private final StandingInstructionRepository instructionRepository;
    private final StandingExecutionLogRepository executionLogRepository;
    private final PaymentInstructionRepository paymentRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;

    @Transactional
    public StandingInstruction create(Long debitAccountId, InstructionType type,
                                        String creditAccountNumber, String creditAccountName,
                                        String creditBankCode, BigDecimal amount, String currencyCode,
                                        String frequency, LocalDate startDate, LocalDate endDate,
                                        Integer maxExecutions, String mandateRef, String narration) {
        Account debitAccount = accountRepository.findById(debitAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", debitAccountId));

        Long seq = instructionRepository.getNextInstructionSequence();
        String ref = String.format("SI%013d", seq);

        StandingInstruction instruction = StandingInstruction.builder()
                .instructionRef(ref).instructionType(type)
                .debitAccount(debitAccount)
                .creditAccountNumber(creditAccountNumber)
                .creditAccountName(creditAccountName).creditBankCode(creditBankCode)
                .amount(amount).currencyCode(currencyCode != null ? currencyCode : debitAccount.getCurrencyCode())
                .frequency(frequency).startDate(startDate)
                .endDate(endDate).nextExecutionDate(startDate)
                .maxExecutions(maxExecutions)
                .mandateRef(mandateRef).narration(narration)
                .status(StandingStatus.ACTIVE).build();

        StandingInstruction saved = instructionRepository.save(instruction);
        log.info("Standing instruction created: ref={}, type={}, amount={}, freq={}",
                ref, type, amount, frequency);
        return saved;
    }

    public StandingInstruction getInstruction(Long id) {
        return instructionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("StandingInstruction", "id", id));
    }

    public Page<StandingInstruction> getAccountInstructions(Long accountId, Pageable pageable) {
        return instructionRepository.findByDebitAccountId(accountId, pageable);
    }

    @Transactional
    public StandingInstruction pause(Long id) {
        StandingInstruction si = getInstruction(id);
        si.setStatus(StandingStatus.PAUSED);
        return instructionRepository.save(si);
    }

    @Transactional
    public StandingInstruction resume(Long id) {
        StandingInstruction si = getInstruction(id);
        si.setStatus(StandingStatus.ACTIVE);
        si.setRetryCount(0);
        return instructionRepository.save(si);
    }

    @Transactional
    public StandingInstruction cancel(Long id) {
        StandingInstruction si = getInstruction(id);
        si.setStatus(StandingStatus.CANCELLED);
        return instructionRepository.save(si);
    }

    @Transactional
    public int executeDueInstructions() {
        List<StandingInstruction> due = instructionRepository.findDueForExecution(LocalDate.now());
        int processed = 0;

        for (StandingInstruction si : due) {
            try {
                executeInstruction(si);
                processed++;
            } catch (Exception e) {
                log.error("Standing instruction execution failed for {}: {}", si.getInstructionRef(), e.getMessage());
            }
        }

        log.info("Standing instructions processed: {} of {} due", processed, due.size());
        return processed;
    }

    private void executeInstruction(StandingInstruction si) {
        if (si.isCompleted()) {
            si.setStatus(StandingStatus.COMPLETED);
            instructionRepository.save(si);
            return;
        }

        Account debitAccount = si.getDebitAccount();
        boolean success = false;
        String failureReason = null;

        if (debitAccount.getAvailableBalance().compareTo(si.getAmount()) >= 0) {
            // Create payment instruction
            Long seq = paymentRepository.getNextInstructionSequence();
            String ref = String.format("PAY%015d", seq);

            PaymentInstruction payment = PaymentInstruction.builder()
                    .instructionRef(ref)
                    .paymentType(si.getInstructionType() == InstructionType.STANDING_ORDER ?
                            PaymentType.STANDING_ORDER : PaymentType.DIRECT_DEBIT)
                    .debitAccount(debitAccount).debitAccountNumber(debitAccount.getAccountNumber())
                    .creditAccountNumber(si.getCreditAccountNumber())
                    .beneficiaryName(si.getCreditAccountName())
                    .beneficiaryBankCode(si.getCreditBankCode())
                    .amount(si.getAmount()).currencyCode(si.getCurrencyCode())
                    .paymentRail("STANDING").remittanceInfo(si.getNarration())
                    .status(PaymentStatus.PROCESSING).build();

            // Check local credit
            Account localCredit = accountRepository.findByAccountNumber(si.getCreditAccountNumber()).orElse(null);
            if (localCredit != null) {
                accountPostingService.postTransfer(
                        debitAccount,
                        localCredit,
                        si.getAmount(),
                        si.getAmount(),
                        si.getNarration() != null ? si.getNarration() : "Standing order to " + si.getCreditAccountNumber(),
                        "Standing order from " + debitAccount.getAccountNumber(),
                        TransactionChannel.SYSTEM,
                        ref);
                payment.setCreditAccount(localCredit);
                payment.setStatus(PaymentStatus.COMPLETED);
            } else {
                accountPostingService.postDebit(
                        debitAccount,
                        TransactionType.TRANSFER_OUT,
                        si.getAmount(),
                        si.getNarration() != null ? si.getNarration() : "Standing order to " + si.getCreditAccountNumber(),
                        TransactionChannel.SYSTEM,
                        ref + ":DR");
                payment.setStatus(PaymentStatus.SUBMITTED);
            }
            payment.setExecutionDate(LocalDate.now());
            paymentRepository.save(payment);

            // Log execution
            StandingExecutionLog execLog = StandingExecutionLog.builder()
                    .instruction(si).executionDate(LocalDate.now())
                    .amount(si.getAmount()).status("SUCCESS")
                    .paymentInstruction(payment).build();
            executionLogRepository.save(execLog);

            si.setTotalExecutions(si.getTotalExecutions() + 1);
            si.setSuccessfulExecutions(si.getSuccessfulExecutions() + 1);
            si.setLastExecutionDate(LocalDate.now());
            si.setRetryCount(0);
            success = true;
        } else {
            failureReason = "Insufficient balance";
            si.setRetryCount(si.getRetryCount() + 1);

            if (si.getRetryCount() >= si.getMaxRetries()) {
                StandingExecutionLog execLog = StandingExecutionLog.builder()
                        .instruction(si).executionDate(LocalDate.now())
                        .amount(si.getAmount()).status("FAILED")
                        .failureReason(failureReason).build();
                executionLogRepository.save(execLog);

                si.setTotalExecutions(si.getTotalExecutions() + 1);
                si.setFailedExecutions(si.getFailedExecutions() + 1);
                si.setRetryCount(0);
            } else {
                StandingExecutionLog execLog = StandingExecutionLog.builder()
                        .instruction(si).executionDate(LocalDate.now())
                        .amount(si.getAmount()).status("RETRY_PENDING")
                        .failureReason(failureReason).build();
                executionLogRepository.save(execLog);
                instructionRepository.save(si);
                return; // Don't advance date on retry
            }
        }

        // Advance to next execution date
        si.setNextExecutionDate(si.calculateNextDate());
        if (si.isCompleted()) {
            si.setStatus(StandingStatus.COMPLETED);
        }
        instructionRepository.save(si);

        log.info("Standing instruction {}: success={}, next={}",
                si.getInstructionRef(), success, si.getNextExecutionDate());
    }

    public Page<StandingExecutionLog> getExecutionHistory(Long instructionId, Pageable pageable) {
        return executionLogRepository.findByInstructionIdOrderByExecutionDateDesc(instructionId, pageable);
    }
}
