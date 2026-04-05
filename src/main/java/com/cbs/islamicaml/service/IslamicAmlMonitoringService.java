package com.cbs.islamicaml.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.islamicaml.dto.AmlMonitoringContext;
import com.cbs.islamicaml.dto.CloseAlertRequest;
import com.cbs.islamicaml.dto.CreateIslamicAmlRuleRequest;
import com.cbs.islamicaml.dto.InvestigationDetails;
import com.cbs.islamicaml.dto.IslamicAmlAlertCriteria;
import com.cbs.islamicaml.dto.IslamicAmlAlertResponse;
import com.cbs.islamicaml.dto.IslamicAmlAlertStatistics;
import com.cbs.islamicaml.dto.IslamicAmlRuleResponse;
import com.cbs.islamicaml.entity.AmlAlertAction;
import com.cbs.islamicaml.entity.DetectionMethod;
import com.cbs.islamicaml.entity.EscalationLevel;
import com.cbs.islamicaml.entity.IslamicAmlAlert;
import com.cbs.islamicaml.entity.IslamicAmlAlertStatus;
import com.cbs.islamicaml.entity.IslamicAmlRule;
import com.cbs.islamicaml.entity.IslamicAmlRuleCategory;
import com.cbs.islamicaml.repository.IslamicAmlAlertRepository;
import com.cbs.islamicaml.repository.IslamicAmlRuleRepository;
import com.cbs.murabaha.entity.CommodityMurabahaTrade;
import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.murabaha.repository.CommodityMurabahaTradeRepository;
import com.cbs.murabaha.repository.MurabahaContractRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IslamicAmlMonitoringService {

    private final IslamicAmlRuleRepository ruleRepository;
    private final IslamicAmlAlertRepository alertRepository;
    private final MurabahaContractRepository murabahaContractRepository;
    private final CommodityMurabahaTradeRepository commodityMurabahaTradeRepository;
    private final CurrentActorProvider actorProvider;
    private final CurrentTenantResolver tenantResolver;

    private static final AtomicLong ALERT_SEQ = new AtomicLong(System.nanoTime());

    private static final BigDecimal DEFAULT_THRESHOLD = new BigDecimal("50000");
    private static final int DEFAULT_VELOCITY_LIMIT = 10;
    private static final int DEFAULT_MAX_TAWARRUQ_PER_MONTH = 3;
    private static final BigDecimal CTR_THRESHOLD = new BigDecimal("50000");
    private static final BigDecimal STRUCTURING_RATIO = new BigDecimal("0.80");
    private static final int RAPID_TIMING_DAYS = 3;

    // ─────────────────────── Real-time monitoring ───────────────────────

    public List<IslamicAmlAlertResponse> monitorTransaction(AmlMonitoringContext context) {
        Objects.requireNonNull(context, "Monitoring context must not be null");
        if (context.getCustomerId() == null) {
            throw new BusinessException("Customer ID is required for AML monitoring", "CUSTOMER_ID_REQUIRED");
        }

        log.info("Monitoring transaction {} for customer {}", context.getTransactionRef(), context.getCustomerId());

        List<IslamicAmlRule> enabledRules = ruleRepository.findByEnabledTrueOrderByPriorityAsc();
        List<IslamicAmlAlertResponse> alerts = new ArrayList<>();

        for (IslamicAmlRule rule : enabledRules) {
            if (!isRuleApplicableToContext(rule, context)) {
                continue;
            }
            if (evaluateRule(rule, context)) {
                log.info("Rule {} triggered for customer {} on transaction {}",
                        rule.getRuleCode(), context.getCustomerId(), context.getTransactionRef());

                List<String> transactions = context.getTransactionRef() != null
                        ? List.of(context.getTransactionRef()) : Collections.emptyList();
                List<String> contracts = context.getContractRef() != null
                        ? List.of(context.getContractRef()) : Collections.emptyList();

                Map<String, Object> alertContext = new HashMap<>();
                alertContext.put("transactionType", context.getTransactionType());
                alertContext.put("contractType", context.getContractType());
                alertContext.put("productCode", context.getProductCode());
                if (context.getAdditionalData() != null) {
                    alertContext.putAll(context.getAdditionalData());
                }

                IslamicAmlAlert alert = createAlert(
                        rule,
                        context.getCustomerId(),
                        context.getCustomerName(),
                        Optional.ofNullable(context.getAmount()).orElse(BigDecimal.ZERO),
                        context.getCurrencyCode(),
                        alertContext,
                        transactions,
                        contracts
                );
                alerts.add(toAlertResponse(alert));
            }
        }

        log.info("Transaction monitoring completed for customer {}: {} alerts generated",
                context.getCustomerId(), alerts.size());
        return alerts;
    }

    // ─────────────────────── Batch monitoring ───────────────────────

    public List<IslamicAmlAlertResponse> runBatchMonitoring(LocalDate analysisDate) {
        Objects.requireNonNull(analysisDate, "Analysis date must not be null");
        log.info("Running batch AML monitoring for date {}", analysisDate);

        List<IslamicAmlRule> enabledRules = ruleRepository.findByEnabledTrueOrderByPriorityAsc();
        List<IslamicAmlAlertResponse> allAlerts = new ArrayList<>();

        // Use ALL enabled rules in batch mode (THRESHOLD and VELOCITY are equally important)
        List<IslamicAmlRule> batchRules = enabledRules;

        List<MurabahaContract> activeContracts = murabahaContractRepository.findByStatus(
                MurabahaDomainEnums.ContractStatus.ACTIVE);

        Set<Long> uniqueCustomerIds = activeContracts.stream()
                .map(MurabahaContract::getCustomerId)
                .collect(Collectors.toSet());

        for (Long customerId : uniqueCustomerIds) {
            List<MurabahaContract> customerContracts = activeContracts.stream()
                    .filter(c -> c.getCustomerId().equals(customerId))
                    .toList();

            for (IslamicAmlRule rule : batchRules) {
                boolean triggered = evaluateBatchRule(rule, customerId, customerContracts, analysisDate);
                if (triggered) {
                    log.info("Batch rule {} triggered for customer {}", rule.getRuleCode(), customerId);

                    BigDecimal totalAmount = customerContracts.stream()
                            .map(MurabahaContract::getFinancedAmount)
                            .filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    List<String> contractRefs = customerContracts.stream()
                            .map(MurabahaContract::getContractRef)
                            .toList();

                    String currencyCode = customerContracts.stream()
                            .map(MurabahaContract::getCurrencyCode)
                            .filter(Objects::nonNull)
                            .findFirst()
                            .orElse("SAR");

                    Map<String, Object> alertContext = new HashMap<>();
                    alertContext.put("analysisDate", analysisDate.toString());
                    alertContext.put("contractCount", customerContracts.size());
                    alertContext.put("detectionMethod", rule.getDetectionMethod().name());

                    IslamicAmlAlert alert = createAlert(
                            rule, customerId, null, totalAmount, currencyCode,
                            alertContext, Collections.emptyList(), contractRefs
                    );
                    allAlerts.add(toAlertResponse(alert));
                }
            }
        }

        log.info("Batch monitoring completed for date {}: {} alerts generated", analysisDate, allAlerts.size());
        return allAlerts;
    }

    // ─────────────────────── Tawarruq-specific monitoring ───────────────────────

    public List<IslamicAmlAlertResponse> monitorTawarruqPatterns(Long customerId, int lookbackDays) {
        Objects.requireNonNull(customerId, "Customer ID must not be null");
        if (lookbackDays <= 0) {
            throw new BusinessException("Lookback days must be positive", "INVALID_LOOKBACK");
        }

        log.info("Monitoring Tawarruq patterns for customer {} with lookback {} days", customerId, lookbackDays);

        LocalDate cutoffDate = LocalDate.now().minusDays(lookbackDays);
        List<IslamicAmlAlertResponse> alerts = new ArrayList<>();

        // 1. Load Murabaha contracts for customer that are COMMODITY_MURABAHA type
        List<MurabahaContract> allCustomerContracts = murabahaContractRepository.findByCustomerId(customerId);
        List<MurabahaContract> commodityContracts = allCustomerContracts.stream()
                .filter(c -> c.getMurabahahType() == MurabahaDomainEnums.MurabahahType.COMMODITY_MURABAHA)
                .toList();

        // 2. Load associated commodity trades and filter to those within lookback period
        List<CommodityMurabahaTrade> recentTrades = new ArrayList<>();
        for (MurabahaContract contract : commodityContracts) {
            commodityMurabahaTradeRepository.findByContractId(contract.getId()).ifPresent(trade -> {
                LocalDate tradeDate = trade.getPurchaseDate();
                if (tradeDate != null && !tradeDate.isBefore(cutoffDate)) {
                    recentTrades.add(trade);
                }
            });
        }

        if (recentTrades.isEmpty()) {
            log.info("No recent Tawarruq trades found for customer {} within lookback period", customerId);
            return alerts;
        }

        List<String> involvedContractRefs = commodityContracts.stream()
                .map(MurabahaContract::getContractRef)
                .toList();
        List<String> involvedTradeRefs = recentTrades.stream()
                .map(CommodityMurabahaTrade::getTradeRef)
                .toList();

        // Load Tawarruq-specific rules
        List<IslamicAmlRule> tawarruqRules = ruleRepository.findByCategoryAndEnabledTrue(
                IslamicAmlRuleCategory.TAWARRUQ_ABUSE);

        // 3. Check velocity: too many Tawarruq transactions in the lookback period
        int maxPerMonth = DEFAULT_MAX_TAWARRUQ_PER_MONTH;
        IslamicAmlRule velocityRule = tawarruqRules.stream()
                .filter(r -> r.getDetectionMethod() == DetectionMethod.VELOCITY)
                .findFirst()
                .orElse(null);

        if (velocityRule != null) {
            maxPerMonth = extractIntParam(velocityRule.getRuleParameters(),
                    "maxTawarruqPerCustomerPerMonth", DEFAULT_MAX_TAWARRUQ_PER_MONTH);
        }

        double monthsInLookback = Math.max(1.0, lookbackDays / 30.0);
        double tradesPerMonth = recentTrades.size() / monthsInLookback;

        if (tradesPerMonth > maxPerMonth) {
            log.warn("Tawarruq velocity alert: customer {} has {}/{} trades/month (max={})",
                    customerId, String.format("%.1f", tradesPerMonth), recentTrades.size(), maxPerMonth);

            IslamicAmlRule ruleToUse = velocityRule != null ? velocityRule : buildFallbackTawarruqRule("VELOCITY");

            BigDecimal totalAmount = recentTrades.stream()
                    .map(t -> Optional.ofNullable(t.getPurchasePrice()).orElse(BigDecimal.ZERO))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            String currency = recentTrades.stream()
                    .map(CommodityMurabahaTrade::getPurchaseCurrency)
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse("SAR");

            Map<String, Object> ctx = new HashMap<>();
            ctx.put("pattern", "TAWARRUQ_VELOCITY");
            ctx.put("tradesPerMonth", tradesPerMonth);
            ctx.put("maxAllowed", maxPerMonth);
            ctx.put("totalTrades", recentTrades.size());
            ctx.put("lookbackDays", lookbackDays);

            IslamicAmlAlert alert = createAlert(ruleToUse, customerId, null, totalAmount, currency,
                    ctx, involvedTradeRefs, involvedContractRefs);
            alerts.add(toAlertResponse(alert));
        }

        // 4. Check round-tripping: proceeds of one trade used to fund the next (check timing proximity)
        List<CommodityMurabahaTrade> sortedByDate = recentTrades.stream()
                .filter(t -> t.getPurchaseDate() != null)
                .sorted((a, b) -> a.getPurchaseDate().compareTo(b.getPurchaseDate()))
                .toList();

        IslamicAmlRule patternRule = tawarruqRules.stream()
                .filter(r -> r.getDetectionMethod() == DetectionMethod.PATTERN)
                .findFirst()
                .orElse(null);

        int rapidDays = RAPID_TIMING_DAYS;
        if (patternRule != null) {
            rapidDays = extractIntParam(patternRule.getRuleParameters(), "rapidTimingDays", RAPID_TIMING_DAYS);
        }

        List<String> roundTripTradeRefs = new ArrayList<>();
        for (int i = 1; i < sortedByDate.size(); i++) {
            CommodityMurabahaTrade prev = sortedByDate.get(i - 1);
            CommodityMurabahaTrade curr = sortedByDate.get(i);

            LocalDate prevSaleDate = prev.getCustomerSaleDate();
            LocalDate currPurchaseDate = curr.getPurchaseDate();

            if (prevSaleDate != null && currPurchaseDate != null) {
                long daysBetween = ChronoUnit.DAYS.between(prevSaleDate, currPurchaseDate);
                if (daysBetween >= 0 && daysBetween <= rapidDays) {
                    roundTripTradeRefs.add(prev.getTradeRef());
                    roundTripTradeRefs.add(curr.getTradeRef());
                }
            }
        }

        if (!roundTripTradeRefs.isEmpty()) {
            log.warn("Tawarruq round-tripping alert: customer {} has rapid sequential trades", customerId);

            IslamicAmlRule ruleToUse = patternRule != null ? patternRule : buildFallbackTawarruqRule("PATTERN");

            BigDecimal totalAmount = recentTrades.stream()
                    .map(t -> Optional.ofNullable(t.getPurchasePrice()).orElse(BigDecimal.ZERO))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Map<String, Object> ctx = new HashMap<>();
            ctx.put("pattern", "TAWARRUQ_ROUND_TRIPPING");
            ctx.put("rapidTradeCount", roundTripTradeRefs.stream().distinct().count());
            ctx.put("rapidTimingDays", rapidDays);

            IslamicAmlAlert alert = createAlert(ruleToUse, customerId, null, totalAmount, "SAR",
                    ctx, roundTripTradeRefs.stream().distinct().toList(), involvedContractRefs);
            alerts.add(toAlertResponse(alert));
        }

        // 5. Check same broker: same purchaseBrokerName across multiple trades
        Map<String, List<CommodityMurabahaTrade>> tradesByBroker = recentTrades.stream()
                .filter(t -> t.getPurchaseBrokerName() != null)
                .collect(Collectors.groupingBy(CommodityMurabahaTrade::getPurchaseBrokerName));

        for (Map.Entry<String, List<CommodityMurabahaTrade>> entry : tradesByBroker.entrySet()) {
            // Null-safe broker comparison
            if (entry.getKey() == null || entry.getKey().isBlank()) continue;

            List<CommodityMurabahaTrade> brokerTrades = entry.getValue();
            if (brokerTrades.size() >= 2) {
                // Further check: same broker used for both purchase and customer sale
                List<CommodityMurabahaTrade> sameBrokerBothSides = brokerTrades.stream()
                        .filter(t -> t.getCustomerSaleBrokerName() != null
                                && entry.getKey().equalsIgnoreCase(t.getCustomerSaleBrokerName()))
                        .toList();

                if (!sameBrokerBothSides.isEmpty()) {
                    log.warn("Tawarruq same-broker alert: customer {} uses broker '{}' on both sides in {} trades",
                            customerId, entry.getKey(), sameBrokerBothSides.size());

                    IslamicAmlRule ruleToUse = patternRule != null ? patternRule : buildFallbackTawarruqRule("SAME_BROKER");

                    BigDecimal totalAmount = sameBrokerBothSides.stream()
                            .map(t -> Optional.ofNullable(t.getPurchasePrice()).orElse(BigDecimal.ZERO))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    List<String> refs = sameBrokerBothSides.stream()
                            .map(CommodityMurabahaTrade::getTradeRef)
                            .toList();

                    Map<String, Object> ctx = new HashMap<>();
                    ctx.put("pattern", "TAWARRUQ_SAME_BROKER");
                    ctx.put("brokerName", entry.getKey());
                    ctx.put("tradeCount", sameBrokerBothSides.size());

                    IslamicAmlAlert alert = createAlert(ruleToUse, customerId, null, totalAmount, "SAR",
                            ctx, refs, involvedContractRefs);
                    alerts.add(toAlertResponse(alert));
                }
            }
        }

        // 6. Check structuring: amounts just below CTR threshold (80%+ of threshold)
        BigDecimal structuringFloor = CTR_THRESHOLD.multiply(STRUCTURING_RATIO);

        IslamicAmlRule thresholdRule = tawarruqRules.stream()
                .filter(r -> r.getDetectionMethod() == DetectionMethod.THRESHOLD)
                .findFirst()
                .orElse(null);

        BigDecimal ctrLimit = CTR_THRESHOLD;
        if (thresholdRule != null) {
            ctrLimit = extractDecimalParam(thresholdRule.getRuleParameters(), "ctrThreshold", CTR_THRESHOLD);
            structuringFloor = ctrLimit.multiply(
                    extractDecimalParam(thresholdRule.getRuleParameters(), "structuringRatio", STRUCTURING_RATIO));
        }

        BigDecimal finalStructuringFloor = structuringFloor;
        BigDecimal finalCtrLimit = ctrLimit;

        List<CommodityMurabahaTrade> structuringTrades = recentTrades.stream()
                .filter(t -> {
                    BigDecimal price = Optional.ofNullable(t.getPurchasePrice()).orElse(BigDecimal.ZERO);
                    return price.compareTo(finalStructuringFloor) >= 0 && price.compareTo(finalCtrLimit) < 0;
                })
                .toList();

        if (structuringTrades.size() >= 2) {
            log.warn("Tawarruq structuring alert: customer {} has {} trades just below CTR threshold",
                    customerId, structuringTrades.size());

            IslamicAmlRule ruleToUse = thresholdRule != null ? thresholdRule : buildFallbackTawarruqRule("STRUCTURING");

            BigDecimal totalAmount = structuringTrades.stream()
                    .map(t -> Optional.ofNullable(t.getPurchasePrice()).orElse(BigDecimal.ZERO))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            List<String> refs = structuringTrades.stream()
                    .map(CommodityMurabahaTrade::getTradeRef)
                    .toList();

            Map<String, Object> ctx = new HashMap<>();
            ctx.put("pattern", "TAWARRUQ_STRUCTURING");
            ctx.put("structuringTradeCount", structuringTrades.size());
            ctx.put("ctrThreshold", finalCtrLimit.toPlainString());
            ctx.put("structuringFloor", finalStructuringFloor.toPlainString());

            IslamicAmlAlert alert = createAlert(ruleToUse, customerId, null, totalAmount, "SAR",
                    ctx, refs, involvedContractRefs);
            alerts.add(toAlertResponse(alert));
        }

        log.info("Tawarruq monitoring completed for customer {}: {} alerts generated", customerId, alerts.size());
        return alerts;
    }

    // ─────────────────────── Pool movement monitoring ───────────────────────

    public List<IslamicAmlAlertResponse> monitorPoolMovements(Long poolId, int lookbackDays) {
        Objects.requireNonNull(poolId, "Pool ID must not be null");
        if (lookbackDays <= 0) {
            throw new BusinessException("Lookback days must be positive", "INVALID_LOOKBACK");
        }

        log.info("Monitoring pool movements for pool {} with lookback {} days", poolId, lookbackDays);

        LocalDate cutoffDate = LocalDate.now().minusDays(lookbackDays);
        List<IslamicAmlAlertResponse> alerts = new ArrayList<>();

        List<MurabahaContract> poolContracts = murabahaContractRepository.findByInvestmentPoolId(poolId);

        if (poolContracts.isEmpty()) {
            log.info("No contracts found for pool {}", poolId);
            return alerts;
        }

        // Detect rapid entry/exit: contracts that started and settled/cancelled within a short period
        List<MurabahaContract> recentPoolContracts = poolContracts.stream()
                .filter(c -> c.getStartDate() != null && !c.getStartDate().isBefore(cutoffDate))
                .toList();

        List<MurabahaContract> rapidCycleContracts = recentPoolContracts.stream()
                .filter(c -> {
                    if (c.getStartDate() == null) return false;
                    boolean isSettled = c.getStatus() == MurabahaDomainEnums.ContractStatus.SETTLED
                            || c.getStatus() == MurabahaDomainEnums.ContractStatus.EARLY_SETTLED
                            || c.getStatus() == MurabahaDomainEnums.ContractStatus.CANCELLED;
                    if (!isSettled) return false;
                    LocalDate endDate = c.getEarlySettledAt() != null ? c.getEarlySettledAt() : c.getMaturityDate();
                    if (endDate == null) return false;
                    long daysInPool = ChronoUnit.DAYS.between(c.getStartDate(), endDate);
                    return daysInPool <= 30;
                })
                .toList();

        if (rapidCycleContracts.size() >= 2) {
            log.warn("Pool layering alert: pool {} has {} rapid entry/exit contracts", poolId, rapidCycleContracts.size());

            List<IslamicAmlRule> poolRules = ruleRepository.findByCategoryAndEnabledTrue(
                    IslamicAmlRuleCategory.POOL_LAYERING);
            IslamicAmlRule ruleToUse = poolRules.stream().findFirst()
                    .orElse(buildFallbackPoolRule());

            Set<Long> involvedCustomerIds = rapidCycleContracts.stream()
                    .map(MurabahaContract::getCustomerId)
                    .collect(Collectors.toSet());

            BigDecimal totalAmount = rapidCycleContracts.stream()
                    .map(MurabahaContract::getFinancedAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            String currency = rapidCycleContracts.stream()
                    .map(MurabahaContract::getCurrencyCode)
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse("SAR");

            List<String> contractRefs = rapidCycleContracts.stream()
                    .map(MurabahaContract::getContractRef)
                    .toList();

            Map<String, Object> ctx = new HashMap<>();
            ctx.put("pattern", "POOL_RAPID_ENTRY_EXIT");
            ctx.put("poolId", poolId);
            ctx.put("rapidCycleCount", rapidCycleContracts.size());
            ctx.put("involvedCustomerIds", involvedCustomerIds);
            ctx.put("lookbackDays", lookbackDays);

            for (Long cid : involvedCustomerIds) {
                IslamicAmlAlert alert = createAlert(ruleToUse, cid, null, totalAmount, currency,
                        ctx, Collections.emptyList(), contractRefs);
                alerts.add(toAlertResponse(alert));
            }
        }

        // Detect concentration: single customer dominating pool entries
        Map<Long, List<MurabahaContract>> byCustomer = recentPoolContracts.stream()
                .collect(Collectors.groupingBy(MurabahaContract::getCustomerId));

        int totalPoolEntries = recentPoolContracts.size();
        for (Map.Entry<Long, List<MurabahaContract>> entry : byCustomer.entrySet()) {
            if (totalPoolEntries >= 3 && entry.getValue().size() > totalPoolEntries / 2) {
                log.warn("Pool concentration alert: customer {} has {} of {} entries in pool {}",
                        entry.getKey(), entry.getValue().size(), totalPoolEntries, poolId);

                List<IslamicAmlRule> poolRules = ruleRepository.findByCategoryAndEnabledTrue(
                        IslamicAmlRuleCategory.POOL_LAYERING);
                IslamicAmlRule ruleToUse = poolRules.stream().findFirst()
                        .orElse(buildFallbackPoolRule());

                BigDecimal custAmount = entry.getValue().stream()
                        .map(MurabahaContract::getFinancedAmount)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                List<String> custContractRefs = entry.getValue().stream()
                        .map(MurabahaContract::getContractRef)
                        .toList();

                Map<String, Object> ctx = new HashMap<>();
                ctx.put("pattern", "POOL_CONCENTRATION");
                ctx.put("poolId", poolId);
                ctx.put("customerEntries", entry.getValue().size());
                ctx.put("totalPoolEntries", totalPoolEntries);

                IslamicAmlAlert alert = createAlert(ruleToUse, entry.getKey(), null, custAmount, "SAR",
                        ctx, Collections.emptyList(), custContractRefs);
                alerts.add(toAlertResponse(alert));
            }
        }

        log.info("Pool movement monitoring completed for pool {}: {} alerts generated", poolId, alerts.size());
        return alerts;
    }

    // ─────────────────────── Rule management ───────────────────────

    public IslamicAmlRuleResponse createRule(CreateIslamicAmlRuleRequest request) {
        Objects.requireNonNull(request, "Rule request must not be null");

        ruleRepository.findByRuleCode(request.getRuleCode()).ifPresent(existing -> {
            throw new BusinessException(
                    "Rule with code '" + request.getRuleCode() + "' already exists", "DUPLICATE_RULE_CODE");
        });

        IslamicAmlRule rule = IslamicAmlRule.builder()
                .ruleCode(request.getRuleCode())
                .name(request.getName())
                .description(request.getDescription())
                .category(IslamicAmlRuleCategory.valueOf(request.getCategory()))
                .islamicProductContext(request.getIslamicProductContext())
                .detectionMethod(DetectionMethod.valueOf(request.getDetectionMethod()))
                .ruleParameters(request.getRuleParameters())
                .lookbackPeriodDays(Optional.ofNullable(request.getLookbackPeriodDays()).orElse(90))
                .minimumOccurrences(Optional.ofNullable(request.getMinimumOccurrences()).orElse(1))
                .alertSeverity(Optional.ofNullable(request.getAlertSeverity()).orElse("MEDIUM"))
                .alertAction(request.getAlertAction() != null
                        ? AmlAlertAction.valueOf(request.getAlertAction()) : AmlAlertAction.GENERATE_ALERT)
                .escalationLevel(request.getEscalationLevel() != null
                        ? EscalationLevel.valueOf(request.getEscalationLevel()) : EscalationLevel.COMPLIANCE_OFFICER)
                .fatfTypology(request.getFatfTypology())
                .gccGuidelineRef(request.getGccGuidelineRef())
                .effectiveFrom(request.getEffectiveFrom())
                .priority(Optional.ofNullable(request.getPriority()).orElse(100))
                .enabled(true)
                .tenantId(tenantResolver.getCurrentTenantId())
                .build();

        IslamicAmlRule saved = ruleRepository.save(rule);
        log.info("Created AML rule {} with code {}", saved.getId(), saved.getRuleCode());
        return toRuleResponse(saved);
    }

    public IslamicAmlRuleResponse updateRule(Long ruleId, CreateIslamicAmlRuleRequest request) {
        Objects.requireNonNull(ruleId, "Rule ID must not be null");
        Objects.requireNonNull(request, "Rule request must not be null");

        IslamicAmlRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicAmlRule", "id", ruleId));

        // Check for duplicate rule code if it changed
        if (!rule.getRuleCode().equals(request.getRuleCode())) {
            ruleRepository.findByRuleCode(request.getRuleCode()).ifPresent(existing -> {
                throw new BusinessException(
                        "Rule with code '" + request.getRuleCode() + "' already exists", "DUPLICATE_RULE_CODE");
            });
        }

        rule.setRuleCode(request.getRuleCode());
        rule.setName(request.getName());
        rule.setDescription(request.getDescription());
        rule.setCategory(IslamicAmlRuleCategory.valueOf(request.getCategory()));
        rule.setIslamicProductContext(request.getIslamicProductContext());
        rule.setDetectionMethod(DetectionMethod.valueOf(request.getDetectionMethod()));
        rule.setRuleParameters(request.getRuleParameters());
        rule.setLookbackPeriodDays(Optional.ofNullable(request.getLookbackPeriodDays()).orElse(rule.getLookbackPeriodDays()));
        rule.setMinimumOccurrences(Optional.ofNullable(request.getMinimumOccurrences()).orElse(rule.getMinimumOccurrences()));
        rule.setAlertSeverity(Optional.ofNullable(request.getAlertSeverity()).orElse(rule.getAlertSeverity()));
        rule.setAlertAction(request.getAlertAction() != null
                ? AmlAlertAction.valueOf(request.getAlertAction()) : rule.getAlertAction());
        rule.setEscalationLevel(request.getEscalationLevel() != null
                ? EscalationLevel.valueOf(request.getEscalationLevel()) : rule.getEscalationLevel());
        rule.setFatfTypology(request.getFatfTypology());
        rule.setGccGuidelineRef(request.getGccGuidelineRef());
        rule.setEffectiveFrom(request.getEffectiveFrom());
        rule.setPriority(Optional.ofNullable(request.getPriority()).orElse(rule.getPriority()));

        IslamicAmlRule saved = ruleRepository.save(rule);
        log.info("Updated AML rule {} with code {}", saved.getId(), saved.getRuleCode());
        return toRuleResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<IslamicAmlRuleResponse> getRules() {
        return ruleRepository.findByEnabledTrueOrderByPriorityAsc().stream()
                .map(this::toRuleResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public IslamicAmlRuleResponse getRule(Long ruleId) {
        IslamicAmlRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicAmlRule", "id", ruleId));
        return toRuleResponse(rule);
    }

    // ─────────────────────── Alert management ───────────────────────

    @Transactional(readOnly = true)
    public IslamicAmlAlertResponse getAlert(Long alertId) {
        IslamicAmlAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicAmlAlert", "id", alertId));
        return toAlertResponse(alert);
    }

    @Transactional(readOnly = true)
    public Page<IslamicAmlAlertResponse> getAlerts(IslamicAmlAlertCriteria criteria, Pageable pageable) {
        Specification<IslamicAmlAlert> spec = buildSpecification(criteria);
        return alertRepository.findAll(spec, pageable).map(this::toAlertResponse);
    }

    public void assignAlert(Long alertId, String assignedTo) {
        Objects.requireNonNull(alertId, "Alert ID must not be null");
        Objects.requireNonNull(assignedTo, "Assigned-to user must not be null");

        IslamicAmlAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicAmlAlert", "id", alertId));

        validateNotClosed(alert, "assign");

        alert.setAssignedTo(assignedTo);
        alert.setAssignedAt(LocalDateTime.now());
        alert.setStatus(IslamicAmlAlertStatus.UNDER_INVESTIGATION);

        alertRepository.save(alert);
        log.info("Alert {} assigned to {}", alert.getAlertRef(), assignedTo);
    }

    public void investigateAlert(Long alertId, InvestigationDetails details) {
        Objects.requireNonNull(alertId, "Alert ID must not be null");
        Objects.requireNonNull(details, "Investigation details must not be null");

        IslamicAmlAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicAmlAlert", "id", alertId));

        validateNotClosed(alert, "investigate");

        if (alert.getStatus() == IslamicAmlAlertStatus.NEW) {
            alert.setStatus(IslamicAmlAlertStatus.UNDER_INVESTIGATION);
        }

        alert.setInvestigatedBy(details.getInvestigatedBy());
        alert.setInvestigationNotes(details.getInvestigationNotes());

        alertRepository.save(alert);
        log.info("Alert {} investigated by {}", alert.getAlertRef(), details.getInvestigatedBy());
    }

    public void escalateAlert(Long alertId, String escalateTo, String reason) {
        Objects.requireNonNull(alertId, "Alert ID must not be null");
        Objects.requireNonNull(escalateTo, "Escalate-to user must not be null");
        Objects.requireNonNull(reason, "Escalation reason must not be null");

        IslamicAmlAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicAmlAlert", "id", alertId));

        validateNotClosed(alert, "escalate");

        alert.setStatus(IslamicAmlAlertStatus.ESCALATED);
        alert.setAssignedTo(escalateTo);
        alert.setAssignedAt(LocalDateTime.now());

        String existingNotes = Optional.ofNullable(alert.getInvestigationNotes()).orElse("");
        String escalationNote = String.format("[ESCALATED to %s by %s at %s] Reason: %s",
                escalateTo, actorProvider.getCurrentActor(), LocalDateTime.now(), reason);
        alert.setInvestigationNotes(existingNotes.isEmpty() ? escalationNote : existingNotes + "\n" + escalationNote);

        alertRepository.save(alert);
        log.info("Alert {} escalated to {} - reason: {}", alert.getAlertRef(), escalateTo, reason);
    }

    public void closeAlert(Long alertId, CloseAlertRequest request) {
        Objects.requireNonNull(alertId, "Alert ID must not be null");
        Objects.requireNonNull(request, "Close alert request must not be null");

        IslamicAmlAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicAmlAlert", "id", alertId));

        if (alert.getStatus() == IslamicAmlAlertStatus.CLOSED_NO_ACTION
                || alert.getStatus() == IslamicAmlAlertStatus.CLOSED_FALSE_POSITIVE) {
            throw new BusinessException("Alert " + alert.getAlertRef() + " is already closed", "ALERT_ALREADY_CLOSED");
        }

        if (alert.getStatus() == IslamicAmlAlertStatus.SAR_FILED) {
            throw new BusinessException(
                    "Cannot close alert " + alert.getAlertRef() + " with SAR filed status; use SAR workflow instead",
                    "INVALID_STATE_TRANSITION");
        }

        // Use explicit falsePositive flag from the request instead of substring matching on reason text
        alert.setStatus(request.isFalsePositive()
                ? IslamicAmlAlertStatus.CLOSED_FALSE_POSITIVE
                : IslamicAmlAlertStatus.CLOSED_NO_ACTION);
        alert.setClosedBy(request.getClosedBy());
        alert.setClosedAt(LocalDateTime.now());
        alert.setClosureReason(request.getClosureReason());

        alertRepository.save(alert);
        log.info("Alert {} closed by {} with status {}", alert.getAlertRef(), request.getClosedBy(), alert.getStatus());
    }

    public void fileSar(Long alertId, Long sarId) {
        Objects.requireNonNull(alertId, "Alert ID must not be null");
        Objects.requireNonNull(sarId, "SAR ID must not be null");

        IslamicAmlAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicAmlAlert", "id", alertId));

        if (alert.getStatus() == IslamicAmlAlertStatus.CLOSED_NO_ACTION
                || alert.getStatus() == IslamicAmlAlertStatus.CLOSED_FALSE_POSITIVE) {
            throw new BusinessException(
                    "Cannot file SAR for closed alert " + alert.getAlertRef(), "INVALID_STATE_TRANSITION");
        }

        alert.setSarFiled(true);
        alert.setSarReference("SAR-" + sarId);
        alert.setStatus(IslamicAmlAlertStatus.SAR_FILED);

        String actor = actorProvider.getCurrentActor();
        String sarNote = String.format("[SAR FILED by %s at %s] SAR ID: %d", actor, LocalDateTime.now(), sarId);
        String existingNotes = Optional.ofNullable(alert.getInvestigationNotes()).orElse("");
        alert.setInvestigationNotes(existingNotes.isEmpty() ? sarNote : existingNotes + "\n" + sarNote);

        alertRepository.save(alert);
        log.info("SAR {} filed for alert {}", sarId, alert.getAlertRef());
    }

    @Transactional(readOnly = true)
    public List<IslamicAmlAlertResponse> getOverdueAlerts() {
        return alertRepository.findOverdueAlerts().stream()
                .map(this::toAlertResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public IslamicAmlAlertStatistics getAlertStatistics() {
        log.debug("Alert statistics aggregated globally (no date filter). Consider adding period-based statistics for production.");

        long totalAlerts = alertRepository.count();
        long newCount = alertRepository.countByStatus(IslamicAmlAlertStatus.NEW);
        long underInvestigation = alertRepository.countByStatus(IslamicAmlAlertStatus.UNDER_INVESTIGATION);
        long escalated = alertRepository.countByStatus(IslamicAmlAlertStatus.ESCALATED);
        long sarFiledCount = alertRepository.countByStatus(IslamicAmlAlertStatus.SAR_FILED);
        long closedNoAction = alertRepository.countByStatus(IslamicAmlAlertStatus.CLOSED_NO_ACTION);
        long closedFalsePositive = alertRepository.countByStatus(IslamicAmlAlertStatus.CLOSED_FALSE_POSITIVE);
        long overdueCount = alertRepository.findOverdueAlerts().size();

        Map<String, Long> byTypology = new LinkedHashMap<>();
        for (IslamicAmlRuleCategory category : IslamicAmlRuleCategory.values()) {
            List<IslamicAmlRule> rules = ruleRepository.findByCategory(category);
            if (rules.isEmpty()) continue;
            long count = rules.stream()
                    .mapToLong(rule -> alertRepository.countByRuleCode(rule.getRuleCode()))
                    .sum();
            if (count > 0) {
                byTypology.put(category.name(), count);
            }
        }

        return IslamicAmlAlertStatistics.builder()
                .totalAlerts(totalAlerts)
                .newCount(newCount)
                .underInvestigation(underInvestigation)
                .escalated(escalated)
                .sarFiled(sarFiledCount)
                .closedNoAction(closedNoAction)
                .closedFalsePositive(closedFalsePositive)
                .overdueCount(overdueCount)
                .byTypology(byTypology)
                .build();
    }

    // ─────────────────────── Private helpers ───────────────────────

    private IslamicAmlAlert createAlert(IslamicAmlRule rule, Long customerId, String customerName,
                                        BigDecimal amount, String currencyCode, Map<String, Object> context,
                                        List<String> transactions, List<String> contracts) {

        String alertRef = "IAML-" + ALERT_SEQ.incrementAndGet();

        LocalDateTime now = LocalDateTime.now();
        long slaHours = computeSlaHours(rule.getAlertSeverity());

        IslamicAmlAlert alert = IslamicAmlAlert.builder()
                .alertRef(alertRef)
                .ruleId(rule.getId())
                .ruleCode(rule.getRuleCode())
                .detectionDate(now)
                .customerId(customerId)
                .customerName(customerName)
                .islamicContext(context)
                .involvedTransactions(transactions != null ? transactions : Collections.emptyList())
                .involvedContracts(contracts != null ? contracts : Collections.emptyList())
                .involvedAccounts(Collections.emptyList())
                .totalAmountInvolved(Optional.ofNullable(amount).orElse(BigDecimal.ZERO))
                .currencyCode(currencyCode)
                .riskScore(computeRiskScore(rule))
                .assessmentNotes("Auto-generated by rule " + rule.getRuleCode() + " (" + rule.getName() + ")")
                .status(IslamicAmlAlertStatus.NEW)
                .sarFiled(false)
                .slaBreach(false)
                .slaDeadline(now.plusHours(slaHours))
                .tenantId(tenantResolver.getCurrentTenantId())
                .build();

        IslamicAmlAlert saved = alertRepository.save(alert);
        log.info("Created AML alert {} for rule {} customer {}", saved.getAlertRef(), rule.getRuleCode(), customerId);
        log.warn("AUDIT: Islamic AML alert generated - ref={}, rule={}, customer={}, amount={}, actor={}",
                saved.getAlertRef(), rule.getRuleCode(), customerId, amount,
                actorProvider.getCurrentActor());
        return saved;
    }

    private boolean isRuleApplicableToContext(IslamicAmlRule rule, AmlMonitoringContext context) {
        List<String> productContext = rule.getIslamicProductContext();
        if (productContext == null || productContext.isEmpty()) {
            return true;
        }
        if (productContext.contains("ALL")) {
            return true;
        }
        if (context.getContractType() != null && productContext.contains(context.getContractType())) {
            return true;
        }
        if (context.getProductCode() != null && productContext.contains(context.getProductCode())) {
            return true;
        }
        return false;
    }

    private boolean evaluateRule(IslamicAmlRule rule, AmlMonitoringContext context) {
        return switch (rule.getDetectionMethod()) {
            case THRESHOLD -> evaluateThreshold(rule, context);
            case VELOCITY -> evaluateVelocity(rule, context);
            case PATTERN -> evaluatePattern(rule, context);
            case BEHAVIORAL -> evaluateBehavioral(rule, context);
            case NETWORK -> evaluateNetwork(rule, context);
            case COMPOSITE -> evaluateComposite(rule, context);
        };
    }

    private boolean evaluateThreshold(IslamicAmlRule rule, AmlMonitoringContext context) {
        BigDecimal amount = Optional.ofNullable(context.getAmount()).orElse(BigDecimal.ZERO);
        BigDecimal threshold = extractDecimalParam(rule.getRuleParameters(), "threshold", DEFAULT_THRESHOLD);
        return amount.compareTo(threshold) >= 0;
    }

    private boolean evaluateVelocity(IslamicAmlRule rule, AmlMonitoringContext context) {
        Long customerId = context.getCustomerId();
        if (customerId == null) return false;

        int velocityLimit = extractIntParam(rule.getRuleParameters(), "velocityLimit", DEFAULT_VELOCITY_LIMIT);
        LocalDate lookbackStart = LocalDate.now().minusDays(rule.getLookbackPeriodDays());

        // Count actual contracts initiated within the lookback period as transaction count
        List<MurabahaContract> contracts = murabahaContractRepository.findByCustomerId(customerId);
        long recentTransactionCount = contracts.stream()
                .filter(c -> c.getStartDate() != null && !c.getStartDate().isBefore(lookbackStart))
                .count();

        // Include the current transaction being evaluated (if not yet persisted)
        if (context.getTransactionRef() != null) {
            recentTransactionCount++;
        }

        return recentTransactionCount >= velocityLimit;
    }

    private boolean evaluatePattern(IslamicAmlRule rule, AmlMonitoringContext context) {
        // Pattern: check for round-tripping indicators
        Map<String, Object> params = rule.getRuleParameters();
        if (params == null) return false;

        String patternType = extractStringParam(params, "patternType", "ROUND_TRIPPING");

        if ("ROUND_TRIPPING".equals(patternType)) {
            // Check if same customer has multiple transactions in short timeframe
            Long customerId = context.getCustomerId();
            if (customerId == null) return false;

            List<MurabahaContract> contracts = murabahaContractRepository.findByCustomerId(customerId);
            List<MurabahaContract> commodityContracts = contracts.stream()
                    .filter(c -> c.getMurabahahType() == MurabahaDomainEnums.MurabahahType.COMMODITY_MURABAHA)
                    .filter(c -> c.getStartDate() != null
                            && !c.getStartDate().isBefore(LocalDate.now().minusDays(rule.getLookbackPeriodDays())))
                    .toList();

            return commodityContracts.size() >= rule.getMinimumOccurrences();
        }

        return false;
    }

    private boolean evaluateBehavioral(IslamicAmlRule rule, AmlMonitoringContext context) {
        // Behavioral: deviation from norm - simplified check against thresholds
        BigDecimal amount = Optional.ofNullable(context.getAmount()).orElse(BigDecimal.ZERO);
        BigDecimal normalMax = extractDecimalParam(rule.getRuleParameters(), "normalMaxAmount",
                new BigDecimal("100000"));
        BigDecimal deviationMultiplier = extractDecimalParam(rule.getRuleParameters(), "deviationMultiplier",
                new BigDecimal("3"));

        BigDecimal deviationThreshold = normalMax.multiply(deviationMultiplier);
        return amount.compareTo(deviationThreshold) >= 0;
    }

    private boolean evaluateNetwork(IslamicAmlRule rule, AmlMonitoringContext context) {
        // Network analysis: simplified - check for counterparty relationships via shared broker
        Long customerId = context.getCustomerId();
        if (customerId == null) return false;

        List<MurabahaContract> contracts = murabahaContractRepository.findByCustomerId(customerId);
        // Check if multiple contracts point to the same broker/supplier
        Map<String, Long> supplierCounts = contracts.stream()
                .filter(c -> c.getSupplierName() != null)
                .collect(Collectors.groupingBy(MurabahaContract::getSupplierName, Collectors.counting()));

        int minConnections = extractIntParam(rule.getRuleParameters(), "minNetworkConnections", 3);
        return supplierCounts.values().stream().anyMatch(count -> count >= minConnections);
    }

    private boolean evaluateComposite(IslamicAmlRule rule, AmlMonitoringContext context) {
        // Composite: combine threshold + velocity
        boolean thresholdTriggered = evaluateThreshold(rule, context);
        boolean velocityTriggered = evaluateVelocity(rule, context);
        return thresholdTriggered && velocityTriggered;
    }

    private boolean evaluateBatchRule(IslamicAmlRule rule, Long customerId,
                                      List<MurabahaContract> contracts, LocalDate analysisDate) {
        if (contracts.isEmpty()) return false;

        Map<String, Object> params = rule.getRuleParameters();
        int lookbackDays = extractIntParam(params, "lookbackPeriodDays", rule.getLookbackPeriodDays());
        int minOccurrences = extractIntParam(params, "minimumOccurrences", rule.getMinimumOccurrences());

        return switch (rule.getDetectionMethod()) {
            case PATTERN -> {
                // Filter contracts within the configurable lookback window
                int rapidTimingDays = extractIntParam(params, "rapidTimingDays", RAPID_TIMING_DAYS);
                List<MurabahaContract> recentContracts = contracts.stream()
                        .filter(c -> c.getStartDate() != null
                                && !c.getStartDate().isBefore(analysisDate.minusDays(lookbackDays)))
                        .sorted((a, b) -> a.getStartDate().compareTo(b.getStartDate()))
                        .toList();

                if (recentContracts.size() < minOccurrences) {
                    yield false;
                }

                // Check for suspicious timing: multiple contracts initiated within rapidTimingDays
                int suspiciousTimingCount = 0;
                for (int i = 1; i < recentContracts.size(); i++) {
                    LocalDate prevStart = recentContracts.get(i - 1).getStartDate();
                    LocalDate currStart = recentContracts.get(i).getStartDate();
                    long daysBetween = ChronoUnit.DAYS.between(prevStart, currStart);
                    if (daysBetween >= 0 && daysBetween <= rapidTimingDays) {
                        suspiciousTimingCount++;
                    }
                }

                yield suspiciousTimingCount >= Math.max(1, minOccurrences - 1);
            }
            case NETWORK -> {
                // Check if same broker/supplier appears across multiple contracts
                int minConnections = extractIntParam(params, "minNetworkConnections", 3);
                Map<String, Long> supplierCounts = contracts.stream()
                        .filter(c -> c.getSupplierName() != null)
                        .collect(Collectors.groupingBy(MurabahaContract::getSupplierName, Collectors.counting()));

                boolean sharedSupplier = supplierCounts.values().stream()
                        .anyMatch(count -> count >= minConnections);

                if (sharedSupplier) {
                    yield true;
                }

                // Additionally check if same broker appears via commodity trades
                Map<String, Set<Long>> brokerToContracts = new HashMap<>();
                for (MurabahaContract contract : contracts) {
                    commodityMurabahaTradeRepository.findByContractId(contract.getId()).ifPresent(trade -> {
                        if (trade.getPurchaseBrokerName() != null) {
                            brokerToContracts.computeIfAbsent(trade.getPurchaseBrokerName(), k -> new java.util.HashSet<>())
                                    .add(contract.getId());
                        }
                    });
                }
                yield brokerToContracts.values().stream()
                        .anyMatch(contractIds -> contractIds.size() >= minConnections);
            }
            case BEHAVIORAL -> {
                // Compare current period activity against historical average
                int expectedMonthlyRate = extractIntParam(params, "expectedMonthlyRate", 2);
                BigDecimal normalMaxExposure = extractDecimalParam(params, "normalMaxExposure",
                        new BigDecimal("500000"));

                // Count contracts in the recent lookback period
                List<MurabahaContract> recentContracts = contracts.stream()
                        .filter(c -> c.getStartDate() != null
                                && !c.getStartDate().isBefore(analysisDate.minusDays(lookbackDays)))
                        .toList();

                double monthsInLookback = Math.max(1.0, lookbackDays / 30.0);
                double currentMonthlyRate = recentContracts.size() / monthsInLookback;

                // Flag if current rate exceeds 2x the expected monthly rate
                boolean velocityAnomaly = currentMonthlyRate > (expectedMonthlyRate * 2.0);

                // Also check total exposure
                BigDecimal totalExposure = recentContracts.stream()
                        .map(MurabahaContract::getFinancedAmount)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                boolean exposureAnomaly = totalExposure.compareTo(normalMaxExposure) > 0;

                yield velocityAnomaly || exposureAnomaly;
            }
            case COMPOSITE -> {
                BigDecimal totalExposure = contracts.stream()
                        .map(MurabahaContract::getFinancedAmount)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal threshold = extractDecimalParam(params, "threshold", DEFAULT_THRESHOLD);
                long recentCount = contracts.stream()
                        .filter(c -> c.getStartDate() != null
                                && !c.getStartDate().isBefore(analysisDate.minusDays(lookbackDays)))
                        .count();
                int velocityLimit = extractIntParam(params, "velocityLimit", DEFAULT_VELOCITY_LIMIT);
                yield totalExposure.compareTo(threshold) >= 0 && recentCount >= velocityLimit;
            }
            case THRESHOLD -> {
                BigDecimal totalExposure = contracts.stream()
                        .map(MurabahaContract::getFinancedAmount)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal threshold = extractDecimalParam(params, "threshold", DEFAULT_THRESHOLD);
                yield totalExposure.compareTo(threshold) >= 0;
            }
            case VELOCITY -> {
                List<MurabahaContract> recentContracts = contracts.stream()
                        .filter(c -> c.getStartDate() != null
                                && !c.getStartDate().isBefore(analysisDate.minusDays(lookbackDays)))
                        .toList();
                int velocityLimit = extractIntParam(params, "velocityLimit", DEFAULT_VELOCITY_LIMIT);
                yield recentContracts.size() >= velocityLimit;
            }
        };
    }

    private Specification<IslamicAmlAlert> buildSpecification(IslamicAmlAlertCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (criteria.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"),
                        IslamicAmlAlertStatus.valueOf(criteria.getStatus())));
            }
            if (criteria.getRuleCode() != null) {
                predicates.add(cb.equal(root.get("ruleCode"), criteria.getRuleCode()));
            }
            if (criteria.getCustomerId() != null) {
                predicates.add(cb.equal(root.get("customerId"), criteria.getCustomerId()));
            }
            if (criteria.getDateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("detectionDate"),
                        criteria.getDateFrom().atStartOfDay()));
            }
            if (criteria.getDateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("detectionDate"),
                        criteria.getDateTo().plusDays(1).atStartOfDay()));
            }
            if (criteria.getSeverity() != null) {
                // Join to rule table through ruleCode to filter by severity
                // Simplified: filter alerts whose ruleCode matches rules with the given severity
                List<String> matchingRuleCodes = ruleRepository.findByEnabledTrueOrderByPriorityAsc().stream()
                        .filter(r -> criteria.getSeverity().equalsIgnoreCase(r.getAlertSeverity()))
                        .map(IslamicAmlRule::getRuleCode)
                        .toList();
                if (!matchingRuleCodes.isEmpty()) {
                    predicates.add(root.get("ruleCode").in(matchingRuleCodes));
                } else {
                    predicates.add(cb.disjunction());
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private void validateNotClosed(IslamicAmlAlert alert, String action) {
        if (alert.getStatus() == IslamicAmlAlertStatus.CLOSED_NO_ACTION
                || alert.getStatus() == IslamicAmlAlertStatus.CLOSED_FALSE_POSITIVE) {
            throw new BusinessException(
                    "Cannot " + action + " alert " + alert.getAlertRef() + ": alert is already closed",
                    "ALERT_ALREADY_CLOSED");
        }
    }

    private long computeSlaHours(String severity) {
        if (severity == null) return 72;
        return switch (severity.toUpperCase()) {
            case "CRITICAL" -> 4;
            case "HIGH" -> 24;
            case "MEDIUM" -> 72;
            case "LOW" -> 168;
            default -> 72;
        };
    }

    private BigDecimal computeRiskScore(IslamicAmlRule rule) {
        BigDecimal baseScore = switch (rule.getAlertSeverity() != null ? rule.getAlertSeverity().toUpperCase() : "MEDIUM") {
            case "CRITICAL" -> new BigDecimal("90");
            case "HIGH" -> new BigDecimal("70");
            case "MEDIUM" -> new BigDecimal("50");
            case "LOW" -> new BigDecimal("30");
            default -> new BigDecimal("50");
        };

        // Adjust by priority (lower priority number = higher risk adjustment)
        BigDecimal priorityAdjustment = BigDecimal.valueOf(Math.max(0, 10 - (rule.getPriority() / 10)));
        return baseScore.add(priorityAdjustment).min(new BigDecimal("100")).setScale(4, RoundingMode.HALF_UP);
    }

    private int extractIntParam(Map<String, Object> params, String key, int defaultValue) {
        if (params == null || !params.containsKey(key)) return defaultValue;
        Object val = params.get(key);
        if (val instanceof Number num) return num.intValue();
        try {
            return Integer.parseInt(val.toString());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private BigDecimal extractDecimalParam(Map<String, Object> params, String key, BigDecimal defaultValue) {
        if (params == null || !params.containsKey(key)) return defaultValue;
        Object val = params.get(key);
        if (val instanceof Number num) return BigDecimal.valueOf(num.doubleValue());
        try {
            return new BigDecimal(val.toString());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private String extractStringParam(Map<String, Object> params, String key, String defaultValue) {
        if (params == null || !params.containsKey(key)) return defaultValue;
        Object val = params.get(key);
        return val != null ? val.toString() : defaultValue;
    }

    private IslamicAmlRule buildFallbackTawarruqRule(String suffix) {
        return IslamicAmlRule.builder()
                .id(0L)
                .ruleCode("TAWARRUQ_FALLBACK_" + suffix)
                .name("Tawarruq Abuse Detection - " + suffix)
                .category(IslamicAmlRuleCategory.TAWARRUQ_ABUSE)
                .detectionMethod(DetectionMethod.PATTERN)
                .alertSeverity("HIGH")
                .alertAction(AmlAlertAction.GENERATE_ALERT)
                .escalationLevel(EscalationLevel.COMPLIANCE_OFFICER)
                .enabled(true)
                .priority(50)
                .lookbackPeriodDays(90)
                .minimumOccurrences(1)
                .build();
    }

    private IslamicAmlRule buildFallbackPoolRule() {
        return IslamicAmlRule.builder()
                .id(0L)
                .ruleCode("POOL_LAYERING_FALLBACK")
                .name("Pool Layering Detection")
                .category(IslamicAmlRuleCategory.POOL_LAYERING)
                .detectionMethod(DetectionMethod.PATTERN)
                .alertSeverity("HIGH")
                .alertAction(AmlAlertAction.GENERATE_ALERT)
                .escalationLevel(EscalationLevel.SENIOR_COMPLIANCE)
                .enabled(true)
                .priority(50)
                .lookbackPeriodDays(90)
                .minimumOccurrences(1)
                .build();
    }

    private IslamicAmlAlertResponse toAlertResponse(IslamicAmlAlert a) {
        return IslamicAmlAlertResponse.builder()
                .id(a.getId())
                .baseAlertId(a.getBaseAlertId())
                .alertRef(a.getAlertRef())
                .ruleId(a.getRuleId())
                .ruleCode(a.getRuleCode())
                .detectionDate(a.getDetectionDate())
                .customerId(a.getCustomerId())
                .customerName(a.getCustomerName())
                .islamicContext(a.getIslamicContext())
                .involvedTransactions(a.getInvolvedTransactions())
                .involvedContracts(a.getInvolvedContracts())
                .involvedAccounts(a.getInvolvedAccounts())
                .totalAmountInvolved(Optional.ofNullable(a.getTotalAmountInvolved()).orElse(BigDecimal.ZERO))
                .currencyCode(a.getCurrencyCode())
                .riskScore(Optional.ofNullable(a.getRiskScore()).orElse(BigDecimal.ZERO))
                .assessmentNotes(a.getAssessmentNotes())
                .status(a.getStatus())
                .assignedTo(a.getAssignedTo())
                .assignedAt(a.getAssignedAt())
                .investigatedBy(a.getInvestigatedBy())
                .investigationNotes(a.getInvestigationNotes())
                .sarFiled(a.isSarFiled())
                .sarReference(a.getSarReference())
                .closedBy(a.getClosedBy())
                .closedAt(a.getClosedAt())
                .closureReason(a.getClosureReason())
                .slaDeadline(a.getSlaDeadline())
                .slaBreach(a.isSlaBreach())
                .tenantId(a.getTenantId())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .createdBy(a.getCreatedBy())
                .updatedBy(a.getUpdatedBy())
                .build();
    }

    private IslamicAmlRuleResponse toRuleResponse(IslamicAmlRule r) {
        return IslamicAmlRuleResponse.builder()
                .id(r.getId())
                .baseAmlRuleId(r.getBaseAmlRuleId())
                .ruleCode(r.getRuleCode())
                .name(r.getName())
                .description(r.getDescription())
                .category(r.getCategory())
                .islamicProductContext(r.getIslamicProductContext())
                .detectionMethod(r.getDetectionMethod())
                .ruleParameters(r.getRuleParameters())
                .lookbackPeriodDays(r.getLookbackPeriodDays())
                .minimumOccurrences(r.getMinimumOccurrences())
                .alertSeverity(r.getAlertSeverity())
                .alertAction(r.getAlertAction())
                .escalationLevel(r.getEscalationLevel())
                .fatfTypology(r.getFatfTypology())
                .gccGuidelineRef(r.getGccGuidelineRef())
                .enabled(r.isEnabled())
                .effectiveFrom(r.getEffectiveFrom())
                .priority(r.getPriority())
                .tenantId(r.getTenantId())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .createdBy(r.getCreatedBy())
                .updatedBy(r.getUpdatedBy())
                .build();
    }
}
