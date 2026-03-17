package com.cbs.eod.service;

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

import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
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

    private EodRunType determineRunType(LocalDate date) {
        if (date.getMonthValue() == 12 && date.getDayOfMonth() == 31) return EodRunType.EOY;
        if (date.getDayOfMonth() == date.lengthOfMonth()) {
            if (date.getMonthValue() % 3 == 0) return EodRunType.EOQ;
            return EodRunType.EOM;
        }
        return EodRunType.EOD;
    }

    private int accrueAccountInterest() {
        // Placeholder — delegates to account interest accrual batch
        // In Batch 2, AccountLifecycleScheduler handles this via cron
        return 0;
    }

    private int postMonthlyInterest() {
        // Placeholder — monthly interest posting for savings accounts
        return 0;
    }

    private int chargeMonthlyFees() {
        // Placeholder — monthly maintenance fee charging
        return 0;
    }
}
