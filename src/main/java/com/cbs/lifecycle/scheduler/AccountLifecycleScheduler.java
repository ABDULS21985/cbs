package com.cbs.lifecycle.scheduler;

import com.cbs.account.service.AccountService;
import com.cbs.lifecycle.service.AccountLifecycleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AccountLifecycleScheduler {

    private final AccountLifecycleService lifecycleService;
    private final AccountService accountService;

    /**
     * Daily: Accrue interest on all interest-bearing accounts.
     * Runs at 00:30 WAT (23:30 UTC previous day).
     */
    @Scheduled(cron = "0 30 23 * * *", zone = "UTC")
    public void dailyInterestAccrual() {
        log.info("Starting daily interest accrual batch...");
        try {
            int processed = accountService.batchAccrueInterest();
            log.info("Daily interest accrual complete: {} accounts processed", processed);
        } catch (Exception e) {
            log.error("Daily interest accrual failed", e);
        }
    }

    /**
     * Daily: Detect dormant accounts.
     * Runs at 01:00 WAT (00:00 UTC).
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "UTC")
    public void dailyDormancyDetection() {
        log.info("Starting dormancy detection...");
        try {
            int dormant = lifecycleService.detectDormantAccounts();
            log.info("Dormancy detection complete: {} accounts marked dormant", dormant);
        } catch (Exception e) {
            log.error("Dormancy detection failed", e);
        }
    }

    /**
     * Monthly: Detect escheatment candidates.
     * Runs 1st of each month at 02:00 WAT (01:00 UTC).
     */
    @Scheduled(cron = "0 0 1 1 * *", zone = "UTC")
    public void monthlyEscheatmentDetection() {
        log.info("Starting escheatment detection...");
        try {
            int escheated = lifecycleService.detectEscheatmentCandidates();
            log.info("Escheatment detection complete: {} accounts escheated", escheated);
        } catch (Exception e) {
            log.error("Escheatment detection failed", e);
        }
    }
}
