package com.cbs.alm.scheduler;

import com.cbs.alm.service.AlmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job that auto-advances regulatory return due dates.
 * <p>
 * After a return is SUBMITTED, this job advances its due_date and next_due
 * to the next period (daily, monthly, or quarterly) and resets its status
 * back to DRAFT so the next filing cycle begins automatically.
 * </p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AlmRegulatoryScheduler {

    private final AlmService almService;

    @Scheduled(
            cron = "#{@cbsProperties.alm.regulatoryReturnAdvanceCron}",
            zone = "#{@cbsProperties.deployment.timezone}"
    )
    public void advanceRegulatoryReturnDates() {
        log.info("Starting regulatory return date advancement...");
        try {
            int advanced = almService.advanceSubmittedReturnDates();
            if (advanced > 0) {
                log.info("Regulatory return date advancement complete: {} returns advanced to next period", advanced);
            }
        } catch (Exception e) {
            log.error("Regulatory return date advancement failed", e);
        }
    }
}
