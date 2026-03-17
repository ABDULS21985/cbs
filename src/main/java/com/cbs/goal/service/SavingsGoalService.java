package com.cbs.goal.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.goal.dto.*;
import com.cbs.goal.entity.*;
import com.cbs.goal.repository.SavingsGoalRepository;
import com.cbs.goal.repository.SavingsGoalTransactionRepository;
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
public class SavingsGoalService {

    private final SavingsGoalRepository goalRepository;
    private final SavingsGoalTransactionRepository goalTxnRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;
    private final CbsProperties cbsProperties;

    @Transactional
    public GoalResponse createGoal(Long customerId, CreateGoalRequest request) {
        Account account = accountRepository.findById(request.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getAccountId()));

        if (!account.getCustomer().getId().equals(customerId)) {
            throw new BusinessException("Account does not belong to customer", "ACCOUNT_MISMATCH");
        }

        Long seq = goalRepository.getNextGoalSequence();
        String goalNumber = String.format("GL%012d", seq);

        String currency = request.getCurrencyCode() != null ?
                request.getCurrencyCode() : account.getCurrencyCode();

        SavingsGoal goal = SavingsGoal.builder()
                .goalNumber(goalNumber)
                .account(account)
                .customer(account.getCustomer())
                .goalName(request.getGoalName())
                .goalDescription(request.getGoalDescription())
                .goalIcon(request.getGoalIcon())
                .targetAmount(request.getTargetAmount())
                .targetDate(request.getTargetDate())
                .autoDebitEnabled(request.getAutoDebitEnabled() != null ? request.getAutoDebitEnabled() : false)
                .autoDebitAmount(request.getAutoDebitAmount())
                .autoDebitFrequency(request.getAutoDebitFrequency())
                .interestBearing(request.getInterestBearing() != null ? request.getInterestBearing() : false)
                .interestRate(request.getInterestRate() != null ? request.getInterestRate() : BigDecimal.ZERO)
                .isLocked(request.getIsLocked() != null ? request.getIsLocked() : false)
                .allowWithdrawalBeforeTarget(request.getAllowWithdrawalBeforeTarget() != null ?
                        request.getAllowWithdrawalBeforeTarget() : true)
                .currencyCode(currency)
                .metadata(request.getMetadata() != null ? request.getMetadata() : new java.util.HashMap<>())
                .status(GoalStatus.ACTIVE)
                .build();

        if (Boolean.TRUE.equals(request.getAutoDebitEnabled()) && request.getAutoDebitAccountId() != null) {
            Account debitAccount = accountRepository.findById(request.getAutoDebitAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getAutoDebitAccountId()));
            goal.setAutoDebitAccount(debitAccount);
            goal.setNextAutoDebitDate(calculateNextAutoDebitDate(LocalDate.now(), request.getAutoDebitFrequency()));
        }

        SavingsGoal saved = goalRepository.save(goal);
        log.info("Savings goal created: number={}, target={}, name={}", goalNumber, request.getTargetAmount(), request.getGoalName());
        return toResponse(saved);
    }

    public GoalResponse getGoal(Long goalId) {
        SavingsGoal goal = goalRepository.findByIdWithDetails(goalId)
                .orElseThrow(() -> new ResourceNotFoundException("SavingsGoal", "id", goalId));
        return toResponse(goal);
    }

    public Page<GoalResponse> getCustomerGoals(Long customerId, Pageable pageable) {
        return goalRepository.findByCustomerId(customerId, pageable).map(this::toResponse);
    }

    @Transactional
    public GoalResponse fundGoal(Long goalId, GoalFundRequest request) {
        SavingsGoal goal = goalRepository.findByIdWithDetails(goalId)
                .orElseThrow(() -> new ResourceNotFoundException("SavingsGoal", "id", goalId));

        if (goal.getStatus() != GoalStatus.ACTIVE) {
            throw new BusinessException("Goal is not active", "GOAL_NOT_ACTIVE");
        }

        Account sourceAccount = null;
        if (request.getSourceAccountId() != null) {
            sourceAccount = accountRepository.findById(request.getSourceAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getSourceAccountId()));
            if (sourceAccount.getAvailableBalance().compareTo(request.getAmount()) < 0) {
                throw new BusinessException("Insufficient balance in source account", "INSUFFICIENT_BALANCE");
            }
            accountPostingService.postDebit(
                    sourceAccount,
                    TransactionType.TRANSFER_OUT,
                    request.getAmount(),
                    request.getNarration() != null ? request.getNarration() : "Goal funding: " + goal.getGoalName(),
                    TransactionChannel.SYSTEM,
                    "GOAL:" + goal.getGoalNumber() + ":FUND");
        }

        goal.deposit(request.getAmount());

        SavingsGoalTransaction txn = SavingsGoalTransaction.builder()
                .savingsGoal(goal)
                .transactionType(GoalTransactionType.DEPOSIT)
                .amount(request.getAmount())
                .runningBalance(goal.getCurrentAmount())
                .narration(request.getNarration() != null ? request.getNarration() : "Deposit to goal: " + goal.getGoalName())
                .sourceAccount(sourceAccount)
                .build();
        goalTxnRepository.save(txn);
        goalRepository.save(goal);

        log.info("Goal {} funded: amount={}, progress={}%", goal.getGoalNumber(), request.getAmount(), goal.getProgressPercentage());
        return toResponse(goal);
    }

    @Transactional
    public GoalResponse withdrawFromGoal(Long goalId, GoalFundRequest request) {
        SavingsGoal goal = goalRepository.findByIdWithDetails(goalId)
                .orElseThrow(() -> new ResourceNotFoundException("SavingsGoal", "id", goalId));

        if (goal.getStatus() != GoalStatus.ACTIVE && goal.getStatus() != GoalStatus.COMPLETED) {
            throw new BusinessException("Goal is not active", "GOAL_NOT_ACTIVE");
        }
        if (Boolean.TRUE.equals(goal.getIsLocked())) {
            throw new BusinessException("Goal is locked, withdrawals are not permitted", "GOAL_LOCKED");
        }
        if (!Boolean.TRUE.equals(goal.getAllowWithdrawalBeforeTarget()) && !goal.isCompleted()) {
            throw new BusinessException("Withdrawals not allowed before target is reached", "WITHDRAWAL_BEFORE_TARGET");
        }
        if (request.getAmount().compareTo(goal.getCurrentAmount()) > 0) {
            throw new BusinessException("Withdrawal amount exceeds goal balance", "EXCEEDS_GOAL_BALANCE");
        }

        goal.withdraw(request.getAmount());

        Account destinationAccount = request.getSourceAccountId() != null ?
                accountRepository.findById(request.getSourceAccountId())
                        .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getSourceAccountId()))
                : goal.getAccount();

        accountPostingService.postCredit(
                destinationAccount,
                TransactionType.TRANSFER_IN,
                request.getAmount(),
                request.getNarration() != null ? request.getNarration() : "Goal withdrawal: " + goal.getGoalName(),
                TransactionChannel.SYSTEM,
                "GOAL:" + goal.getGoalNumber() + ":WITHDRAW");

        SavingsGoalTransaction txn = SavingsGoalTransaction.builder()
                .savingsGoal(goal)
                .transactionType(GoalTransactionType.WITHDRAWAL)
                .amount(request.getAmount())
                .runningBalance(goal.getCurrentAmount())
                .narration(request.getNarration() != null ? request.getNarration() : "Withdrawal from goal: " + goal.getGoalName())
                .sourceAccount(destinationAccount)
                .build();
        goalTxnRepository.save(txn);
        goalRepository.save(goal);

        log.info("Goal {} withdrawal: amount={}, remaining={}", goal.getGoalNumber(), request.getAmount(), goal.getCurrentAmount());
        return toResponse(goal);
    }

    @Transactional
    public GoalResponse cancelGoal(Long goalId) {
        SavingsGoal goal = goalRepository.findByIdWithDetails(goalId)
                .orElseThrow(() -> new ResourceNotFoundException("SavingsGoal", "id", goalId));

        if (goal.getCurrentAmount().compareTo(BigDecimal.ZERO) > 0) {
            Account account = goal.getAccount();
            accountPostingService.postCredit(
                    account,
                    TransactionType.TRANSFER_IN,
                    goal.getCurrentAmount(),
                    "Goal cancellation refund: " + goal.getGoalName(),
                    TransactionChannel.SYSTEM,
                    "GOAL:" + goal.getGoalNumber() + ":CANCEL");
            goal.setCurrentAmount(BigDecimal.ZERO);
        }

        goal.setStatus(GoalStatus.CANCELLED);
        goalRepository.save(goal);
        log.info("Goal {} cancelled", goal.getGoalNumber());
        return toResponse(goal);
    }

    @Transactional
    public int processAutoDebits() {
        List<SavingsGoal> dueGoals = goalRepository.findDueForAutoDebit(LocalDate.now());
        int processed = 0;
        for (SavingsGoal goal : dueGoals) {
            try {
                Account debitAccount = goal.getAutoDebitAccount() != null ? goal.getAutoDebitAccount() : goal.getAccount();
                BigDecimal amount = goal.getAutoDebitAmount();
                if (debitAccount.getAvailableBalance().compareTo(amount) >= 0) {
                    accountPostingService.postDebit(
                            debitAccount,
                            TransactionType.TRANSFER_OUT,
                            amount,
                            "Auto-debit for goal: " + goal.getGoalName(),
                            TransactionChannel.SYSTEM,
                            "GOAL:" + goal.getGoalNumber() + ":AUTO:" + goal.getNextAutoDebitDate());
                    goal.deposit(amount);

                    SavingsGoalTransaction txn = SavingsGoalTransaction.builder()
                            .savingsGoal(goal).transactionType(GoalTransactionType.DEPOSIT)
                            .amount(amount).runningBalance(goal.getCurrentAmount())
                            .narration("Auto-debit for goal: " + goal.getGoalName())
                            .sourceAccount(debitAccount).build();
                    goalTxnRepository.save(txn);
                }
                goal.setNextAutoDebitDate(calculateNextAutoDebitDate(goal.getNextAutoDebitDate(), goal.getAutoDebitFrequency()));
                goalRepository.save(goal);
                processed++;
            } catch (Exception e) {
                log.error("Goal auto-debit failed for {}: {}", goal.getGoalNumber(), e.getMessage());
            }
        }
        log.info("Goal auto-debit processing: {} goals processed", processed);
        return processed;
    }

    private LocalDate calculateNextAutoDebitDate(LocalDate from, String frequency) {
        if (frequency == null) return from.plusMonths(1);
        return switch (frequency.toUpperCase()) {
            case "DAILY" -> from.plusDays(1);
            case "WEEKLY" -> from.plusWeeks(1);
            case "BI_WEEKLY" -> from.plusWeeks(2);
            case "MONTHLY" -> from.plusMonths(1);
            default -> from.plusMonths(1);
        };
    }

    private GoalResponse toResponse(SavingsGoal g) {
        return GoalResponse.builder()
                .id(g.getId()).goalNumber(g.getGoalNumber())
                .accountId(g.getAccount().getId()).accountNumber(g.getAccount().getAccountNumber())
                .customerId(g.getCustomer().getId()).customerDisplayName(g.getCustomer().getDisplayName())
                .goalName(g.getGoalName()).goalDescription(g.getGoalDescription()).goalIcon(g.getGoalIcon())
                .targetAmount(g.getTargetAmount()).targetDate(g.getTargetDate())
                .currentAmount(g.getCurrentAmount()).progressPercentage(g.getProgressPercentage())
                .autoDebitEnabled(g.getAutoDebitEnabled()).autoDebitAmount(g.getAutoDebitAmount())
                .autoDebitFrequency(g.getAutoDebitFrequency()).nextAutoDebitDate(g.getNextAutoDebitDate())
                .interestBearing(g.getInterestBearing()).interestRate(g.getInterestRate())
                .accruedInterest(g.getAccruedInterest())
                .status(g.getStatus()).completedDate(g.getCompletedDate())
                .isLocked(g.getIsLocked()).allowWithdrawalBeforeTarget(g.getAllowWithdrawalBeforeTarget())
                .currencyCode(g.getCurrencyCode()).metadata(g.getMetadata()).createdAt(g.getCreatedAt())
                .build();
    }
}
