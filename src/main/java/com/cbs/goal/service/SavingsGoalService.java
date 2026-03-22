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
import org.springframework.util.StringUtils;

import org.springframework.data.domain.PageImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    /**
     * Paginated list of all goals with optional status / free-text search filtering.
     *
     * Uses a two-query pattern to avoid the Hibernate HHH90003004 warning:
     *   1. Fetch a page of IDs only (SQL-level LIMIT/OFFSET, no JOIN FETCH).
     *   2. Batch-load those exact entities with JOIN FETCH account + customer.
     * The result is re-ordered to match the original ID page ordering.
     */
    public Page<GoalResponse> getGoals(GoalStatus status, String search, Pageable pageable) {
        boolean hasStatus = status != null;
        boolean hasSearch = StringUtils.hasText(search);

        Page<Long> idPage;
        if (hasStatus && hasSearch) {
            idPage = goalRepository.searchIdsByStatus(status, search, pageable);
        } else if (hasStatus) {
            idPage = goalRepository.findIdsByStatus(status, pageable);
        } else if (hasSearch) {
            idPage = goalRepository.searchIds(search, pageable);
        } else {
            idPage = goalRepository.findAllIds(pageable);
        }
        return toGoalResponsePage(idPage, pageable);
    }

    public Page<GoalResponse> getCustomerGoals(Long customerId, Pageable pageable) {
        Page<Long> idPage = goalRepository.findIdsByCustomerId(customerId, pageable);
        return toGoalResponsePage(idPage, pageable);
    }

    /**
     * Paginated contribution (transaction) history for a single goal.
     *
     * Two-query pattern mirrors the approach used for goals:
     *   1. Fetch a page of transaction IDs at SQL level.
     *   2. Batch-load those transactions with sourceAccount eagerly fetched,
     *      eliminating any lazy-load risk in toTransactionResponse().
     */
    public Page<GoalTransactionResponse> getContributions(Long goalId, Pageable pageable) {
        if (!goalRepository.existsById(goalId)) {
            throw new ResourceNotFoundException("SavingsGoal", "id", goalId);
        }
        Page<Long> idPage = goalTxnRepository.findIdsByGoalId(goalId, pageable);
        if (idPage.isEmpty()) {
            return Page.empty(pageable);
        }
        List<SavingsGoalTransaction> txns = goalTxnRepository.findByIdsWithSourceAccount(idPage.getContent());
        Map<Long, SavingsGoalTransaction> byId = txns.stream()
                .collect(Collectors.toMap(SavingsGoalTransaction::getId, t -> t));
        List<GoalTransactionResponse> content = idPage.getContent().stream()
                .filter(byId::containsKey)
                .map(id -> toTransactionResponse(byId.get(id)))
                .toList();
        return new PageImpl<>(content, pageable, idPage.getTotalElements());
    }

    @Transactional
    public GoalResponse fundGoal(Long goalId, GoalFundRequest request) {
        SavingsGoal goal = goalRepository.findByIdWithDetails(goalId)
                .orElseThrow(() -> new ResourceNotFoundException("SavingsGoal", "id", goalId));

        if (goal.getStatus() != GoalStatus.ACTIVE) {
            throw new BusinessException("Goal is not active", "GOAL_NOT_ACTIVE");
        }

        if (request.getSourceAccountId() == null) {
            throw new BusinessException("Source account is required to fund a savings goal", "SOURCE_ACCOUNT_REQUIRED");
        }
        Account sourceAccount = accountRepository.findById(request.getSourceAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getSourceAccountId()));
        if (sourceAccount.getAvailableBalance().compareTo(request.getAmount()) < 0) {
            throw new BusinessException("Insufficient balance in source account", "INSUFFICIENT_BALANCE");
        }
        accountPostingService.postDebitAgainstGl(
                sourceAccount,
                TransactionType.TRANSFER_OUT,
                request.getAmount(),
                request.getNarration() != null ? request.getNarration() : "Deposit to goal: " + goal.getGoalName(),
                TransactionChannel.SYSTEM,
                goal.getGoalNumber() + ":FUND",
                resolveGoalControlGlCode(),
                "SAVINGS_GOAL",
                goal.getGoalNumber()
        );

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

        accountPostingService.postCreditAgainstGl(
                destinationAccount,
                TransactionType.TRANSFER_IN,
                request.getAmount(),
                request.getNarration() != null ? request.getNarration() : "Withdrawal from goal: " + goal.getGoalName(),
                TransactionChannel.SYSTEM,
                goal.getGoalNumber() + ":WITHDRAW",
                resolveGoalControlGlCode(),
                "SAVINGS_GOAL",
                goal.getGoalNumber()
        );

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
            accountPostingService.postCreditAgainstGl(
                    account,
                    TransactionType.TRANSFER_IN,
                    goal.getCurrentAmount(),
                    "Goal cancellation refund " + goal.getGoalName(),
                    TransactionChannel.SYSTEM,
                    goal.getGoalNumber() + ":CANCEL",
                    resolveGoalControlGlCode(),
                    "SAVINGS_GOAL",
                    goal.getGoalNumber()
            );
            goal.setCurrentAmount(BigDecimal.ZERO);
        }

        goal.setStatus(GoalStatus.CANCELLED);
        goalRepository.save(goal);
        log.info("Goal {} cancelled", goal.getGoalNumber());
        return toResponse(goal);
    }

    /**
     * Processes all savings goals whose auto-debit is due today.
     *
     * Returns a result map with three counters:
     * <ul>
     *   <li><b>processed</b> — debit posted + goal balance updated + next date advanced</li>
     *   <li><b>skipped</b>   — debit account had insufficient balance; next date NOT advanced
     *                          so the goal is retried on the next scheduled run</li>
     *   <li><b>failed</b>    — unexpected exception; goal left unchanged</li>
     * </ul>
     *
     * Previously the counter was incremented regardless of the balance check, and
     * nextAutoDebitDate was advanced even for insufficient-balance cases, silently
     * pushing the goal to the next cycle without any credit being posted.
     */
    @Transactional
    public Map<String, Integer> processAutoDebits() {
        List<SavingsGoal> dueGoals = goalRepository.findDueForAutoDebit(LocalDate.now());
        int processed = 0;
        int skipped   = 0;
        int failed    = 0;

        for (SavingsGoal goal : dueGoals) {
            try {
                Account debitAccount = goal.getAutoDebitAccount() != null
                        ? goal.getAutoDebitAccount() : goal.getAccount();
                BigDecimal amount = goal.getAutoDebitAmount();

                if (debitAccount.getAvailableBalance().compareTo(amount) < 0) {
                    // Insufficient balance — skip this cycle, do NOT advance the date
                    log.warn("Goal auto-debit skipped (insufficient balance) for {}: required={}, available={}",
                            goal.getGoalNumber(), amount, debitAccount.getAvailableBalance());
                    skipped++;
                    continue;
                }

                accountPostingService.postDebitAgainstGl(
                        debitAccount,
                        TransactionType.TRANSFER_OUT,
                        amount,
                        "Auto-debit for goal: " + goal.getGoalName(),
                        TransactionChannel.SYSTEM,
                        goal.getGoalNumber() + ":AUTO",
                        resolveGoalControlGlCode(),
                        "SAVINGS_GOAL",
                        goal.getGoalNumber()
                );
                goal.deposit(amount);

                SavingsGoalTransaction txn = SavingsGoalTransaction.builder()
                        .savingsGoal(goal).transactionType(GoalTransactionType.DEPOSIT)
                        .amount(amount).runningBalance(goal.getCurrentAmount())
                        .narration("Auto-debit for goal: " + goal.getGoalName())
                        .sourceAccount(debitAccount).build();
                goalTxnRepository.save(txn);

                // Only advance the next-debit date after a successful posting
                goal.setNextAutoDebitDate(
                        calculateNextAutoDebitDate(goal.getNextAutoDebitDate(), goal.getAutoDebitFrequency()));
                goalRepository.save(goal);
                processed++;

            } catch (Exception e) {
                log.error("Goal auto-debit failed for {}: {}", goal.getGoalNumber(), e.getMessage());
                failed++;
            }
        }

        log.info("Goal auto-debit batch: processed={}, skipped={}, failed={}", processed, skipped, failed);
        return Map.of("processed", processed, "skipped", skipped, "failed", failed);
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

    /**
     * Persists auto-debit configuration from a key-value map submitted by the frontend.
     * Expected keys: autoDebitEnabled (boolean), autoDebitAmount (number),
     * autoDebitFrequency (string), autoDebitAccountId (number).
     */
    @Transactional
    public GoalResponse configureAutoDebit(Long goalId, java.util.Map<String, Object> config) {
        SavingsGoal goal = goalRepository.findByIdWithDetails(goalId)
                .orElseThrow(() -> new ResourceNotFoundException("SavingsGoal", "id", goalId));

        if (config.containsKey("autoDebitEnabled")) {
            goal.setAutoDebitEnabled(Boolean.TRUE.equals(config.get("autoDebitEnabled")));
        }
        if (config.containsKey("autoDebitAmount") && config.get("autoDebitAmount") != null) {
            goal.setAutoDebitAmount(new BigDecimal(config.get("autoDebitAmount").toString()));
        }
        if (config.containsKey("autoDebitFrequency") && config.get("autoDebitFrequency") != null) {
            goal.setAutoDebitFrequency(config.get("autoDebitFrequency").toString());
        }
        if (config.containsKey("autoDebitAccountId") && config.get("autoDebitAccountId") != null) {
            Long debitAccountId = Long.valueOf(config.get("autoDebitAccountId").toString());
            Account debitAccount = accountRepository.findById(debitAccountId)
                    .orElseThrow(() -> new ResourceNotFoundException("Account", "id", debitAccountId));
            goal.setAutoDebitAccount(debitAccount);
        }

        // Recalculate next debit date when enabling or changing frequency
        if (Boolean.TRUE.equals(goal.getAutoDebitEnabled())) {
            if (goal.getNextAutoDebitDate() == null || goal.getNextAutoDebitDate().isBefore(LocalDate.now())) {
                goal.setNextAutoDebitDate(calculateNextAutoDebitDate(LocalDate.now(), goal.getAutoDebitFrequency()));
            }
        }

        SavingsGoal saved = goalRepository.save(goal);
        log.info("Auto-debit configured for goal {}: enabled={}, frequency={}", goal.getGoalNumber(),
                goal.getAutoDebitEnabled(), goal.getAutoDebitFrequency());
        return toResponse(saved);
    }

    /**
     * Shared helper for the two-query pagination pattern used by getGoals() and
     * getCustomerGoals(). Converts a Page<Long> (IDs) into a Page<GoalResponse>
     * by batch-loading the entities with JOIN FETCH and re-ordering by ID.
     */
    private Page<GoalResponse> toGoalResponsePage(Page<Long> idPage, Pageable pageable) {
        if (idPage.isEmpty()) {
            return Page.empty(pageable);
        }
        List<SavingsGoal> goals = goalRepository.findByIdsWithDetails(idPage.getContent());
        Map<Long, SavingsGoal> byId = goals.stream()
                .collect(Collectors.toMap(SavingsGoal::getId, g -> g));
        List<GoalResponse> content = idPage.getContent().stream()
                .filter(byId::containsKey)
                .map(id -> toResponse(byId.get(id)))
                .toList();
        return new PageImpl<>(content, pageable, idPage.getTotalElements());
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

    private GoalTransactionResponse toTransactionResponse(com.cbs.goal.entity.SavingsGoalTransaction t) {
        return GoalTransactionResponse.builder()
                .id(t.getId())
                .transactionType(t.getTransactionType())
                .amount(t.getAmount())
                .runningBalance(t.getRunningBalance())
                .narration(t.getNarration())
                .sourceAccountId(t.getSourceAccount() != null ? t.getSourceAccount().getId() : null)
                .transactionRef(t.getTransactionRef())
                .createdAt(t.getCreatedAt())
                .createdBy(t.getCreatedBy())
                .build();
    }

    private String resolveGoalControlGlCode() {
        String glCode = cbsProperties.getLedger().getSavingsGoalControlGlCode();
        if (!StringUtils.hasText(glCode)) {
            throw new BusinessException("CBS_LEDGER_SAVINGS_GOAL_GL is required for savings goal postings",
                    "MISSING_SAVINGS_GOAL_CONTROL_GL");
        }
        return glCode;
    }
}
