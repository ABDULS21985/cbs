package com.cbs.islamicaml.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.islamicaml.dto.*;
import com.cbs.islamicaml.entity.*;
import com.cbs.islamicaml.repository.IslamicAmlAlertRepository;
import com.cbs.islamicaml.repository.SanctionsListConfigurationRepository;
import com.cbs.islamicaml.repository.SanctionsScreeningResultRepository;
import com.cbs.shariahcompliance.entity.ShariahExclusionList;
import com.cbs.shariahcompliance.entity.ShariahExclusionListEntry;
import com.cbs.shariahcompliance.repository.ShariahExclusionListEntryRepository;
import com.cbs.shariahcompliance.repository.ShariahExclusionListRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IslamicSanctionsScreeningService {

    private final SanctionsListConfigurationRepository listConfigRepo;
    private final SanctionsScreeningResultRepository resultRepository;
    private final IslamicAmlAlertRepository amlAlertRepository;
    private final CustomerRepository customerRepository;
    private final ShariahExclusionListEntryRepository exclusionEntryRepository;
    private final ShariahExclusionListRepository exclusionListRepository;
    private final CurrentActorProvider actorProvider;
    private final CurrentTenantResolver tenantResolver;

    private static final AtomicLong SCREENING_SEQ = new AtomicLong(System.currentTimeMillis() % 100000);
    private static final BigDecimal MATCH_THRESHOLD = new BigDecimal("70.0000");

    // ===================== CUSTOMER SCREENING =====================

    public SanctionsScreeningResultResponse screenCustomer(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + customerId));

        String entityName = buildCustomerName(customer);
        Map<String, Object> identifiers = new LinkedHashMap<>();
        identifiers.put("customerId", customer.getId());
        identifiers.put("cifNumber", customer.getCifNumber());
        if (StringUtils.hasText(customer.getNationality())) {
            identifiers.put("nationality", customer.getNationality());
        }
        if (StringUtils.hasText(customer.getTaxId())) {
            identifiers.put("taxId", customer.getTaxId());
        }
        if (StringUtils.hasText(customer.getRegistrationNumber())) {
            identifiers.put("registrationNumber", customer.getRegistrationNumber());
        }

        SanctionsEntityType entityType = customer.getCustomerType() != null
                && "CORPORATE".equals(customer.getCustomerType().name())
                ? SanctionsEntityType.CORPORATE : SanctionsEntityType.INDIVIDUAL;

        String country = customer.getNationality() != null ? customer.getNationality()
                : customer.getCountryOfResidence();

        SanctionsScreeningResult result = performScreening(
                entityName, entityType, identifiers, country,
                SanctionsScreeningType.CUSTOMER_ONBOARDING,
                customerId, null, null);

        return toResponse(result);
    }

    // ===================== TRANSACTION COUNTERPARTY =====================

    public SanctionsScreeningResultResponse screenTransactionCounterparty(TransactionCounterpartyRequest request) {
        if (request == null || !StringUtils.hasText(request.getEntityName())) {
            throw new BusinessException("Entity name is required for counterparty screening", "MISSING_ENTITY_NAME");
        }

        SanctionsEntityType entityType;
        try {
            entityType = StringUtils.hasText(request.getEntityType())
                    ? SanctionsEntityType.valueOf(request.getEntityType())
                    : SanctionsEntityType.CORPORATE;
        } catch (IllegalArgumentException e) {
            entityType = SanctionsEntityType.CORPORATE;
        }

        Map<String, Object> identifiers = request.getEntityIdentifiers() != null
                ? new LinkedHashMap<>(request.getEntityIdentifiers())
                : new LinkedHashMap<>();

        SanctionsScreeningResult result = performScreening(
                request.getEntityName(), entityType, identifiers,
                request.getEntityCountry(),
                SanctionsScreeningType.COUNTERPARTY_GENERAL,
                null, request.getTransactionRef(), request.getContractRef());

        return toResponse(result);
    }

    // ===================== ISLAMIC-SPECIFIC SCREENING =====================

    public SanctionsScreeningResultResponse screenCommodityBroker(String brokerName, String brokerCountry, String brokerId) {
        if (!StringUtils.hasText(brokerName)) {
            throw new BusinessException("Broker name is required", "MISSING_BROKER_NAME");
        }

        Map<String, Object> identifiers = new LinkedHashMap<>();
        if (StringUtils.hasText(brokerId)) {
            identifiers.put("brokerId", brokerId);
        }

        SanctionsScreeningResult result = performScreening(
                brokerName, SanctionsEntityType.COMMODITY_BROKER, identifiers,
                brokerCountry, SanctionsScreeningType.COMMODITY_BROKER,
                null, null, null);

        return toResponse(result);
    }

    public SanctionsScreeningResultResponse screenTakafulProvider(String providerName, String country) {
        if (!StringUtils.hasText(providerName)) {
            throw new BusinessException("Provider name is required", "MISSING_PROVIDER_NAME");
        }

        SanctionsScreeningResult result = performScreening(
                providerName, SanctionsEntityType.TAKAFUL_PROVIDER, new LinkedHashMap<>(),
                country, SanctionsScreeningType.TAKAFUL_PROVIDER,
                null, null, null);

        return toResponse(result);
    }

    public SanctionsScreeningResultResponse screenSukukIssuer(String issuerName, String country, String isin) {
        if (!StringUtils.hasText(issuerName)) {
            throw new BusinessException("Issuer name is required", "MISSING_ISSUER_NAME");
        }

        Map<String, Object> identifiers = new LinkedHashMap<>();
        if (StringUtils.hasText(isin)) {
            identifiers.put("isin", isin);
        }

        SanctionsScreeningResult result = performScreening(
                issuerName, SanctionsEntityType.FINANCIAL_INSTITUTION, identifiers,
                country, SanctionsScreeningType.SUKUK_ISSUER,
                null, null, null);

        return toResponse(result);
    }

    // ===================== BATCH RE-SCREENING =====================

    public BatchScreeningResult reScreenAllCustomers() {
        List<SanctionsScreeningResultResponse> results = new ArrayList<>();
        int newMatches = 0;
        int totalScreened = 0;

        int pageSize = 100;
        int pageNumber = 0;
        Page<Customer> customerPage;

        do {
            customerPage = customerRepository.findAll(
                    PageRequest.of(pageNumber, pageSize, Sort.by("id")));

            for (Customer customer : customerPage.getContent()) {
                try {
                    SanctionsScreeningResultResponse response = screenCustomer(customer.getId());
                    results.add(response);
                    totalScreened++;
                    if (response.getOverallResult() == SanctionsOverallResult.POTENTIAL_MATCH
                            || response.getOverallResult() == SanctionsOverallResult.CONFIRMED_MATCH) {
                        newMatches++;
                    }
                } catch (Exception e) {
                    log.warn("Error re-screening customer {}: {}", customer.getId(), e.getMessage());
                    totalScreened++;
                }
            }

            pageNumber++;
        } while (customerPage.hasNext());

        log.info("Batch re-screening completed: total={}, newMatches={}", totalScreened, newMatches);
        return BatchScreeningResult.builder()
                .totalScreened(totalScreened)
                .newMatches(newMatches)
                .results(results)
                .build();
    }

    // ===================== ARABIC NAME MATCHING =====================

    public List<NameMatchResult> fuzzyMatchArabicName(String inputName, String listCode) {
        if (!StringUtils.hasText(inputName)) {
            return List.of();
        }

        String normalizedInput = normalizeArabicName(inputName);
        List<NameMatchResult> matches = new ArrayList<>();

        // Determine which exclusion lists to query
        List<ShariahExclusionList> listsToSearch = new ArrayList<>();
        if (StringUtils.hasText(listCode)) {
            // Search specific list by code (try direct and SANCTIONS_ prefix)
            exclusionListRepository.findByListCode(listCode).ifPresent(listsToSearch::add);
            if (listsToSearch.isEmpty()) {
                exclusionListRepository.findByListCode("SANCTIONS_" + listCode).ifPresent(listsToSearch::add);
            }
        } else {
            // Search all active exclusion lists
            listsToSearch.addAll(exclusionListRepository.findByStatus("ACTIVE"));
        }

        for (ShariahExclusionList list : listsToSearch) {
            List<ShariahExclusionListEntry> entries = exclusionEntryRepository
                    .findByListIdAndStatus(list.getId(), "ACTIVE");

            for (ShariahExclusionListEntry entry : entries) {
                String normalizedEntry = normalizeArabicName(entry.getEntryValue());
                double similarity = calculateNameSimilarity(normalizedInput, normalizedEntry);

                if (BigDecimal.valueOf(similarity).compareTo(MATCH_THRESHOLD) >= 0) {
                    matches.add(NameMatchResult.builder()
                            .matchedName(entry.getEntryValue())
                            .matchScore(BigDecimal.valueOf(similarity).setScale(4, RoundingMode.HALF_UP))
                            .listCode(list.getListCode())
                            .listEntryRef("ENTRY-" + entry.getId())
                            .matchType(similarity >= 95.0 ? "EXACT" : similarity >= 85.0 ? "STRONG" : "PARTIAL")
                            .build());
                }
            }
        }

        matches.sort((a, b) -> b.getMatchScore().compareTo(a.getMatchScore()));
        return matches;
    }

    // ===================== LIST MANAGEMENT =====================

    @Transactional(readOnly = true)
    public List<SanctionsListConfiguration> getActiveLists() {
        return listConfigRepo.findByIsActiveTrueOrderByPriorityAsc();
    }

    @Transactional(readOnly = true)
    public SanctionsListConfiguration getList(String listCode) {
        return listConfigRepo.findByListCode(listCode)
                .orElseThrow(() -> new ResourceNotFoundException("Sanctions list not found: " + listCode));
    }

    // ===================== RESULT QUERIES =====================

    @Transactional(readOnly = true)
    public SanctionsScreeningResultResponse getResult(Long resultId) {
        SanctionsScreeningResult result = resultRepository.findById(resultId)
                .orElseThrow(() -> new ResourceNotFoundException("Screening result not found: " + resultId));
        return toResponse(result);
    }

    @Transactional(readOnly = true)
    public List<SanctionsScreeningResultResponse> getResultsByCustomer(Long customerId) {
        return resultRepository.findByCustomerId(customerId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SanctionsScreeningResultResponse> getPendingReview() {
        return resultRepository.findByDispositionStatus(SanctionsDispositionStatus.PENDING_REVIEW).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public void reviewDisposition(Long resultId, ReviewDispositionRequest request) {
        SanctionsScreeningResult result = resultRepository.findById(resultId)
                .orElseThrow(() -> new ResourceNotFoundException("Screening result not found: " + resultId));

        if (result.getDispositionStatus() == SanctionsDispositionStatus.CONFIRMED_MATCH_BLOCKED
                || result.getDispositionStatus() == SanctionsDispositionStatus.CLEARED_FALSE_POSITIVE) {
            throw new BusinessException(
                    "Result " + resultId + " has already been dispositioned: " + result.getDispositionStatus(),
                    "ALREADY_DISPOSITIONED");
        }

        SanctionsDispositionStatus newStatus;
        try {
            newStatus = SanctionsDispositionStatus.valueOf(request.getDispositionStatus());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid disposition status: " + request.getDispositionStatus(),
                    "INVALID_DISPOSITION_STATUS");
        }

        result.setDispositionStatus(newStatus);
        result.setReviewedBy(actorProvider.getCurrentActor());
        result.setReviewedAt(LocalDateTime.now());
        result.setReviewNotes(request.getReviewNotes());
        resultRepository.save(result);

        log.info("Screening result {} dispositioned as {} by {}",
                resultId, newStatus, actorProvider.getCurrentActor());
    }

    @Transactional(readOnly = true)
    public SanctionsScreeningSummary getScreeningSummary(LocalDate from, LocalDate to) {
        List<SanctionsScreeningResult> allResults = resultRepository.findAll();

        // Filter by date range
        List<SanctionsScreeningResult> filtered = allResults.stream()
                .filter(r -> {
                    if (r.getScreeningTimestamp() == null) return false;
                    LocalDate screenDate = r.getScreeningTimestamp().toLocalDate();
                    boolean afterFrom = from == null || !screenDate.isBefore(from);
                    boolean beforeTo = to == null || !screenDate.isAfter(to);
                    return afterFrom && beforeTo;
                })
                .collect(Collectors.toList());

        long total = filtered.size();
        long clearCount = filtered.stream()
                .filter(r -> r.getOverallResult() == SanctionsOverallResult.CLEAR).count();
        long potentialMatches = filtered.stream()
                .filter(r -> r.getOverallResult() == SanctionsOverallResult.POTENTIAL_MATCH).count();
        long confirmedMatches = filtered.stream()
                .filter(r -> r.getOverallResult() == SanctionsOverallResult.CONFIRMED_MATCH).count();
        long pendingReview = filtered.stream()
                .filter(r -> r.getDispositionStatus() == SanctionsDispositionStatus.PENDING_REVIEW).count();

        BigDecimal clearRate = total > 0
                ? BigDecimal.valueOf(clearCount).multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        Map<String, Long> matchesByList = new LinkedHashMap<>();
        for (SanctionsScreeningResult r : filtered) {
            if (r.getListsScreened() != null && r.getOverallResult() != SanctionsOverallResult.CLEAR) {
                for (String listCode : r.getListsScreened()) {
                    matchesByList.merge(listCode, 1L, Long::sum);
                }
            }
        }

        return SanctionsScreeningSummary.builder()
                .totalScreenings(total)
                .clearCount(clearCount)
                .potentialMatches(potentialMatches)
                .confirmedMatches(confirmedMatches)
                .pendingReview(pendingReview)
                .clearRate(clearRate)
                .matchesByList(matchesByList)
                .build();
    }

    // ===================== PRIVATE HELPERS =====================

    private SanctionsScreeningResult performScreening(String entityName, SanctionsEntityType entityType,
            Map<String, Object> identifiers, String country, SanctionsScreeningType screeningType,
            Long customerId, String transactionRef, String contractRef) {

        long startTime = System.currentTimeMillis();
        List<SanctionsListConfiguration> activeLists = listConfigRepo.findByIsActiveTrueOrderByPriorityAsc();

        List<String> listsScreened = new ArrayList<>();
        List<Map<String, Object>> matchDetails = new ArrayList<>();
        BigDecimal highestScore = BigDecimal.ZERO;
        int matchCount = 0;

        String normalizedName = normalizeArabicName(entityName);

        for (SanctionsListConfiguration listConfig : activeLists) {
            listsScreened.add(listConfig.getListCode());

            // Simulate screening against each list
            // In production, this would query actual sanctions list entries
            List<NameMatchResult> nameMatches = performListScreening(normalizedName, listConfig);

            for (NameMatchResult match : nameMatches) {
                matchCount++;
                Map<String, Object> detail = new LinkedHashMap<>();
                detail.put("listCode", listConfig.getListCode());
                detail.put("listName", listConfig.getListName());
                detail.put("matchedName", match.getMatchedName());
                detail.put("matchScore", match.getMatchScore());
                detail.put("matchType", match.getMatchType());
                detail.put("entryRef", match.getListEntryRef());
                matchDetails.add(detail);

                if (match.getMatchScore().compareTo(highestScore) > 0) {
                    highestScore = match.getMatchScore();
                }
            }
        }

        // Determine overall result
        SanctionsOverallResult overallResult;
        SanctionsDispositionStatus dispositionStatus;

        if (matchCount == 0) {
            overallResult = SanctionsOverallResult.CLEAR;
            dispositionStatus = SanctionsDispositionStatus.CLEARED_FALSE_POSITIVE;
        } else if (highestScore.compareTo(new BigDecimal("95.0000")) >= 0) {
            overallResult = SanctionsOverallResult.CONFIRMED_MATCH;
            dispositionStatus = SanctionsDispositionStatus.PENDING_REVIEW;
        } else {
            overallResult = SanctionsOverallResult.POTENTIAL_MATCH;
            dispositionStatus = SanctionsDispositionStatus.PENDING_REVIEW;
        }

        long durationMs = System.currentTimeMillis() - startTime;

        SanctionsScreeningResult result = SanctionsScreeningResult.builder()
                .screeningRef("SCR-" + LocalDate.now().getYear() + "-"
                        + String.format("%06d", SCREENING_SEQ.incrementAndGet()))
                .screeningType(screeningType)
                .entityName(entityName)
                .entityType(entityType)
                .entityIdentifiers(identifiers)
                .entityCountry(country)
                .listsScreened(listsScreened)
                .screeningTimestamp(LocalDateTime.now())
                .screeningDurationMs(durationMs)
                .overallResult(overallResult)
                .matchDetails(matchDetails)
                .highestMatchScore(highestScore.compareTo(BigDecimal.ZERO) > 0 ? highestScore : null)
                .matchCount(matchCount)
                .dispositionStatus(dispositionStatus)
                .customerId(customerId)
                .transactionRef(transactionRef)
                .contractRef(contractRef)
                .tenantId(tenantResolver.getCurrentTenantId())
                .build();

        result = resultRepository.save(result);

        // If potential or confirmed match, create an alert for review
        if (overallResult == SanctionsOverallResult.POTENTIAL_MATCH
                || overallResult == SanctionsOverallResult.CONFIRMED_MATCH) {
            createAlertForMatch(result, customerId);
        }

        log.info("Sanctions screening completed: ref={}, entity={}, result={}, matches={}, duration={}ms",
                result.getScreeningRef(), entityName, overallResult, matchCount, durationMs);

        return result;
    }

    private void createAlertForMatch(SanctionsScreeningResult screeningResult, Long customerId) {
        // Prevent duplicate alerts for already-flagged customers with open alerts
        if (customerId != null) {
            List<IslamicAmlAlert> existingAlerts = amlAlertRepository.findByCustomerId(customerId);
            boolean hasOpenSanctionsAlert = existingAlerts.stream()
                    .filter(a -> "SANCTIONS_MATCH".equals(a.getRuleCode()))
                    .anyMatch(a -> a.getStatus() == IslamicAmlAlertStatus.NEW
                            || a.getStatus() == IslamicAmlAlertStatus.UNDER_INVESTIGATION);
            if (hasOpenSanctionsAlert) {
                log.info("Skipping duplicate sanctions alert for customer {} — open alert already exists", customerId);
                return;
            }
        }

        String customerName = screeningResult.getEntityName();

        Map<String, Object> islamicContext = new LinkedHashMap<>();
        islamicContext.put("screeningRef", screeningResult.getScreeningRef());
        islamicContext.put("screeningType", screeningResult.getScreeningType().name());
        islamicContext.put("matchCount", screeningResult.getMatchCount());
        islamicContext.put("highestMatchScore",
                Optional.ofNullable(screeningResult.getHighestMatchScore()).orElse(BigDecimal.ZERO));

        IslamicAmlAlert alert = IslamicAmlAlert.builder()
                .alertRef("AML-SCR-" + LocalDate.now().getYear() + "-"
                        + String.format("%06d", SCREENING_SEQ.incrementAndGet()))
                .ruleId(0L)
                .ruleCode("SANCTIONS_MATCH")
                .detectionDate(LocalDateTime.now())
                .customerId(customerId != null ? customerId : 0L)
                .customerName(customerName)
                .islamicContext(islamicContext)
                .totalAmountInvolved(BigDecimal.ZERO)
                .riskScore(Optional.ofNullable(screeningResult.getHighestMatchScore()).orElse(BigDecimal.ZERO))
                .status(IslamicAmlAlertStatus.NEW)
                .slaDeadline(LocalDateTime.now().plusHours(24))
                .tenantId(tenantResolver.getCurrentTenantId())
                .build();

        amlAlertRepository.save(alert);

        screeningResult.setAlertId(alert.getId());
        resultRepository.save(screeningResult);

        log.info("Alert created for sanctions match: alertRef={}, screeningRef={}",
                alert.getAlertRef(), screeningResult.getScreeningRef());
    }

    private List<NameMatchResult> performListScreening(String normalizedName, SanctionsListConfiguration listConfig) {
        List<NameMatchResult> results = new ArrayList<>();

        // Query entries from the Shariah exclusion list system using the sanctions list code
        // Sanctions list configurations map to exclusion lists by list code convention
        ShariahExclusionList exclusionList = exclusionListRepository
                .findByListCode(listConfig.getListCode()).orElse(null);
        if (exclusionList == null) {
            // Try with SANCTIONS_ prefix convention
            exclusionList = exclusionListRepository
                    .findByListCode("SANCTIONS_" + listConfig.getListCode()).orElse(null);
        }
        if (exclusionList == null) {
            return results;
        }

        List<ShariahExclusionListEntry> entries = exclusionEntryRepository
                .findByListIdAndStatus(exclusionList.getId(), "ACTIVE");

        for (ShariahExclusionListEntry entry : entries) {
            String normalizedEntry = normalizeArabicName(entry.getEntryValue());
            double similarity = calculateNameSimilarity(normalizedName, normalizedEntry);

            if (BigDecimal.valueOf(similarity).compareTo(MATCH_THRESHOLD) >= 0) {
                results.add(NameMatchResult.builder()
                        .matchedName(entry.getEntryValue())
                        .matchScore(BigDecimal.valueOf(similarity).setScale(4, RoundingMode.HALF_UP))
                        .listCode(listConfig.getListCode())
                        .listEntryRef("ENTRY-" + entry.getId())
                        .matchType(similarity >= 95.0 ? "EXACT" : similarity >= 85.0 ? "STRONG" : "PARTIAL")
                        .build());
            }
        }

        results.sort((a, b) -> b.getMatchScore().compareTo(a.getMatchScore()));
        return results;
    }

    double calculateNameSimilarity(String name1, String name2) {
        if (name1 == null || name2 == null) return 0.0;
        if (name1.equals(name2)) return 100.0;

        String s1 = name1.toLowerCase().trim();
        String s2 = name2.toLowerCase().trim();

        if (s1.equals(s2)) return 100.0;
        if (s1.isEmpty() || s2.isEmpty()) return 0.0;

        int distance = levenshteinDistance(s1, s2);
        int maxLen = Math.max(s1.length(), s2.length());

        return Math.max(0.0, (1.0 - (double) distance / maxLen) * 100.0);
    }

    private int levenshteinDistance(String s1, String s2) {
        int len1 = s1.length();
        int len2 = s2.length();
        int[][] dp = new int[len1 + 1][len2 + 1];

        for (int i = 0; i <= len1; i++) {
            dp[i][0] = i;
        }
        for (int j = 0; j <= len2; j++) {
            dp[0][j] = j;
        }

        for (int i = 1; i <= len1; i++) {
            for (int j = 1; j <= len2; j++) {
                int cost = s1.charAt(i - 1) == s2.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(
                        Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                        dp[i - 1][j - 1] + cost);
            }
        }

        return dp[len1][len2];
    }

    String normalizeArabicName(String name) {
        if (name == null) return "";

        String normalized = name.trim();

        // Remove common titles
        normalized = normalized.replaceAll("(?i)\\b(sheikh|shaikh|shaykh|dr|mr|mrs|ms|prof|eng|haj|hajj)\\b\\.?", "");

        // Normalize bin/ibn/bint variations
        normalized = normalized.replaceAll("(?i)\\bbin\\b", "bin");
        normalized = normalized.replaceAll("(?i)\\bibn\\b", "bin");
        normalized = normalized.replaceAll("(?i)\\bbint\\b", "bint");
        normalized = normalized.replaceAll("(?i)\\bbt\\b", "bint");

        // Transliterate common name variants
        normalized = normalized.replaceAll("(?i)\\bmohammed\\b", "muhammad");
        normalized = normalized.replaceAll("(?i)\\bmohamed\\b", "muhammad");
        normalized = normalized.replaceAll("(?i)\\bmohamad\\b", "muhammad");
        normalized = normalized.replaceAll("(?i)\\bmuhamed\\b", "muhammad");
        normalized = normalized.replaceAll("(?i)\\bmohd\\b", "muhammad");

        normalized = normalized.replaceAll("(?i)\\babdullah\\b", "abd allah");
        normalized = normalized.replaceAll("(?i)\\babdulrahman\\b", "abd al-rahman");
        normalized = normalized.replaceAll("(?i)\\babdul\\b", "abd al");

        normalized = normalized.replaceAll("(?i)\\bahmed\\b", "ahmad");
        normalized = normalized.replaceAll("(?i)\\bali\\b", "ali");

        // Remove Arabic diacritical marks (tashkeel/harakat) only, preserving Arabic letters
        // U+064B-U+065F: Arabic combining marks (fathah, dammah, kasrah, shadda, sukun, etc.)
        // U+0610-U+061A: Additional Arabic signs above/below
        // U+0670: Superscript alef
        normalized = normalized.replaceAll("[\\u064B-\\u065F\\u0610-\\u061A\\u0670]", "");
        // Normalize common Arabic letter variants: alef with hamza -> plain alef
        normalized = normalized.replaceAll("[\\u0622\\u0623\\u0625\\u0627]", "\u0627"); // All alef forms -> alef
        normalized = normalized.replaceAll("\\u0629", "\u0647"); // taa marbuta -> haa
        normalized = normalized.replaceAll("[`'\\-]", " ");

        // Collapse multiple spaces
        normalized = normalized.replaceAll("\\s+", " ").trim();

        return normalized;
    }

    private String buildCustomerName(Customer customer) {
        StringBuilder name = new StringBuilder();
        if (StringUtils.hasText(customer.getFirstName())) {
            name.append(customer.getFirstName());
        }
        if (StringUtils.hasText(customer.getMiddleName())) {
            if (name.length() > 0) name.append(" ");
            name.append(customer.getMiddleName());
        }
        if (StringUtils.hasText(customer.getLastName())) {
            if (name.length() > 0) name.append(" ");
            name.append(customer.getLastName());
        }
        // Fallback to registered name for corporates
        if (name.length() == 0 && StringUtils.hasText(customer.getRegisteredName())) {
            name.append(customer.getRegisteredName());
        }
        if (name.length() == 0 && StringUtils.hasText(customer.getTradingName())) {
            name.append(customer.getTradingName());
        }
        return name.length() > 0 ? name.toString() : "Unknown";
    }

    private SanctionsScreeningResultResponse toResponse(SanctionsScreeningResult r) {
        return SanctionsScreeningResultResponse.builder()
                .id(r.getId())
                .screeningRef(r.getScreeningRef())
                .screeningType(r.getScreeningType())
                .entityName(r.getEntityName())
                .entityType(r.getEntityType())
                .entityIdentifiers(r.getEntityIdentifiers())
                .entityCountry(r.getEntityCountry())
                .listsScreened(r.getListsScreened())
                .screeningTimestamp(r.getScreeningTimestamp())
                .screeningDurationMs(r.getScreeningDurationMs())
                .overallResult(r.getOverallResult())
                .matchDetails(r.getMatchDetails())
                .highestMatchScore(r.getHighestMatchScore())
                .matchCount(r.getMatchCount())
                .dispositionStatus(r.getDispositionStatus())
                .reviewedBy(r.getReviewedBy())
                .reviewedAt(r.getReviewedAt())
                .reviewNotes(r.getReviewNotes())
                .customerId(r.getCustomerId())
                .transactionRef(r.getTransactionRef())
                .contractRef(r.getContractRef())
                .alertId(r.getAlertId())
                .tenantId(r.getTenantId())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .createdBy(r.getCreatedBy())
                .updatedBy(r.getUpdatedBy())
                .build();
    }
}
