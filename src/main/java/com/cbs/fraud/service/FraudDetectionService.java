package com.cbs.fraud.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fraud.entity.*;
import com.cbs.fraud.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Fraud Detection & Prevention engine (Cap 61) + Know Your Transaction (Cap 66).
 * Scores each transaction against configurable rules, generates alerts when
 * cumulative risk score exceeds threshold, and supports investigation workflow.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class FraudDetectionService {

    private final FraudRuleRepository ruleRepository;
    private final FraudAlertRepository alertRepository;

    private static final int ALERT_THRESHOLD = 50;

    /**
     * Scores a transaction against all active fraud rules.
     * Returns alert if score >= threshold, null if clean.
     */
    @Transactional
    public FraudAlert scoreTransaction(Long customerId, Long accountId, String transactionRef,
                                         BigDecimal amount, String channel, String deviceId,
                                         String ipAddress, String geoLocation,
                                         Map<String, Object> transactionContext) {
        List<FraudRule> rules = ruleRepository.findByIsActiveTrueOrderByScoreWeightDesc();
        int totalScore = 0;
        List<String> triggeredRules = new ArrayList<>();

        for (FraudRule rule : rules) {
            if (!"ALL".equals(rule.getApplicableChannels()) && !rule.getApplicableChannels().contains(channel)) continue;

            boolean triggered = evaluateRule(rule, amount, channel, deviceId, ipAddress, geoLocation, transactionContext);
            if (triggered) {
                totalScore += rule.getScoreWeight();
                triggeredRules.add(rule.getRuleCode() + ":" + rule.getRuleName() + "(+" + rule.getScoreWeight() + ")");
            }
        }

        int cappedScore = Math.min(totalScore, 100);

        if (cappedScore >= ALERT_THRESHOLD) {
            Long seq = alertRepository.getNextAlertSequence();
            String alertRef = String.format("FRD%012d", seq);

            String action = cappedScore >= 80 ? "BLOCK_TRANSACTION" :
                           cappedScore >= 60 ? "STEP_UP_AUTH" : "REVIEW";

            FraudAlert alert = FraudAlert.builder()
                    .alertRef(alertRef).customerId(customerId).accountId(accountId)
                    .transactionRef(transactionRef).riskScore(cappedScore)
                    .triggeredRules(triggeredRules).channel(channel)
                    .deviceId(deviceId).ipAddress(ipAddress).geoLocation(geoLocation)
                    .description(String.format("Risk score %d/100, %d rules triggered: %s",
                            cappedScore, triggeredRules.size(), String.join(", ", triggeredRules)))
                    .actionTaken(action).status("NEW").build();

            FraudAlert saved = alertRepository.save(alert);
            log.warn("Fraud alert: ref={}, score={}, action={}, rules={}", alertRef, cappedScore, action, triggeredRules.size());
            return saved;
        }

        return null; // Clean transaction
    }

    private boolean evaluateRule(FraudRule rule, BigDecimal amount, String channel,
                                   String deviceId, String ipAddress, String geoLocation,
                                   Map<String, Object> ctx) {
        Map<String, Object> config = rule.getRuleConfig();
        return switch (rule.getRuleCategory()) {
            case "AMOUNT_ANOMALY" -> {
                BigDecimal threshold = toBd(config.get("threshold"));
                yield threshold != null && amount.compareTo(threshold) > 0;
            }
            case "VELOCITY" -> {
                Integer maxCount = toInt(config.get("max_count"));
                Integer recentCount = toInt(ctx.get("recent_txn_count"));
                yield maxCount != null && recentCount != null && recentCount > maxCount;
            }
            case "GEO_ANOMALY" -> {
                String expectedCountry = (String) config.get("expected_country");
                String txnCountry = (String) ctx.get("txn_country");
                yield expectedCountry != null && txnCountry != null && !expectedCountry.equals(txnCountry);
            }
            case "DEVICE_ANOMALY" -> {
                Boolean newDevice = (Boolean) ctx.get("is_new_device");
                yield Boolean.TRUE.equals(newDevice);
            }
            case "ACCOUNT_TAKEOVER" -> {
                Boolean passwordChanged = (Boolean) ctx.get("recent_password_change");
                Boolean newDevice2 = (Boolean) ctx.get("is_new_device");
                yield Boolean.TRUE.equals(passwordChanged) && Boolean.TRUE.equals(newDevice2);
            }
            case "CARD_FRAUD" -> {
                Boolean cardNotPresent = (Boolean) ctx.get("card_not_present");
                Boolean highRiskMcc = (Boolean) ctx.get("high_risk_mcc");
                yield Boolean.TRUE.equals(cardNotPresent) && Boolean.TRUE.equals(highRiskMcc);
            }
            default -> false;
        };
    }

    // Investigation workflow
    @Transactional
    public FraudAlert assignAlert(Long alertId, String assignedTo) {
        FraudAlert alert = findAlertOrThrow(alertId);
        alert.setAssignedTo(assignedTo);
        alert.setStatus("INVESTIGATING");
        return alertRepository.save(alert);
    }

    @Transactional
    public FraudAlert resolveAlert(Long alertId, String resolution, String resolvedBy) {
        FraudAlert alert = findAlertOrThrow(alertId);
        String newStatus = switch (resolution == null ? "" : resolution.toUpperCase()) {
            case "FALSE_POSITIVE", "DISMISSED" -> "FALSE_POSITIVE";
            case "ALLOWED" -> "RESOLVED";
            case "CONFIRMED_FRAUD", "FRAUD_CONFIRMED" -> "CONFIRMED_FRAUD";
            default -> "RESOLVED";
        };
        alert.setStatus(newStatus);
        alert.setResolutionNotes(resolution);
        alert.setResolvedBy(resolvedBy);
        alert.setResolvedAt(Instant.now());
        return alertRepository.save(alert);
    }

    public Page<FraudAlert> getAlertsByStatus(String status, Pageable pageable) {
        return alertRepository.findByStatusOrderByRiskScoreDesc(status, pageable);
    }

    @Transactional
    public FraudRule createRule(FraudRule rule) { return ruleRepository.save(rule); }
    public List<FraudRule> getAllActiveRules() { return ruleRepository.findByIsActiveTrueOrderByScoreWeightDesc(); }

    @Transactional
    public FraudRule toggleRule(Long ruleId) {
        FraudRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("FraudRule", "id", ruleId));
        rule.setIsActive(!rule.getIsActive());
        log.info("Fraud rule toggled: code={}, active={}", rule.getRuleCode(), rule.getIsActive());
        return ruleRepository.save(rule);
    }

    @Transactional
    public FraudAlert blockCard(Long alertId) {
        FraudAlert alert = findAlertOrThrow(alertId);
        alert.setActionTaken("BLOCK_CARD");
        alert.setStatus("CONFIRMED_FRAUD");
        log.info("Card blocked for fraud alert: ref={}", alert.getAlertRef());
        return alertRepository.save(alert);
    }

    @Transactional
    public FraudAlert blockAccount(Long alertId) {
        FraudAlert alert = findAlertOrThrow(alertId);
        alert.setActionTaken("BLOCK_ACCOUNT");
        alert.setStatus("CONFIRMED_FRAUD");
        log.info("Account blocked for fraud alert: ref={}", alert.getAlertRef());
        return alertRepository.save(alert);
    }

    @Transactional
    public FraudAlert fileCase(Long alertId, String notes) {
        FraudAlert alert = findAlertOrThrow(alertId);
        alert.setActionTaken("CASE_FILED");
        alert.setStatus("INVESTIGATING");
        alert.setResolutionNotes(notes);
        log.info("Investigation case filed for fraud alert: ref={}", alert.getAlertRef());
        return alertRepository.save(alert);
    }

    private FraudAlert findAlertOrThrow(Long id) {
        return alertRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("FraudAlert", "id", id));
    }

    private BigDecimal toBd(Object v) { return v == null ? null : new BigDecimal(v.toString()); }
    private Integer toInt(Object v) { return v == null ? null : ((Number) v).intValue(); }
}
