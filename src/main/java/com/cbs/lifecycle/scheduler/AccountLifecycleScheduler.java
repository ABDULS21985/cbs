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

    @Scheduled(
            cron = "#{@cbsProperties.lifecycle.interestAccrualCron}",
            zone = "#{@cbsProperties.deployment.timezone}"
    )
    public void dailyInterestAccrual() {
        log.info("Starting daily interest accrual batch...");
        try {
            int processed = accountService.batchAccrueInterest();
            log.info("Daily interest accrual complete: {} accounts processed", processed);
        } catch (Exception e) {
            log.error("Daily interest accrual failed", e);
        }
    }

    @Scheduled(
            cron = "#{@cbsProperties.lifecycle.dormancyDetectionCron}",
            zone = "#{@cbsProperties.deployment.timezone}"
    )
    public void dailyDormancyDetection() {
        log.info("Starting dormancy detection...");
        try {
            int dormant = lifecycleService.detectDormantAccounts();
            log.info("Dormancy detection complete: {} accounts marked dormant", dormant);
        } catch (Exception e) {
            log.error("Dormancy detection failed", e);
        }
    }

    @Scheduled(
            cron = "#{@cbsProperties.lifecycle.escheatmentDetectionCron}",
            zone = "#{@cbsProperties.deployment.timezone}"
    )
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
