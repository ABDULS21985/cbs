package com.cbs.notification.service;

import com.cbs.notification.entity.*;
import com.cbs.notification.repository.ChannelConfigRepository;
import com.cbs.notification.repository.NotificationTemplateRepository;
import com.cbs.notification.repository.ScheduledNotificationRepository;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Periodic executor for scheduled notification campaigns.
 * Runs every 60 seconds, finds campaigns whose nextRun <= now and status = ACTIVE,
 * resolves recipients from criteria, sends notifications, and advances nextRun.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ScheduledNotificationExecutor {

    private final ScheduledNotificationRepository scheduledRepo;
    private final NotificationTemplateRepository templateRepo;
    private final ChannelConfigRepository channelConfigRepo;
    private final CustomerRepository customerRepository;
    private final NotificationService notificationService;

    @Scheduled(fixedDelayString = "${cbs.notification.scheduler.interval-ms:60000}")
    @Transactional
    public void executeDueCampaigns() {
        List<ScheduledNotification> due = scheduledRepo.findDueForExecution(Instant.now());
        if (due.isEmpty()) return;

        log.info("Scheduled notification executor: {} campaign(s) due for execution", due.size());

        for (ScheduledNotification campaign : due) {
            try {
                executeCampaign(campaign);
            } catch (Exception e) {
                log.error("Failed to execute scheduled campaign id={}, name='{}': {}",
                        campaign.getId(), campaign.getName(), e.getMessage(), e);
            }
        }
    }

    private void executeCampaign(ScheduledNotification campaign) {
        // Check channel is enabled
        Optional<ChannelConfig> channelCfg = channelConfigRepo.findByChannel(campaign.getChannel());
        if (channelCfg.isPresent() && !Boolean.TRUE.equals(channelCfg.get().getEnabled())) {
            log.warn("Skipping campaign id={}: channel {} is disabled", campaign.getId(), campaign.getChannel());
            return;
        }

        // Resolve body and subject — use template if templateCode is set
        String body = campaign.getBody();
        String subject = campaign.getSubject();
        String eventType = campaign.getEventType() != null ? campaign.getEventType() : "SCHEDULED";

        if (campaign.getTemplateCode() != null && !campaign.getTemplateCode().isBlank()) {
            Optional<NotificationTemplate> tplOpt = templateRepo.findByTemplateCode(campaign.getTemplateCode());
            if (tplOpt.isPresent()) {
                NotificationTemplate tpl = tplOpt.get();
                body = tpl.getBodyTemplate();
                subject = tpl.getSubject();
                eventType = tpl.getEventType();
            }
        }

        // Resolve recipients from criteria
        List<RecipientInfo> recipients = resolveRecipients(campaign);

        int sent = 0, failed = 0;
        for (RecipientInfo r : recipients) {
            try {
                // Resolve merge fields per recipient
                Map<String, String> mergeData = Map.of(
                        "customerName", r.name(),
                        "date", Instant.now().toString()
                );

                String resolvedBody = resolvePlaceholders(body, mergeData);
                String resolvedSubject = subject != null ? resolvePlaceholders(subject, mergeData) : null;

                notificationService.sendDirect(
                        campaign.getChannel(), r.address(), r.name(),
                        resolvedSubject != null ? resolvedSubject : "", resolvedBody,
                        r.customerId(), eventType
                );
                sent++;
            } catch (Exception e) {
                failed++;
                log.debug("Failed to send to {} for campaign {}: {}", r.address(), campaign.getId(), e.getMessage());
            }
        }

        log.info("Campaign id={} name='{}' executed: sent={}, failed={}, total={}",
                campaign.getId(), campaign.getName(), sent, failed, recipients.size());

        // Update campaign state
        campaign.setLastRun(Instant.now());
        campaign.setRecipientCount(recipients.size());

        // Advance nextRun based on frequency, or mark COMPLETED if ONCE
        switch (campaign.getFrequency().toUpperCase()) {
            case "ONCE" -> campaign.setStatus("COMPLETED");
            case "DAILY" -> campaign.setNextRun(campaign.getNextRun().plus(1, ChronoUnit.DAYS));
            case "WEEKLY" -> campaign.setNextRun(campaign.getNextRun().plus(7, ChronoUnit.DAYS));
            case "MONTHLY" -> campaign.setNextRun(campaign.getNextRun().plus(30, ChronoUnit.DAYS));
            default -> {
                // If cron expression is present, parse next occurrence
                // For now, default to daily
                if (campaign.getCronExpression() != null && !campaign.getCronExpression().isBlank()) {
                    campaign.setNextRun(campaign.getNextRun().plus(1, ChronoUnit.DAYS));
                } else {
                    campaign.setStatus("COMPLETED");
                }
            }
        }
        campaign.setUpdatedAt(Instant.now());
        scheduledRepo.save(campaign);
    }

    /**
     * Resolves recipients from campaign criteria.
     * Supports: broadcast (all active), segmentCode (by customer type), explicit list.
     */
    private List<RecipientInfo> resolveRecipients(ScheduledNotification campaign) {
        Map<String, Object> criteria = campaign.getRecipientCriteria();
        List<RecipientInfo> recipients = new ArrayList<>();

        if (criteria == null || criteria.isEmpty() || Boolean.TRUE.equals(criteria.get("broadcast"))) {
            // Broadcast to all active customers
            Page<Customer> customers = customerRepository.findByStatus(
                    CustomerStatus.ACTIVE, PageRequest.of(0, 10000));
            for (Customer c : customers.getContent()) {
                String addr = resolveAddress(c, campaign.getChannel());
                if (addr != null && !addr.isBlank()) {
                    recipients.add(new RecipientInfo(c.getId(), displayName(c), addr));
                }
            }
        } else if (criteria.containsKey("segmentCode")) {
            String segment = String.valueOf(criteria.get("segmentCode"));
            try {
                Page<Customer> customers = customerRepository.findByCustomerType(
                        com.cbs.customer.entity.CustomerType.valueOf(segment), PageRequest.of(0, 10000));
                for (Customer c : customers.getContent()) {
                    String addr = resolveAddress(c, campaign.getChannel());
                    if (addr != null && !addr.isBlank()) {
                        recipients.add(new RecipientInfo(c.getId(), displayName(c), addr));
                    }
                }
            } catch (IllegalArgumentException e) {
                log.warn("Unknown segment code '{}' for campaign {}", segment, campaign.getId());
            }
        } else if (criteria.containsKey("recipients")) {
            // Explicit recipient list in criteria JSON
            Object recipientList = criteria.get("recipients");
            if (recipientList instanceof List<?> list) {
                for (Object item : list) {
                    if (item instanceof Map<?, ?> map) {
                        String addr = map.containsKey("address") ? String.valueOf(map.get("address")) : "";
                        String name = map.containsKey("name") ? String.valueOf(map.get("name")) : "";
                        Long custId = map.get("customerId") instanceof Number n ? n.longValue() : null;
                        if (!addr.isBlank()) {
                            recipients.add(new RecipientInfo(custId, name, addr));
                        }
                    }
                }
            }
        }

        return recipients;
    }

    private String resolveAddress(Customer c, NotificationChannel channel) {
        return switch (channel) {
            case EMAIL -> c.getEmail();
            case SMS -> c.getPhonePrimary();
            case PUSH, IN_APP -> c.getId() != null ? c.getId().toString() : null;
            case WEBHOOK -> null;
        };
    }

    private String displayName(Customer c) {
        if (c.getFirstName() != null && c.getLastName() != null) {
            return c.getFirstName() + " " + c.getLastName();
        }
        if (c.getRegisteredName() != null) return c.getRegisteredName();
        return "Customer #" + c.getId();
    }

    private String resolvePlaceholders(String template, Map<String, String> data) {
        if (template == null) return "";
        String result = template;
        for (Map.Entry<String, String> entry : data.entrySet()) {
            result = result.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }
        return result;
    }

    private record RecipientInfo(Long customerId, String name, String address) {}
}
