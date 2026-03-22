package com.cbs.aml.service;

import com.cbs.account.entity.Account;
import com.cbs.account.repository.AccountRepository;
import com.cbs.aml.engine.AmlMonitoringEngine;
import com.cbs.aml.entity.*;
import com.cbs.aml.repository.*;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AmlService {

    private final AmlRuleRepository ruleRepository;
    private final AmlAlertRepository alertRepository;
    private final AmlMonitoringEngine monitoringEngine;
    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;

    @Transactional
    public List<AmlAlert> screenTransaction(AmlMonitoringEngine.TransactionContext ctx,
                                              Customer customer, Account account) {
        List<AmlRule> activeRules = ruleRepository.findByIsActiveTrueOrderByRuleNameAsc();
        List<AmlMonitoringEngine.AlertTrigger> triggers = monitoringEngine.evaluateTransaction(ctx, activeRules);

        List<AmlAlert> alerts = triggers.stream().map(trigger -> {
            Long seq = alertRepository.getNextAlertSequence();
            String alertRef = String.format("AML%012d", seq);

            AmlRule rule = ruleRepository.findByRuleCode(trigger.getRuleCode())
                    .orElseThrow(() -> new ResourceNotFoundException("AmlRule", "ruleCode", trigger.getRuleCode()));

            AmlAlert alert = AmlAlert.builder()
                    .alertRef(alertRef).rule(rule).customer(customer).account(account)
                    .alertType(trigger.getCategory().name()).severity(trigger.getSeverity())
                    .description(trigger.getDescription())
                    .triggerAmount(trigger.getTriggerAmount())
                    .triggerCount(trigger.getTriggerCount())
                    .status(AmlAlertStatus.NEW)
                    .priority(trigger.getSeverity()).build();

            AmlAlert saved = alertRepository.save(alert);
            log.warn("AML alert generated: ref={}, rule={}, severity={}, customer={}, amount={}",
                    alertRef, trigger.getRuleCode(), trigger.getSeverity(),
                    customer.getId(), trigger.getTriggerAmount());
            return saved;
        }).toList();

        return alerts;
    }

    // ========================================================================
    // ALERT INVESTIGATION WORKFLOW
    // ========================================================================

    public AmlAlert getAlert(Long id) {
        return alertRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("AmlAlert", "id", id));
    }

    public Page<AmlAlert> getAlertsByStatus(AmlAlertStatus status, Pageable pageable) {
        return alertRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
    }

    public Page<AmlAlert> getCustomerAlerts(Long customerId, Pageable pageable) {
        return alertRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable);
    }

    @Transactional
    public AmlAlert assignAlert(Long alertId, String assignedTo) {
        AmlAlert alert = getAlert(alertId);
        alert.setAssignedTo(assignedTo);
        alert.setStatus(AmlAlertStatus.UNDER_REVIEW);
        return alertRepository.save(alert);
    }

    @Transactional
    public AmlAlert escalateAlert(Long alertId) {
        AmlAlert alert = getAlert(alertId);
        alert.setStatus(AmlAlertStatus.ESCALATED);
        alert.setPriority("CRITICAL");
        return alertRepository.save(alert);
    }

    @Transactional
    public AmlAlert resolveAlert(Long alertId, String resolution, String resolvedBy) {
        AmlAlert alert = getAlert(alertId);
        AmlAlertStatus newStatus = "FALSE_POSITIVE".equalsIgnoreCase(resolution) ?
                AmlAlertStatus.FALSE_POSITIVE : AmlAlertStatus.CLOSED;
        alert.setStatus(newStatus);
        alert.setResolutionNotes(resolution);
        alert.setResolvedBy(resolvedBy);
        alert.setResolvedAt(Instant.now());
        log.info("AML alert resolved: ref={}, status={}, by={}", alert.getAlertRef(), newStatus, resolvedBy);
        return alertRepository.save(alert);
    }

    @Transactional
    public AmlAlert fileSar(Long alertId, String sarReference, String filedBy) {
        AmlAlert alert = getAlert(alertId);
        alert.setStatus(AmlAlertStatus.SAR_FILED);
        alert.setSarReference(sarReference);
        alert.setSarFiledDate(LocalDate.now());
        alert.setResolvedBy(filedBy);
        alert.setResolvedAt(Instant.now());
        log.info("SAR filed: alert={}, sarRef={}, by={}", alert.getAlertRef(), sarReference, filedBy);
        return alertRepository.save(alert);
    }

    // ========================================================================
    // RULES
    // ========================================================================

    @Transactional
    public AmlRule toggleRule(Long ruleId) {
        AmlRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("AmlRule", "id", ruleId));
        rule.setIsActive(!rule.getIsActive());
        log.info("AML rule toggled: code={}, active={}", rule.getRuleCode(), rule.getIsActive());
        return ruleRepository.save(rule);
    }

    @Transactional
    public AmlRule createRule(AmlRule rule) {
        AmlRule saved = ruleRepository.save(rule);
        log.info("AML rule created: code={}, category={}, severity={}", rule.getRuleCode(), rule.getRuleCategory(), rule.getSeverity());
        return saved;
    }

    public List<AmlRule> getAllActiveRules() {
        return ruleRepository.findByIsActiveTrueOrderByRuleNameAsc();
    }

    public List<AmlRule> getAllRules() {
        return ruleRepository.findAllByOrderByRuleNameAsc();
    }

    // ========================================================================
    // DASHBOARD
    // ========================================================================

    public AmlDashboard getDashboard() {
        return new AmlDashboard(
                alertRepository.countByStatus(AmlAlertStatus.NEW),
                alertRepository.countByStatus(AmlAlertStatus.UNDER_REVIEW),
                alertRepository.countByStatus(AmlAlertStatus.ESCALATED),
                alertRepository.countByStatus(AmlAlertStatus.SAR_FILED));
    }

    public record AmlDashboard(long newAlerts, long underReview, long escalated, long sarFiled) {}

    /**
     * Creates a new AML alert from an STR payload submitted by a compliance officer.
     * Used when filing an STR without a pre-existing alert (frontend "File STR" workflow).
     */
    @Transactional
    public AmlAlert createStrFromPayload(java.util.Map<String, Object> data, String sarRef, String filedBy) {
        Long seq = alertRepository.getNextAlertSequence();
        String alertRef = String.format("AML%012d", seq);

        // Resolve a rule to attach — prefer the first SUSPICIOUS_ACTIVITY / CUSTOM rule
        AmlRule rule = ruleRepository.findByIsActiveTrueOrderByRuleNameAsc().stream()
                .filter(r -> r.getRuleCategory() == AmlRuleCategory.CUSTOM)
                .findFirst()
                .orElseGet(() -> ruleRepository.findByIsActiveTrueOrderByRuleNameAsc().stream()
                        .findFirst()
                        .orElseThrow(() -> new BusinessException("No active AML rule found to attach STR")));

        BigDecimal triggerAmount = data.containsKey("amount")
                ? new BigDecimal(data.get("amount").toString()) : BigDecimal.ZERO;

        String description = data.containsKey("suspiciousActivity")
                ? (String) data.get("suspiciousActivity") : "STR filed by compliance officer";

        AmlAlert alert = AmlAlert.builder()
                .alertRef(alertRef)
                .rule(rule)
                .alertType("CUSTOM")
                .severity("HIGH")
                .description(description)
                .triggerAmount(triggerAmount)
                .triggerCount(0)
                .status(AmlAlertStatus.SAR_FILED)
                .priority("HIGH")
                .sarReference(sarRef)
                .sarFiledDate(LocalDate.now())
                .resolvedBy(filedBy)
                .resolvedAt(Instant.now())
                .build();

        // Attach customer/account if provided (use getById reference for safe FK linking)
        if (data.containsKey("customerId")) {
            Long customerId = Long.valueOf(data.get("customerId").toString());
            customerRepository.findById(customerId).ifPresent(alert::setCustomer);
        }
        if (data.containsKey("accountId")) {
            Long accountId = Long.valueOf(data.get("accountId").toString());
            accountRepository.findById(accountId).ifPresent(alert::setAccount);
        }

        AmlAlert saved = alertRepository.save(alert);
        log.info("STR filed directly: ref={}, sarRef={}, by={}", alertRef, sarRef, filedBy);
        return saved;
    }
}
