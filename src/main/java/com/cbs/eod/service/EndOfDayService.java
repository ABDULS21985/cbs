package com.cbs.eod.service;

import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.account.service.AccountService;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.deposit.service.FixedDepositService;
import com.cbs.deposit.service.RecurringDepositService;
import com.cbs.eod.entity.*;
import com.cbs.eod.repository.EodRunRepository;
import com.cbs.lending.service.LoanOriginationService;
import com.cbs.overdraft.service.OverdraftService;
import com.cbs.standing.service.StandingOrderService;
import com.cbs.treasury.service.TreasuryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
@Slf4j
public class EndOfDayService {

    private final EodRunRepository runRepository;
    private final FixedDepositService fdService;
    private final RecurringDepositService rdService;
    private final LoanOriginationService loanService;
    private final OverdraftService overdraftService;
    private final StandingOrderService standingOrderService;
    private final TreasuryService treasuryService;
    private final AccountService accountService;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;
    private final CbsProperties cbsProperties;

    /**
     * Executes the full End-of-Day batch with ordered steps.
     * Each step is independently transactional — failures in one step
     * don't roll back prior successful steps.
     */
    public EodRun executeEod(LocalDate businessDate, String initiatedBy) {
        EodRunType runType = determineRunType(businessDate);

        runRepository.findByBusinessDateAndRunType(businessDate, runType).ifPresent(existing -> {
            if ("COMPLETED".equals(existing.getStatus())) {
                throw new BusinessException("EOD already completed for " + businessDate, "EOD_ALREADY_RUN");
            }
        });

        EodRun run = EodRun.builder()
                .businessDate(businessDate).runType(runType)
                .initiatedBy(initiatedBy).status("RUNNING")
                .startedAt(Instant.now()).build();

        // Define EOD steps in order
        Map<String, Supplier<Integer>> steps = new LinkedHashMap<>();
        steps.put("Savings Interest Accrual", () -> accrueAccountInterest());
        steps.put("Fixed Deposit Interest Accrual", () -> fdService.batchAccrueInterest());
        steps.put("Fixed Deposit Maturity Processing", () -> fdService.processMaturedDeposits());
        steps.put("Recurring Deposit Auto-Debit", () -> rdService.processAutoDebits());
        steps.put("Loan Interest Accrual", () -> loanService.batchAccrueInterest());
        steps.put("Overdraft/LOC Interest Accrual", () -> overdraftService.batchAccrueInterest());
        steps.put("Standing Order Execution", () -> standingOrderService.executeDueInstructions());
        steps.put("Facility Expiry Processing", () -> overdraftService.processExpiredFacilities());
        steps.put("Treasury Deal Maturity", () -> treasuryService.processMaturedDeals());

        if (runType == EodRunType.EOM || runType == EodRunType.EOQ || runType == EodRunType.EOY) {
            steps.put("Monthly Interest Posting", () -> postMonthlyInterest());
            steps.put("Monthly Fee Charging", () -> chargeMonthlyFees());
        }

        int order = 1;
        for (Map.Entry<String, Supplier<Integer>> entry : steps.entrySet()) {
            EodStep step = EodStep.builder()
                    .stepOrder(order++).stepName(entry.getKey())
                    .status("PENDING").build();
            run.addStep(step);
        }

        runRepository.save(run);

        // Execute each step
        int stepIndex = 0;
        boolean anyFailed = false;
        for (Map.Entry<String, Supplier<Integer>> entry : steps.entrySet()) {
            EodStep step = run.getSteps().get(stepIndex++);
            step.setStartedAt(Instant.now());
            step.setStatus("RUNNING");

            try {
                int records = entry.getValue().get();
                step.setRecordsProcessed(records);
                step.setStatus("COMPLETED");
                step.setCompletedAt(Instant.now());
                step.setDurationMs((int)(step.getCompletedAt().toEpochMilli() - step.getStartedAt().toEpochMilli()));
                run.setCompletedSteps(run.getCompletedSteps() + 1);

                log.info("EOD step completed: {} — {} records in {}ms", entry.getKey(), records, step.getDurationMs());
            } catch (Exception e) {
                step.setStatus("FAILED");
                step.setErrorMessage(e.getMessage());
                step.setCompletedAt(Instant.now());
                step.setDurationMs((int)(step.getCompletedAt().toEpochMilli() - step.getStartedAt().toEpochMilli()));
                run.setFailedSteps(run.getFailedSteps() + 1);
                anyFailed = true;

                log.error("EOD step failed: {} — {}", entry.getKey(), e.getMessage());
                // Continue to next step — don't abort the entire EOD
            }

            runRepository.save(run);
        }

        run.setCompletedAt(Instant.now());
        run.setDurationSeconds((int)(run.getCompletedAt().toEpochMilli() - run.getStartedAt().toEpochMilli()) / 1000);
        run.setStatus(anyFailed ? "FAILED" : "COMPLETED");

        EodRun saved = runRepository.save(run);
        log.info("EOD {} for {}: status={}, steps={}/{}, duration={}s",
                runType, businessDate, saved.getStatus(), saved.getCompletedSteps(), saved.getTotalSteps(), saved.getDurationSeconds());
        return saved;
    }

    public EodRun getLastRun(EodRunType runType) {
        return runRepository.findTopByRunTypeOrderByBusinessDateDesc(runType).orElse(null);
    }

    /**
     * Retry a failed step by re-executing its associated batch logic.
     */
    @Transactional
    public void retryStep(Long runId, EodStep step) {
        Map<String, Supplier<Integer>> stepMap = getStepSuppliers();
        Supplier<Integer> supplier = stepMap.get(step.getStepName());

        if (supplier == null) {
            // Guard: step name was renamed or is unrecognized — fail loudly
            step.setStatus("FAILED");
            step.setErrorMessage("Unrecognized step name: '" + step.getStepName()
                    + "'. Known steps: " + String.join(", ", stepMap.keySet()));
            step.setCompletedAt(Instant.now());
            log.error("EOD step retry aborted — unrecognized step name '{}'. Known steps: {}",
                    step.getStepName(), stepMap.keySet());
            throw new BusinessException(
                    "Cannot retry step '" + step.getStepName() + "': step name not found in current EOD configuration. "
                            + "Known steps: " + String.join(", ", stepMap.keySet()),
                    "EOD_STEP_NAME_UNRECOGNIZED");
        }

        step.setStartedAt(Instant.now());
        step.setStatus("RUNNING");

        try {
            int records = supplier.get();
            step.setRecordsProcessed(records);
            step.setStatus("COMPLETED");
            step.setCompletedAt(Instant.now());
            step.setDurationMs((int)(step.getCompletedAt().toEpochMilli() - step.getStartedAt().toEpochMilli()));

            EodRun run = runRepository.findById(runId).orElse(null);
            if (run != null) {
                run.setCompletedSteps(run.getCompletedSteps() + 1);
                if (run.getFailedSteps() > 0) run.setFailedSteps(run.getFailedSteps() - 1);

                boolean allDone = run.getSteps().stream()
                        .allMatch(s -> "COMPLETED".equals(s.getStatus()) || "SKIPPED".equals(s.getStatus()));
                if (allDone) {
                    run.setStatus("COMPLETED");
                    run.setCompletedAt(Instant.now());
                    run.setDurationSeconds((int)(run.getCompletedAt().toEpochMilli() - run.getStartedAt().toEpochMilli()) / 1000);
                }
                runRepository.save(run);
            }
            log.info("EOD step retry completed: {} — {} records in {}ms", step.getStepName(), records, step.getDurationMs());
        } catch (BusinessException e) {
            throw e; // re-throw business exceptions (like unrecognized step)
        } catch (Exception e) {
            step.setStatus("FAILED");
            step.setErrorMessage(e.getMessage());
            step.setCompletedAt(Instant.now());
            step.setDurationMs((int)(step.getCompletedAt().toEpochMilli() - step.getStartedAt().toEpochMilli()));
            log.error("EOD step retry failed: {} — {}", step.getStepName(), e.getMessage());
        }
    }

    private Map<String, Supplier<Integer>> getStepSuppliers() {
        Map<String, Supplier<Integer>> steps = new LinkedHashMap<>();
        steps.put("Savings Interest Accrual", this::accrueAccountInterest);
        steps.put("Fixed Deposit Interest Accrual", fdService::batchAccrueInterest);
        steps.put("Fixed Deposit Maturity Processing", fdService::processMaturedDeposits);
        steps.put("Recurring Deposit Auto-Debit", rdService::processAutoDebits);
        steps.put("Loan Interest Accrual", loanService::batchAccrueInterest);
        steps.put("Overdraft/LOC Interest Accrual", overdraftService::batchAccrueInterest);
        steps.put("Standing Order Execution", standingOrderService::executeDueInstructions);
        steps.put("Facility Expiry Processing", overdraftService::processExpiredFacilities);
        steps.put("Treasury Deal Maturity", treasuryService::processMaturedDeals);
        steps.put("Monthly Interest Posting", this::postMonthlyInterest);
        steps.put("Monthly Fee Charging", this::chargeMonthlyFees);
        return steps;
    }

    private EodRunType determineRunType(LocalDate date) {
        if (date.getMonthValue() == 12 && date.getDayOfMonth() == 31) return EodRunType.EOY;
        if (date.getDayOfMonth() == date.lengthOfMonth()) {
            if (date.getMonthValue() % 3 == 0) return EodRunType.EOQ;
            return EodRunType.EOM;
        }
        return EodRunType.EOD;
    }

    /**
     * Accrues daily interest on all active, interest-bearing savings/current accounts.
     * Delegates to AccountService.batchAccrueInterest() which iterates all eligible
     * accounts, calculates daily accrual using the configured day-count convention,
     * and updates each account's accruedInterest running total.
     */
    private int accrueAccountInterest() {
        int processed = accountService.batchAccrueInterest();
        log.info("EOD savings interest accrual: {} accounts processed", processed);
        return processed;
    }

    /**
     * Posts accumulated accrued interest to all accounts that have a positive
     * accruedInterest balance. Runs at month-end (EOM/EOQ/EOY).
     * Each account's accrued amount is credited via GL journal, and the
     * accruedInterest field is reset to zero.
     */
    private int postMonthlyInterest() {
        List<Account> accounts = accountRepository.findActiveInterestBearingAccounts();
        int posted = 0;
        for (Account account : accounts) {
            try {
                if (account.getAccruedInterest() != null
                        && account.getAccruedInterest().compareTo(BigDecimal.ZERO) > 0) {
                    accountService.postInterest(account.getId());
                    posted++;
                }
            } catch (Exception e) {
                log.error("Monthly interest posting failed for account {}: {}",
                        account.getAccountNumber(), e.getMessage());
            }
        }
        log.info("EOD monthly interest posting: {} accounts posted", posted);
        return posted;
    }

    /**
     * Charges monthly maintenance fees to all active accounts whose product
     * defines a non-zero monthlyMaintenanceFee. Debits the account and credits
     * the product's GL fee income account.
     */
    private int chargeMonthlyFees() {
        List<Account> accounts = accountRepository.findActiveInterestBearingAccounts();
        int charged = 0;
        for (Account account : accounts) {
            try {
                Product product = account.getProduct();
                if (product == null) continue;

                BigDecimal fee = product.getMonthlyMaintenanceFee();
                if (fee == null || fee.compareTo(BigDecimal.ZERO) <= 0) continue;

                int postingScale = cbsProperties.getInterest().getPostingScale();
                BigDecimal roundedFee = fee.setScale(postingScale, RoundingMode.HALF_UP);

                String glFeeIncome = product.getGlFeeIncomeCode();
                if (glFeeIncome == null || glFeeIncome.isBlank()) {
                    log.warn("Skipping fee for account {} — product {} has no glFeeIncomeCode",
                            account.getAccountNumber(), product.getCode());
                    continue;
                }

                accountPostingService.postDebitAgainstGl(
                        account,
                        TransactionType.FEE_DEBIT,
                        roundedFee,
                        String.format("Monthly maintenance fee — %s", product.getName()),
                        TransactionChannel.SYSTEM,
                        null,
                        glFeeIncome,
                        "ACCOUNT",
                        account.getAccountNumber()
                );
                charged++;
            } catch (Exception e) {
                log.error("Monthly fee charging failed for account {}: {}",
                        account.getAccountNumber(), e.getMessage());
            }
        }
        log.info("EOD monthly fee charging: {} accounts charged", charged);
        return charged;
    }
}
