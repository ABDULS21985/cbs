package com.cbs.statements.scheduler;

import com.cbs.statements.entity.StatementSubscription;
import com.cbs.statements.repository.StatementSubscriptionRepository;
import com.cbs.statements.service.StatementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Scheduler that processes recurring statement subscriptions.
 * Runs daily (configurable via cbs.statements.subscription-cron) and generates
 * + delivers statements for subscriptions whose nextDelivery date is due.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StatementSubscriptionScheduler {

    private final StatementSubscriptionRepository subscriptionRepository;
    private final StatementService statementService;

    @Scheduled(
            cron = "#{@cbsProperties.statements.subscriptionCron}",
            zone = "#{@cbsProperties.deployment.timezone}"
    )
    public void processSubscriptions() {
        log.info("Starting statement subscription processing...");

        LocalDate today = LocalDate.now();
        List<StatementSubscription> dueSubscriptions =
                subscriptionRepository.findByActiveTrueAndNextDeliveryLessThanEqual(today);

        if (dueSubscriptions.isEmpty()) {
            log.info("No statement subscriptions due for processing.");
            return;
        }

        int success = 0;
        int failed = 0;

        for (StatementSubscription sub : dueSubscriptions) {
            try {
                processSubscription(sub, today);
                success++;
            } catch (Exception e) {
                failed++;
                log.error("Failed to process subscription id={} accountId={}: {}",
                        sub.getId(), sub.getAccountId(), e.getMessage());
            }
        }

        log.info("Statement subscription processing complete: {} succeeded, {} failed out of {} total",
                success, failed, dueSubscriptions.size());
    }

    private void processSubscription(StatementSubscription sub, LocalDate today) {
        // Determine the statement period based on frequency
        LocalDate fromDate = calculatePeriodStart(sub.getFrequency(), today);
        LocalDate toDate = today;

        // Determine delivery method
        if ("EMAIL".equals(sub.getDelivery()) && sub.getEmail() != null) {
            // Generate and email the statement
            Map<String, Object> result = statementService.emailStatement(
                    sub.getAccountId(), fromDate, toDate, sub.getEmail());

            String status = (String) result.getOrDefault("status", "UNKNOWN");
            log.info("Subscription id={}: email delivery to {} — status={}",
                    sub.getId(), sub.getEmail(), status);
        } else {
            // PORTAL delivery: generate and store (statement is accessible via the generate endpoint)
            statementService.generateStatement(sub.getAccountId(), fromDate, toDate);
            log.info("Subscription id={}: portal statement generated for period {} to {}",
                    sub.getId(), fromDate, toDate);
        }

        // Advance the next delivery date
        sub.setNextDelivery(calculateNextDelivery(sub.getFrequency(), today));
        subscriptionRepository.save(sub);
    }

    private LocalDate calculatePeriodStart(String frequency, LocalDate today) {
        return switch (frequency) {
            case "WEEKLY" -> today.minusWeeks(1);
            case "QUARTERLY" -> today.minusMonths(3);
            default -> today.minusMonths(1); // MONTHLY
        };
    }

    private LocalDate calculateNextDelivery(String frequency, LocalDate today) {
        return switch (frequency) {
            case "WEEKLY" -> today.plusWeeks(1);
            case "QUARTERLY" -> today.plusMonths(3);
            default -> today.plusMonths(1); // MONTHLY
        };
    }
}
