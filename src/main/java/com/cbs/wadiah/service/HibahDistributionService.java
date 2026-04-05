package com.cbs.wadiah.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.mudarabah.entity.RiskLevel;
import com.cbs.rulesengine.dto.DecisionResultResponse;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import com.cbs.notification.entity.NotificationChannel;
import com.cbs.notification.service.NotificationService;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.cbs.wadiah.dto.CreateHibahBatchRequest;
import com.cbs.wadiah.dto.CreateHibahPolicyRequest;
import com.cbs.wadiah.dto.HibahDashboard;
import com.cbs.wadiah.dto.HibahPatternAnalysis;
import com.cbs.wadiah.entity.HibahDistributionBatch;
import com.cbs.wadiah.entity.HibahDistributionItem;
import com.cbs.wadiah.entity.HibahPolicy;
import com.cbs.wadiah.entity.WadiahAccount;
import com.cbs.wadiah.entity.WadiahDomainEnums;
import com.cbs.wadiah.repository.HibahDistributionBatchRepository;
import com.cbs.wadiah.repository.HibahDistributionItemRepository;
import com.cbs.wadiah.repository.HibahPolicyRepository;
import com.cbs.wadiah.repository.WadiahAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class HibahDistributionService {

    private static final AtomicLong BATCH_SEQ = new AtomicLong(System.currentTimeMillis() % 100000);

    private final HibahPolicyRepository hibahPolicyRepository;
    private final HibahDistributionBatchRepository hibahDistributionBatchRepository;
    private final HibahDistributionItemRepository hibahDistributionItemRepository;
    private final WadiahAccountRepository wadiahAccountRepository;
    private final TransactionJournalRepository transactionJournalRepository;
    private final AccountPostingService accountPostingService;
    private final DecisionTableEvaluator decisionTableEvaluator;
    private final NotificationService notificationService;
    private final CurrentTenantResolver currentTenantResolver;

    public HibahPolicy createPolicy(CreateHibahPolicyRequest request) {
        HibahPolicy policy = HibahPolicy.builder()
                .policyCode(request.getPolicyCode())
                .name(request.getName())
                .nameAr(request.getNameAr())
                .description(request.getDescription())
                .minimumBalanceForEligibility(defaultAmount(request.getMinimumBalanceForEligibility()))
                .minimumDaysActive(request.getMinimumDaysActive() != null ? request.getMinimumDaysActive() : 0)
                .excludeDormantAccounts(request.getExcludeDormantAccounts() != null ? request.getExcludeDormantAccounts() : true)
                .excludeBlockedAccounts(request.getExcludeBlockedAccounts() != null ? request.getExcludeBlockedAccounts() : true)
                .maximumDistributionsPerYear(request.getMaximumDistributionsPerYear() != null ? request.getMaximumDistributionsPerYear() : 4)
                .minimumDaysBetweenDistributions(request.getMinimumDaysBetweenDistributions() != null ? request.getMinimumDaysBetweenDistributions() : 60)
                .maximumHibahRatePerAnnum(request.getMaximumHibahRatePerAnnum())
                .variabilityRequirement(request.getVariabilityRequirement() != null
                        ? request.getVariabilityRequirement()
                        : WadiahDomainEnums.HibahVariabilityRequirement.MANDATORY_VARIATION)
                .maximumConsecutiveSameRate(request.getMaximumConsecutiveSameRate() != null ? request.getMaximumConsecutiveSameRate() : 2)
                .maximumTotalDistributionPerPeriod(request.getMaximumTotalDistributionPerPeriod())
                .fundingSourceGl(StringUtils.hasText(request.getFundingSourceGl()) ? request.getFundingSourceGl() : "6100-HIB-001")
                .fatwaId(request.getFatwaId())
                .approvalRequired(request.getApprovalRequired() != null ? request.getApprovalRequired() : true)
                .ssbReviewFrequency(request.getSsbReviewFrequency() != null
                        ? request.getSsbReviewFrequency()
                        : WadiahDomainEnums.SsbReviewFrequency.QUARTERLY)
                .lastSsbReview(request.getLastSsbReview())
                .nextSsbReview(request.getNextSsbReview())
                .status(WadiahDomainEnums.HibahPolicyStatus.ACTIVE)
                .tenantId(currentTenantResolver.getCurrentTenantId())
                .build();
        return hibahPolicyRepository.save(policy);
    }

    public HibahPolicy updatePolicy(Long policyId, CreateHibahPolicyRequest request) {
        HibahPolicy policy = hibahPolicyRepository.findById(policyId)
                .orElseThrow(() -> new ResourceNotFoundException("HibahPolicy", "id", policyId));

        if (StringUtils.hasText(request.getName())) policy.setName(request.getName());
        if (request.getNameAr() != null) policy.setNameAr(request.getNameAr());
        if (request.getDescription() != null) policy.setDescription(request.getDescription());
        if (request.getMinimumBalanceForEligibility() != null) policy.setMinimumBalanceForEligibility(request.getMinimumBalanceForEligibility());
        if (request.getMinimumDaysActive() != null) policy.setMinimumDaysActive(request.getMinimumDaysActive());
        if (request.getExcludeDormantAccounts() != null) policy.setExcludeDormantAccounts(request.getExcludeDormantAccounts());
        if (request.getExcludeBlockedAccounts() != null) policy.setExcludeBlockedAccounts(request.getExcludeBlockedAccounts());
        if (request.getMaximumDistributionsPerYear() != null) policy.setMaximumDistributionsPerYear(request.getMaximumDistributionsPerYear());
        if (request.getMinimumDaysBetweenDistributions() != null) policy.setMinimumDaysBetweenDistributions(request.getMinimumDaysBetweenDistributions());
        if (request.getMaximumHibahRatePerAnnum() != null) policy.setMaximumHibahRatePerAnnum(request.getMaximumHibahRatePerAnnum());
        if (request.getVariabilityRequirement() != null) policy.setVariabilityRequirement(request.getVariabilityRequirement());
        if (request.getMaximumConsecutiveSameRate() != null) policy.setMaximumConsecutiveSameRate(request.getMaximumConsecutiveSameRate());
        if (request.getMaximumTotalDistributionPerPeriod() != null) policy.setMaximumTotalDistributionPerPeriod(request.getMaximumTotalDistributionPerPeriod());
        if (StringUtils.hasText(request.getFundingSourceGl())) policy.setFundingSourceGl(request.getFundingSourceGl());
        if (request.getFatwaId() != null) policy.setFatwaId(request.getFatwaId());
        if (request.getApprovalRequired() != null) policy.setApprovalRequired(request.getApprovalRequired());
        if (request.getSsbReviewFrequency() != null) policy.setSsbReviewFrequency(request.getSsbReviewFrequency());
        if (request.getLastSsbReview() != null) policy.setLastSsbReview(request.getLastSsbReview());
        if (request.getNextSsbReview() != null) policy.setNextSsbReview(request.getNextSsbReview());
        return hibahPolicyRepository.save(policy);
    }

    @Transactional(readOnly = true)
    public HibahPolicy getActivePolicy() {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        return hibahPolicyRepository.findFirstByStatusAndTenantIdOrderByCreatedAtDesc(
                        WadiahDomainEnums.HibahPolicyStatus.ACTIVE, tenantId)
                .orElseGet(() -> hibahPolicyRepository.findAll().stream()
                        .filter(item -> item.getStatus() == WadiahDomainEnums.HibahPolicyStatus.ACTIVE)
                        .max(Comparator.comparing(HibahPolicy::getCreatedAt))
                        .orElseThrow(() -> new ResourceNotFoundException("HibahPolicy", "status", "ACTIVE")));
    }

    @Transactional(readOnly = true)
    public List<HibahPolicy> getPolicies() {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        List<HibahPolicy> tenantPolicies = hibahPolicyRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        return tenantPolicies.isEmpty() ? hibahPolicyRepository.findAll() : tenantPolicies;
    }

    public HibahDistributionBatch createDistributionBatch(CreateHibahBatchRequest request) {
        HibahPolicy policy = getActivePolicy();
        validateBatchTiming(policy, request.getDistributionDate());

        Long tenantId = currentTenantResolver.getCurrentTenantId();
        List<HibahDistributionBatch> recentCompleted = batchesForTenant(tenantId).stream()
                .filter(item -> item.getStatus() == WadiahDomainEnums.HibahBatchStatus.COMPLETED)
                .sorted(Comparator.comparing(HibahDistributionBatch::getDistributionDate).reversed())
                .toList();

        String batchCurrency = StringUtils.hasText(request.getCurrencyCode())
                ? request.getCurrencyCode()
                : null;
        List<WadiahAccount> eligibleAccounts = wadiahAccountRepository.findHibahEligibleAccounts(tenantId).stream()
                .filter(item -> isEligible(policy, item, request.getPeriodFrom(), request.getPeriodTo()))
                .filter(item -> batchCurrency == null
                        || batchCurrency.equalsIgnoreCase(item.getAccount().getCurrencyCode()))
                .toList();
        if (eligibleAccounts.isEmpty()) {
            throw new BusinessException("No eligible Wadiah accounts found for Hibah distribution",
                    "NO_ELIGIBLE_HIBAH_ACCOUNTS");
        }

        List<HibahDistributionItem> items = buildDistributionItems(policy, request, eligibleAccounts);
        BigDecimal totalAmount = items.stream()
                .filter(item -> item.getStatus() == WadiahDomainEnums.HibahItemStatus.PENDING)
                .map(HibahDistributionItem::getHibahAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal averageRate = computeAverageRate(items);
        HibahPatternAnalysis projectedAnalysis = analyzeProjectedHibahPatterns(
            tenantId,
            request.getDistributionDate(),
            averageRate);

        validateDistributionCaps(policy, totalAmount, averageRate);
        validateVariability(policy, recentCompleted, averageRate);
        validateProjectedSystematicControls(policy, projectedAnalysis);

        String batchNotes = enrichBatchNotes(request.getNotes(), projectedAnalysis);

        HibahDistributionBatch batch = hibahDistributionBatchRepository.save(HibahDistributionBatch.builder()
                .policyId(policy.getId())
                .batchRef(generateBatchReference(request.getDistributionDate()))
                .distributionDate(request.getDistributionDate())
                .periodFrom(request.getPeriodFrom())
                .periodTo(request.getPeriodTo())
                .totalDistributionAmount(totalAmount)
                .accountCount((int) items.stream().filter(item -> item.getStatus() == WadiahDomainEnums.HibahItemStatus.PENDING).count())
                .averageHibahRate(averageRate)
                .distributionMethod(request.getDistributionMethod())
                .decisionTableCode(request.getDecisionTableCode())
                .fundingSource(request.getFundingSource())
                .fundingSourceGl(policy.getFundingSourceGl())
                .status(WadiahDomainEnums.HibahBatchStatus.DRAFT)
                .notes(batchNotes)
                .tenantId(tenantId)
                .build());

        hibahDistributionItemRepository.saveAll(items.stream()
                .map(item -> {
                    item.setBatchId(batch.getId());
                    return item;
                })
                .toList());
        return batch;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> previewBatch(Long batchId) {
        HibahDistributionBatch batch = getBatch(batchId);
        return Map.of(
                "batch", batch,
                "items", hibahDistributionItemRepository.findByBatchIdOrderByIdAsc(batchId)
        );
    }

    public void submitBatchForApproval(Long batchId) {
        HibahDistributionBatch batch = getBatch(batchId);
        batch.setStatus(WadiahDomainEnums.HibahBatchStatus.PENDING_APPROVAL);
        hibahDistributionBatchRepository.save(batch);
    }

    public void approveBatch(Long batchId, String approvedBy) {
        HibahDistributionBatch batch = getBatch(batchId);
        if (batch.getStatus() != WadiahDomainEnums.HibahBatchStatus.PENDING_APPROVAL
                && batch.getStatus() != WadiahDomainEnums.HibahBatchStatus.DRAFT) {
            throw new BusinessException("Only draft or pending batches can be approved", "INVALID_BATCH_STATUS");
        }
        if (StringUtils.hasText(batch.getCreatedBy())
                && batch.getCreatedBy().equalsIgnoreCase(approvedBy)) {
            throw new BusinessException(
                    "Four-eyes principle violated: batch approver must differ from the batch creator",
                    "FOUR_EYES_VIOLATION");
        }
        batch.setStatus(WadiahDomainEnums.HibahBatchStatus.APPROVED);
        batch.setApprovedBy(approvedBy);
        batch.setApprovedAt(LocalDateTime.now());
        hibahDistributionBatchRepository.save(batch);
    }

    public void processBatch(Long batchId, String processedBy) {
        HibahDistributionBatch batch = getBatch(batchId);
        HibahPolicy policy = batch.getPolicyId() != null
                ? hibahPolicyRepository.findById(batch.getPolicyId()).orElse(null)
                : null;
        HibahPatternAnalysis projectedAnalysis = analyzeProjectedHibahPatterns(
            batch.getTenantId(),
            batch.getDistributionDate(),
            defaultAmount(batch.getAverageHibahRate()));

        // Idempotency guard: only APPROVED batches (or low-risk DRAFT with no approval required) can be processed
        boolean isApprovedForProcessing = batch.getStatus() == WadiahDomainEnums.HibahBatchStatus.APPROVED
            || (policy != null
                && !Boolean.TRUE.equals(policy.getApprovalRequired())
                && projectedAnalysis.getSystematicRisk() == RiskLevel.LOW
                && batch.getStatus() == WadiahDomainEnums.HibahBatchStatus.DRAFT);

        if (!isApprovedForProcessing) {
            throw new BusinessException("HIBAH-BATCH-001",
                    "Batch is not in APPROVED status, current: " + batch.getStatus());
        }

        // Compare-and-set: transition to PROCESSING atomically to prevent concurrent execution
        batch.setStatus(WadiahDomainEnums.HibahBatchStatus.PROCESSING);
        batch = hibahDistributionBatchRepository.saveAndFlush(batch);
        if (StringUtils.hasText(batch.getApprovedBy())
                && batch.getApprovedBy().equalsIgnoreCase(processedBy)) {
            throw new BusinessException(
                    "Four-eyes principle violated: batch processor must differ from the batch approver",
                    "FOUR_EYES_VIOLATION");
        }

        enforcePreCreditControls(batch, policy, projectedAnalysis);

        List<HibahDistributionItem> items = hibahDistributionItemRepository.findByBatchIdOrderByIdAsc(batchId);
        int journalEntries = 0;
        for (HibahDistributionItem item : items) {
            if (item.getStatus() != WadiahDomainEnums.HibahItemStatus.PENDING) {
                continue;
            }
            WadiahAccount wadiahAccount = wadiahAccountRepository.findById(item.getWadiahAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("WadiahAccount", "id", item.getWadiahAccountId()));
            Account account = wadiahAccount.getAccount();

            TransactionJournal journal = accountPostingService.postCreditAgainstGl(
                    account,
                    TransactionType.CREDIT,
                    item.getHibahAmount(),
                    "Hibah (Gift)",
                    TransactionChannel.SYSTEM,
                    batch.getBatchRef() + ":" + item.getAccountId(),
                    batch.getFundingSourceGl(),
                    "HIBAH",
                    batch.getBatchRef()
            );
            item.setStatus(WadiahDomainEnums.HibahItemStatus.CREDITED);
            item.setTransactionRef(journal.getTransactionRef());
            item.setCreditedAt(LocalDateTime.now());
            hibahDistributionItemRepository.save(item);

            wadiahAccount.setLastHibahDistributionDate(batch.getDistributionDate());
            wadiahAccount.setTotalHibahReceived(defaultAmount(wadiahAccount.getTotalHibahReceived()).add(item.getHibahAmount()));
            wadiahAccountRepository.save(wadiahAccount);
            journalEntries++;
        }

        batch.setStatus(WadiahDomainEnums.HibahBatchStatus.COMPLETED);
        batch.setProcessedAt(LocalDateTime.now());
        batch.setProcessedBy(processedBy);
        batch.setTotalJournalEntries(journalEntries);
        batch.setJournalBatchRef(batch.getBatchRef());
        // Send Shariah board notification and set flag based on actual delivery success
        boolean notified = notifyShariahBoard(batch);
        batch.setShariahBoardNotified(Boolean.TRUE.equals(batch.getShariahBoardNotified()) || notified);
        hibahDistributionBatchRepository.save(batch);

        HibahPatternAnalysis analysis = analyzeHibahPatterns(batch.getTenantId());
        if (analysis.getSystematicRisk() == RiskLevel.HIGH) {
            items.stream()
                    .filter(item -> item.getStatus() == WadiahDomainEnums.HibahItemStatus.CREDITED)
                    .forEach(item -> flagSystematicHibahWarning(item.getAccountId()));
        }
    }

    public void cancelBatch(Long batchId, String reason) {
        HibahDistributionBatch batch = getBatch(batchId);
        batch.setStatus(WadiahDomainEnums.HibahBatchStatus.CANCELLED);
        batch.setNotes(appendReason(batch.getNotes(), reason));
        hibahDistributionBatchRepository.save(batch);
    }

    @Transactional(readOnly = true)
    public HibahPatternAnalysis analyzeHibahPatterns(Long tenantId) {
        LocalDate cutoff = LocalDate.now().minusMonths(12);
        List<HibahDistributionBatch> batches = batchesForTenant(tenantId).stream()
                .filter(item -> item.getStatus() == WadiahDomainEnums.HibahBatchStatus.COMPLETED)
                .filter(item -> !item.getDistributionDate().isBefore(cutoff))
                .sorted(Comparator.comparing(HibahDistributionBatch::getDistributionDate))
                .toList();

        List<String> alerts = new ArrayList<>();
        if (batches.isEmpty()) {
            return HibahPatternAnalysis.builder()
                    .distributionsInLast12Months(0)
                    .averageRate(BigDecimal.ZERO)
                    .rateStandardDeviation(BigDecimal.ZERO)
                    .rateCoefficientOfVariation(BigDecimal.ZERO)
                    .frequencyRegular(false)
                    .rateStable(false)
                    .systematicRisk(RiskLevel.LOW)
                    .alerts(alerts)
                    .build();
        }

        List<BigDecimal> rates = batches.stream()
                .map(item -> defaultAmount(item.getAverageHibahRate()))
                .toList();
        BigDecimal averageRate = average(rates);
        BigDecimal stdDev = standardDeviation(rates, averageRate);
        BigDecimal coefficient = averageRate.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : stdDev.divide(averageRate, 4, RoundingMode.HALF_UP);

        List<Long> intervals = new ArrayList<>();
        for (int i = 1; i < batches.size(); i++) {
            intervals.add(ChronoUnit.DAYS.between(
                    batches.get(i - 1).getDistributionDate(),
                    batches.get(i).getDistributionDate()
            ));
        }
        boolean frequencyRegular = intervals.size() >= 2 && intervalStandardDeviation(intervals) <= 5;
        boolean rateStable = batches.size() >= 3 && coefficient.compareTo(new BigDecimal("0.1000")) < 0;

        if (frequencyRegular) {
            alerts.add("Distributions have occurred at near-regular intervals over the last 12 months");
        }
        if (rateStable) {
            alerts.add("Recent Hibah rates show low variation and may create return expectations");
        }
        if (batches.size() >= 4 && recentRatesTooSimilar(rates)) {
            alerts.add("Last 4 completed batches used very similar effective Hibah rates");
        }

        RiskLevel riskLevel = RiskLevel.LOW;
        if (frequencyRegular || rateStable) {
            riskLevel = RiskLevel.MEDIUM;
        }
        if (frequencyRegular && rateStable) {
            riskLevel = RiskLevel.HIGH;
        }

        return HibahPatternAnalysis.builder()
                .distributionsInLast12Months(batches.size())
                .averageRate(averageRate)
                .rateStandardDeviation(stdDev)
                .rateCoefficientOfVariation(coefficient)
                .frequencyRegular(frequencyRegular)
                .rateStable(rateStable)
                .systematicRisk(riskLevel)
                .alerts(alerts)
                .build();
    }

    public void flagSystematicHibahWarning(Long accountId) {
        WadiahAccount wadiahAccount = wadiahAccountRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("WadiahAccount", "accountId", accountId));
        wadiahAccount.setHibahFrequencyWarning(true);
        wadiahAccountRepository.save(wadiahAccount);
    }

    @Transactional(readOnly = true)
    public List<WadiahAccount> getAccountsWithHibahWarning() {
        return wadiahAccountRepository.findByHibahFrequencyWarningTrue();
    }

    @Transactional(readOnly = true)
    public List<HibahDistributionBatch> getDistributionHistory(LocalDate from, LocalDate to) {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        LocalDate start = from != null ? from : LocalDate.now().minusYears(1);
        LocalDate end = to != null ? to : LocalDate.now();
        List<HibahDistributionBatch> tenantHistory = hibahDistributionBatchRepository
                .findByTenantIdAndDistributionDateBetweenOrderByDistributionDateDesc(tenantId, start, end);
        if (!tenantHistory.isEmpty()) {
            return tenantHistory;
        }
        return hibahDistributionBatchRepository.findAll().stream()
                .filter(item -> !item.getDistributionDate().isBefore(start) && !item.getDistributionDate().isAfter(end))
                .sorted(Comparator.comparing(HibahDistributionBatch::getDistributionDate).reversed())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<HibahDistributionItem> getAccountHibahHistory(Long accountId) {
        return hibahDistributionItemRepository.findByAccountIdOrderByCreatedAtDesc(accountId);
    }

    @Transactional(readOnly = true)
    public HibahDashboard getHibahDashboard() {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        LocalDate startOfYear = LocalDate.now().withDayOfYear(1);
        List<HibahDistributionBatch> history = getDistributionHistory(startOfYear, LocalDate.now()).stream()
                .filter(item -> item.getStatus() == WadiahDomainEnums.HibahBatchStatus.COMPLETED)
                .toList();
        BigDecimal totalDistributed = history.stream()
                .map(HibahDistributionBatch::getTotalDistributionAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        LocalDate lastDistributionDate = history.stream()
                .map(HibahDistributionBatch::getDistributionDate)
                .max(LocalDate::compareTo)
                .orElse(null);
        BigDecimal averageRate = history.isEmpty()
                ? BigDecimal.ZERO
                : history.stream()
                .map(item -> defaultAmount(item.getAverageHibahRate()))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(history.size()), 4, RoundingMode.HALF_UP);

        HibahPatternAnalysis analysis = analyzeHibahPatterns(tenantId);
        return HibahDashboard.builder()
                .totalDistributedYtd(totalDistributed.setScale(2, RoundingMode.HALF_UP))
                .lastDistributionDate(lastDistributionDate)
                .averageRate(averageRate)
                .eligibleAccountCount(wadiahAccountRepository.findHibahEligibleAccounts(tenantId).size())
                .patternAlerts(analysis.getAlerts())
                .build();
    }

    private boolean notifyShariahBoard(HibahDistributionBatch batch) {
        try {
            String subject = "Hibah Distribution Batch Completed - " + batch.getBatchRef();
            String body = "Hibah distribution batch " + batch.getBatchRef()
                    + " has been processed. Total amount: " + batch.getTotalDistributionAmount()
                    + ", accounts: " + batch.getAccountCount()
                    + ", average rate: " + batch.getAverageHibahRate()
                    + ", distribution date: " + batch.getDistributionDate();
            notificationService.sendDirect(
                    NotificationChannel.EMAIL,
                    "shariah-board@cbs.internal",
                    "Shariah Supervisory Board",
                    subject,
                    body,
                    null,
                    "HIBAH_DISTRIBUTION"
            );
            log.info("Shariah board notification sent for batch: {}", batch.getBatchRef());
            return true;
        } catch (Exception e) {
            log.error("Failed to notify Shariah board for batch: {}", batch.getBatchRef(), e);
            return false;
        }
    }

    private HibahDistributionBatch getBatch(Long batchId) {
        return hibahDistributionBatchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("HibahDistributionBatch", "id", batchId));
    }

    private List<HibahDistributionBatch> batchesForTenant(Long tenantId) {
        List<HibahDistributionBatch> tenantBatches = tenantId != null
                ? hibahDistributionBatchRepository.findByTenantIdOrderByDistributionDateDesc(tenantId)
                : List.of();
        return tenantBatches.isEmpty()
                ? hibahDistributionBatchRepository.findAll().stream()
                .sorted(Comparator.comparing(HibahDistributionBatch::getDistributionDate).reversed())
                .toList()
                : tenantBatches;
    }

    private HibahPatternAnalysis analyzeProjectedHibahPatterns(Long tenantId,
                                                               LocalDate distributionDate,
                                                               BigDecimal proposedRate) {
        LocalDate cutoff = distributionDate.minusMonths(12);
        List<HibahDistributionBatch> batches = batchesForTenant(tenantId).stream()
                .filter(item -> item.getStatus() == WadiahDomainEnums.HibahBatchStatus.COMPLETED)
                .filter(item -> !item.getDistributionDate().isBefore(cutoff))
                .sorted(Comparator.comparing(HibahDistributionBatch::getDistributionDate))
                .toList();

        List<BigDecimal> projectedRates = new ArrayList<>(batches.stream()
                .map(item -> defaultAmount(item.getAverageHibahRate()))
                .toList());
        List<Long> projectedIntervals = new ArrayList<>();
        for (int index = 1; index < batches.size(); index++) {
            projectedIntervals.add(ChronoUnit.DAYS.between(
                    batches.get(index - 1).getDistributionDate(),
                    batches.get(index).getDistributionDate()));
        }

        if (!batches.isEmpty()) {
            projectedIntervals.add(ChronoUnit.DAYS.between(
                    batches.getLast().getDistributionDate(),
                    distributionDate));
        }
        if (proposedRate != null && proposedRate.compareTo(BigDecimal.ZERO) > 0) {
            projectedRates.add(defaultAmount(proposedRate));
        }

        List<String> alerts = new ArrayList<>();
        if (projectedRates.isEmpty()) {
            return HibahPatternAnalysis.builder()
                    .distributionsInLast12Months(0)
                    .averageRate(BigDecimal.ZERO)
                    .rateStandardDeviation(BigDecimal.ZERO)
                    .rateCoefficientOfVariation(BigDecimal.ZERO)
                    .frequencyRegular(false)
                    .rateStable(false)
                    .systematicRisk(RiskLevel.LOW)
                    .alerts(alerts)
                    .build();
        }

        BigDecimal averageRate = average(projectedRates);
        BigDecimal stdDev = standardDeviation(projectedRates, averageRate);
        BigDecimal coefficient = averageRate.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : stdDev.divide(averageRate, 4, RoundingMode.HALF_UP);
        boolean frequencyRegular = projectedIntervals.size() >= 2 && intervalStandardDeviation(projectedIntervals) <= 5D;
        boolean rateStable = projectedRates.size() >= 3 && coefficient.compareTo(new BigDecimal("0.1000")) < 0;

        if (frequencyRegular) {
            alerts.add("Projected distribution cadence is becoming regular enough to create depositor expectations");
        }
        if (rateStable) {
            alerts.add("Projected Hibah rate variation remains too low for a discretionary gift pattern");
        }
        if (projectedRates.size() >= 4 && recentRatesTooSimilar(projectedRates)) {
            alerts.add("Projected batch would create four near-identical Hibah rates in succession");
        }

        RiskLevel riskLevel = RiskLevel.LOW;
        if (frequencyRegular || rateStable) {
            riskLevel = RiskLevel.MEDIUM;
        }
        if (frequencyRegular && rateStable) {
            riskLevel = RiskLevel.HIGH;
        }

        return HibahPatternAnalysis.builder()
                .distributionsInLast12Months(projectedRates.size())
                .averageRate(averageRate)
                .rateStandardDeviation(stdDev)
                .rateCoefficientOfVariation(coefficient)
                .frequencyRegular(frequencyRegular)
                .rateStable(rateStable)
                .systematicRisk(riskLevel)
                .alerts(alerts)
                .build();
    }

    private void validateProjectedSystematicControls(HibahPolicy policy, HibahPatternAnalysis projectedAnalysis) {
        if (policy == null) {
            throw new BusinessException("An active Hibah policy is required before batch creation", "HIBAH_POLICY_REQUIRED");
        }
        if (projectedAnalysis.getSystematicRisk() == RiskLevel.HIGH && policy.getFatwaId() == null) {
            throw new BusinessException(
                    "Systematic Hibah risk requires an explicit policy fatwa reference before batch creation",
                    "HIBAH_POLICY_FATWA_REQUIRED");
        }
    }

    private void enforcePreCreditControls(HibahDistributionBatch batch,
                                          HibahPolicy policy,
                                          HibahPatternAnalysis projectedAnalysis) {
        if (policy == null) {
            throw new BusinessException("Batch is not linked to an active Hibah policy", "HIBAH_POLICY_REQUIRED");
        }
        if (policy.getStatus() != WadiahDomainEnums.HibahPolicyStatus.ACTIVE) {
            throw new BusinessException("Only ACTIVE Hibah policies may be used for distribution", "HIBAH_POLICY_INACTIVE");
        }
        if (policy.getNextSsbReview() != null && batch.getDistributionDate().isAfter(policy.getNextSsbReview())) {
            throw new BusinessException(
                    "The active Hibah policy is overdue for SSB review and cannot be used for posting",
                    "HIBAH_POLICY_SSB_REVIEW_OVERDUE");
        }
        if (projectedAnalysis.getSystematicRisk() == RiskLevel.MEDIUM && batch.getStatus() != WadiahDomainEnums.HibahBatchStatus.APPROVED) {
            throw new BusinessException(
                    "Elevated Hibah pattern risk requires formal approval before posting",
                    "HIBAH_ESCALATED_APPROVAL_REQUIRED");
        }
        if (projectedAnalysis.getSystematicRisk() != RiskLevel.HIGH) {
            return;
        }
        if (!hasSystematicOverrideJustification(batch.getNotes())) {
            throw new BusinessException(
                    "Projected Hibah pattern is too systematic. Add a SYSTEMATIC_OVERRIDE justification in batch notes and resubmit for Shariah escalation before posting.",
                    "HIBAH_SYSTEMATIC_ESCALATION_REQUIRED");
        }
        boolean escalationSent = notifySystematicHibahEscalation(batch, projectedAnalysis);
        if (!escalationSent) {
            throw new BusinessException(
                    "Systematic Hibah escalation could not be delivered to the Shariah board",
                    "HIBAH_SSB_ESCALATION_FAILED");
        }
        batch.setShariahBoardNotified(true);
        hibahDistributionBatchRepository.save(batch);
    }

    private boolean hasSystematicOverrideJustification(String notes) {
        return StringUtils.hasText(notes)
                && notes.lines().anyMatch(line -> line.trim().toUpperCase().startsWith("SYSTEMATIC_OVERRIDE:"));
    }

    private String enrichBatchNotes(String existingNotes, HibahPatternAnalysis projectedAnalysis) {
        if (projectedAnalysis.getSystematicRisk() == RiskLevel.LOW || projectedAnalysis.getAlerts() == null || projectedAnalysis.getAlerts().isEmpty()) {
            return existingNotes;
        }
        String joinedAlerts = String.join("; ", projectedAnalysis.getAlerts());
        String systemNote = "SYSTEMATIC_RISK_ALERT: " + projectedAnalysis.getSystematicRisk() + " - " + joinedAlerts;
        if (StringUtils.hasText(existingNotes) && existingNotes.contains(systemNote)) {
            return existingNotes;
        }
        return appendReason(existingNotes, systemNote + System.lineSeparator()
                + "SYSTEMATIC_OVERRIDE: provide SSB-approved justification before posting if the pattern remains high-risk.");
    }

    private boolean notifySystematicHibahEscalation(HibahDistributionBatch batch, HibahPatternAnalysis projectedAnalysis) {
        try {
            notificationService.sendDirect(
                    NotificationChannel.EMAIL,
                    "shariah-board@cbs.internal",
                    "Shariah Supervisory Board",
                    "Systematic Hibah Escalation - " + batch.getBatchRef(),
                    "Projected Hibah pattern risk for batch " + batch.getBatchRef()
                            + " is " + projectedAnalysis.getSystematicRisk()
                            + ". Alerts: " + String.join("; ", projectedAnalysis.getAlerts())
                            + ". Override justification: " + defaultText(batch.getNotes(), "not provided"),
                    null,
                    "HIBAH_SYSTEMATIC_ESCALATION"
            );
            log.warn("Systematic Hibah escalation sent for batch {}", batch.getBatchRef());
            return true;
        } catch (Exception exception) {
            log.error("Failed to escalate systematic Hibah risk for batch {}", batch.getBatchRef(), exception);
            return false;
        }
    }

    private void validateBatchTiming(HibahPolicy policy, LocalDate distributionDate) {
        List<HibahDistributionBatch> completed = batchesForTenant(currentTenantResolver.getCurrentTenantId()).stream()
                .filter(item -> item.getStatus() == WadiahDomainEnums.HibahBatchStatus.COMPLETED)
                .sorted(Comparator.comparing(HibahDistributionBatch::getDistributionDate).reversed())
                .toList();

        if (!completed.isEmpty()) {
            long daysSinceLast = ChronoUnit.DAYS.between(completed.getFirst().getDistributionDate(), distributionDate);
            if (daysSinceLast < policy.getMinimumDaysBetweenDistributions()) {
                throw new BusinessException("Hibah distribution is too frequent under the active policy",
                        "HIBAH_FREQUENCY_VIOLATION");
            }
        }

        long countThisYear = completed.stream()
                .filter(item -> item.getDistributionDate().getYear() == distributionDate.getYear())
                .count();
        if (countThisYear >= policy.getMaximumDistributionsPerYear()) {
            throw new BusinessException("Maximum Hibah distributions per year has been reached",
                    "HIBAH_YEARLY_LIMIT");
        }
    }

    private boolean isEligible(HibahPolicy policy, WadiahAccount account, LocalDate periodFrom, LocalDate periodTo) {
        if (!Boolean.TRUE.equals(account.getHibahEligible())) {
            return false;
        }
        Account baseAccount = account.getAccount();
        if (!baseAccount.isActive()) {
            return false;
        }
        long activeDays = ChronoUnit.DAYS.between(baseAccount.getOpenedDate(), periodTo) + 1;
        if (activeDays < policy.getMinimumDaysActive()) {
            return false;
        }
        if (Boolean.TRUE.equals(policy.getExcludeDormantAccounts())
                && !Boolean.TRUE.equals(account.getDormancyExempt())
                && account.getLastActivityDate() != null
                && baseAccount.getProduct() != null
                && account.getLastActivityDate().isBefore(periodTo.minusDays(baseAccount.getProduct().getDormancyDays()))) {
            return false;
        }
        if (Boolean.TRUE.equals(policy.getExcludeBlockedAccounts())
                && (!Boolean.TRUE.equals(baseAccount.getAllowDebit()) || !Boolean.TRUE.equals(baseAccount.getAllowCredit()))) {
            return false;
        }

        BigDecimal averageBalance = averageBalance(baseAccount.getId(), periodFrom, periodTo, baseAccount.getBookBalance());
        BigDecimal minimumBalance = minimumBalance(baseAccount.getId(), periodFrom, periodTo, baseAccount.getBookBalance());
        return averageBalance.compareTo(defaultAmount(policy.getMinimumBalanceForEligibility())) >= 0
                && minimumBalance.compareTo(defaultAmount(policy.getMinimumBalanceForEligibility())) >= 0;
    }

    private List<HibahDistributionItem> buildDistributionItems(HibahPolicy policy,
                                                               CreateHibahBatchRequest request,
                                                               List<WadiahAccount> eligibleAccounts) {
        BigDecimal totalAverageBalance = eligibleAccounts.stream()
                .map(item -> averageBalance(item.getAccount().getId(), request.getPeriodFrom(), request.getPeriodTo(),
                        item.getAccount().getBookBalance()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal impliedRate = deriveRate(request, totalAverageBalance, eligibleAccounts.size());

        List<HibahDistributionItem> items = new ArrayList<>();
        for (WadiahAccount wadiahAccount : eligibleAccounts) {
            Account account = wadiahAccount.getAccount();
            BigDecimal averageBalance = averageBalance(account.getId(), request.getPeriodFrom(), request.getPeriodTo(), account.getBookBalance());
            BigDecimal minimumBalance = minimumBalance(account.getId(), request.getPeriodFrom(), request.getPeriodTo(), account.getBookBalance());

            BigDecimal amount = switch (request.getDistributionMethod()) {
                case FLAT_AMOUNT -> defaultAmount(request.getFlatAmount()).compareTo(BigDecimal.ZERO) > 0
                        ? defaultAmount(request.getFlatAmount())
                        : defaultAmount(request.getTotalDistributionAmount())
                        .divide(BigDecimal.valueOf(eligibleAccounts.size()), 2, RoundingMode.HALF_UP);
                case BALANCE_WEIGHTED -> averageBalance
                        .multiply(impliedRate)
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                case TIERED -> evaluateTieredAmount(request, account, averageBalance);
                case DISCRETIONARY_MANUAL -> defaultAmount(request.getManualAmounts().get(account.getId()));
            };
            BigDecimal effectiveRate = averageBalance.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : amount.multiply(BigDecimal.valueOf(100))
                    .divide(averageBalance, 4, RoundingMode.HALF_UP);

            WadiahDomainEnums.HibahItemStatus status = amount.compareTo(BigDecimal.ZERO) > 0
                    ? WadiahDomainEnums.HibahItemStatus.PENDING
                    : WadiahDomainEnums.HibahItemStatus.EXCLUDED;
            String reason = status == WadiahDomainEnums.HibahItemStatus.EXCLUDED
                    ? "Calculated Hibah amount is zero"
                    : null;

            items.add(HibahDistributionItem.builder()
                    .accountId(account.getId())
                    .wadiahAccountId(wadiahAccount.getId())
                    .customerId(account.getCustomer() != null ? account.getCustomer().getId() : null)
                    .averageBalance(averageBalance)
                    .minimumBalance(minimumBalance)
                    .hibahAmount(amount)
                    .hibahRate(effectiveRate)
                    .calculationBasis(buildCalculationBasis(request.getDistributionMethod(), impliedRate, averageBalance))
                    .status(status)
                    .exclusionReason(reason)
                    .build());
        }

        // For FLAT_AMOUNT method with a total budget, apply rounding residual to the last pending item
        if (request.getDistributionMethod() == WadiahDomainEnums.HibahDistributionMethod.FLAT_AMOUNT
                && request.getTotalDistributionAmount() != null
                && request.getTotalDistributionAmount().compareTo(BigDecimal.ZERO) > 0
                && (request.getFlatAmount() == null || request.getFlatAmount().compareTo(BigDecimal.ZERO) <= 0)) {
            BigDecimal totalAllocated = items.stream()
                    .filter(item -> item.getStatus() == WadiahDomainEnums.HibahItemStatus.PENDING)
                    .map(HibahDistributionItem::getHibahAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal residual = request.getTotalDistributionAmount().subtract(totalAllocated);
            if (residual.abs().compareTo(BigDecimal.ONE) < 0 && residual.compareTo(BigDecimal.ZERO) != 0) {
                for (int i = items.size() - 1; i >= 0; i--) {
                    if (items.get(i).getStatus() == WadiahDomainEnums.HibahItemStatus.PENDING) {
                        HibahDistributionItem lastItem = items.get(i);
                        lastItem.setHibahAmount(lastItem.getHibahAmount().add(residual).setScale(2, RoundingMode.HALF_UP));
                        break;
                    }
                }
            }
        }

        return items;
    }

    private BigDecimal evaluateTieredAmount(CreateHibahBatchRequest request, Account account, BigDecimal averageBalance) {
        if (!StringUtils.hasText(request.getDecisionTableCode())) {
            throw new BusinessException("Tiered Hibah distribution requires a decision table code",
                    "HIBAH_DECISION_TABLE_REQUIRED");
        }
        DecisionResultResponse result = decisionTableEvaluator.evaluateByRuleCode(
                request.getDecisionTableCode(),
                Map.of("averageBalance", averageBalance, "currencyCode", account.getCurrencyCode())
        );
        if (!Boolean.TRUE.equals(result.getMatched())) {
            throw new BusinessException("No Hibah decision table row matched the account balance",
                    "HIBAH_DECISION_TABLE_NO_MATCH");
        }

        Map<String, Object> outputs = result.getOutputs();
        BigDecimal rate = toBigDecimal(outputs.get("hibahRate"));
        if (rate == null) {
            rate = toBigDecimal(outputs.get("rate"));
        }
        BigDecimal amount = toBigDecimal(outputs.get("amount"));
        if (amount != null) {
            return amount.setScale(2, RoundingMode.HALF_UP);
        }
        if (rate == null) {
            throw new BusinessException("Decision table must return hibahRate/rate or amount",
                    "HIBAH_DECISION_TABLE_INVALID_OUTPUT");
        }
        return averageBalance.multiply(rate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal deriveRate(CreateHibahBatchRequest request, BigDecimal totalAverageBalance, int accountCount) {
        if (request.getProposedRate() != null && request.getProposedRate().compareTo(BigDecimal.ZERO) > 0) {
            return request.getProposedRate().setScale(4, RoundingMode.HALF_UP);
        }
        if (request.getDistributionMethod() == WadiahDomainEnums.HibahDistributionMethod.FLAT_AMOUNT
                && request.getFlatAmount() != null && request.getFlatAmount().compareTo(BigDecimal.ZERO) > 0
                && totalAverageBalance.compareTo(BigDecimal.ZERO) > 0) {
            return request.getFlatAmount()
                    .multiply(BigDecimal.valueOf(accountCount))
                    .multiply(BigDecimal.valueOf(100))
                    .divide(totalAverageBalance, 4, RoundingMode.HALF_UP);
        }
        if (request.getTotalDistributionAmount() != null
                && request.getTotalDistributionAmount().compareTo(BigDecimal.ZERO) > 0
                && totalAverageBalance.compareTo(BigDecimal.ZERO) > 0) {
            return request.getTotalDistributionAmount()
                    .multiply(BigDecimal.valueOf(100))
                    .divide(totalAverageBalance, 4, RoundingMode.HALF_UP);
        }
        return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
    }

    private void validateDistributionCaps(HibahPolicy policy, BigDecimal totalAmount, BigDecimal averageRate) {
        if (policy.getMaximumTotalDistributionPerPeriod() != null
                && totalAmount.compareTo(policy.getMaximumTotalDistributionPerPeriod()) > 0) {
            throw new BusinessException("Proposed Hibah batch exceeds the policy amount cap",
                    "HIBAH_POLICY_AMOUNT_CAP");
        }
        if (policy.getMaximumHibahRatePerAnnum() != null
                && averageRate.compareTo(policy.getMaximumHibahRatePerAnnum()) > 0) {
            throw new BusinessException("Proposed Hibah rate exceeds the active policy cap",
                    "HIBAH_POLICY_RATE_CAP");
        }
    }

    private void validateVariability(HibahPolicy policy, List<HibahDistributionBatch> recentCompleted, BigDecimal proposedRate) {
        if (recentCompleted.isEmpty() || proposedRate.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        HibahDistributionBatch lastBatch = recentCompleted.getFirst();
        BigDecimal lastRate = defaultAmount(lastBatch.getAverageHibahRate());
        BigDecimal similarityThreshold = lastRate.abs().multiply(new BigDecimal("0.10"));
        BigDecimal absoluteDifference = proposedRate.subtract(lastRate).abs();
        boolean tooSimilar = absoluteDifference.compareTo(similarityThreshold) < 0;

        if (policy.getVariabilityRequirement() == WadiahDomainEnums.HibahVariabilityRequirement.MANDATORY_VARIATION
                && tooSimilar) {
            throw new BusinessException("Proposed Hibah rate is too similar to the most recent completed batch",
                    "HIBAH_VARIABILITY_VIOLATION");
        }

        long sameRateRun = recentCompleted.stream()
                .limit(policy.getMaximumConsecutiveSameRate())
                .filter(item -> defaultAmount(item.getAverageHibahRate()).subtract(proposedRate).abs()
                        .compareTo(proposedRate.abs().multiply(new BigDecimal("0.02"))) <= 0)
                .count();
        if (sameRateRun >= policy.getMaximumConsecutiveSameRate()) {
            throw new BusinessException("Consecutive Hibah rates are becoming too systematic under the active policy",
                    "HIBAH_SYSTEMATIC_PATTERN");
        }
    }

    private BigDecimal averageBalance(Long accountId, LocalDate from, LocalDate to, BigDecimal fallback) {
        BigDecimal value = transactionJournalRepository.findAverageBalanceInPeriod(accountId, from, to);
        return value != null && value.compareTo(BigDecimal.ZERO) > 0
                ? value.setScale(2, RoundingMode.HALF_UP)
                : defaultAmount(fallback);
    }

    private BigDecimal minimumBalance(Long accountId, LocalDate from, LocalDate to, BigDecimal fallback) {
        BigDecimal value = transactionJournalRepository.findMinimumBalanceInPeriod(accountId, from, to);
        return value != null && value.compareTo(BigDecimal.ZERO) > 0
                ? value.setScale(2, RoundingMode.HALF_UP)
                : defaultAmount(fallback);
    }

    private BigDecimal computeAverageRate(List<HibahDistributionItem> items) {
        List<BigDecimal> rates = items.stream()
                .filter(item -> item.getStatus() == WadiahDomainEnums.HibahItemStatus.PENDING)
                .map(item -> defaultAmount(item.getHibahRate()))
                .toList();
        return rates.isEmpty() ? BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP) : average(rates);
    }

    private BigDecimal average(List<BigDecimal> values) {
        if (values.isEmpty()) {
            return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }
        return values.stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(values.size()), 4, RoundingMode.HALF_UP);
    }

    private BigDecimal standardDeviation(List<BigDecimal> values, BigDecimal mean) {
        if (values.size() <= 1) {
            return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }
        BigDecimal variance = values.stream()
                .map(value -> value.subtract(mean))
                .map(diff -> diff.multiply(diff))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(values.size()), 8, RoundingMode.HALF_UP);
        return BigDecimal.valueOf(Math.sqrt(variance.doubleValue())).setScale(4, RoundingMode.HALF_UP);
    }

    private double intervalStandardDeviation(List<Long> intervals) {
        if (intervals.size() <= 1) {
            return 0D;
        }
        double mean = intervals.stream().mapToLong(Long::longValue).average().orElse(0D);
        double variance = intervals.stream()
                .mapToDouble(value -> Math.pow(value - mean, 2))
                .average()
                .orElse(0D);
        return Math.sqrt(variance);
    }

    private boolean recentRatesTooSimilar(List<BigDecimal> rates) {
        if (rates.size() < 4) {
            return false;
        }
        List<BigDecimal> lastFour = rates.subList(rates.size() - 4, rates.size());
        BigDecimal mean = average(lastFour);
        return standardDeviation(lastFour, mean).compareTo(new BigDecimal("0.0500")) < 0;
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private BigDecimal defaultAmount(BigDecimal value) {
        return value != null ? value.setScale(4, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
    }

    private String buildCalculationBasis(WadiahDomainEnums.HibahDistributionMethod method,
                                         BigDecimal impliedRate,
                                         BigDecimal averageBalance) {
        return switch (method) {
            case FLAT_AMOUNT -> "Flat discretionary amount";
            case BALANCE_WEIGHTED -> "Balance-weighted: average balance " + averageBalance + " x rate " + impliedRate + "%";
            case TIERED -> "Tiered decision-table based Hibah";
            case DISCRETIONARY_MANUAL -> "Manual discretionary Hibah allocation";
        };
    }

    private String appendReason(String existing, String reason) {
        if (!StringUtils.hasText(reason)) {
            return existing;
        }
        return StringUtils.hasText(existing) ? existing + System.lineSeparator() + reason : reason;
    }

    private String defaultText(String value, String fallback) {
        return StringUtils.hasText(value) ? value : fallback;
    }

    private String generateBatchReference(LocalDate distributionDate) {
        return "HIB-" + distributionDate.getYear() + "-" + String.format("%02d", distributionDate.getMonthValue())
                + "-" + String.format("%03d", BATCH_SEQ.incrementAndGet() % 1000);
    }
}
