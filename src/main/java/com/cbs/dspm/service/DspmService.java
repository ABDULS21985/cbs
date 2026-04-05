package com.cbs.dspm.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.dspm.entity.*;
import com.cbs.dspm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DspmService {

    /** Patterns that indicate PII data in column/field names. */
    private static final Map<String, String> PII_PATTERNS = Map.ofEntries(
            Map.entry("email", "EMAIL"),
            Map.entry("phone", "PHONE"),
            Map.entry("mobile", "PHONE"),
            Map.entry("ssn", "SSN"),
            Map.entry("social_security", "SSN"),
            Map.entry("national_id", "NATIONAL_ID"),
            Map.entry("passport", "PASSPORT"),
            Map.entry("date_of_birth", "DOB"),
            Map.entry("dob", "DOB"),
            Map.entry("address", "ADDRESS"),
            Map.entry("credit_card", "CREDIT_CARD"),
            Map.entry("card_number", "CREDIT_CARD"),
            Map.entry("account_number", "ACCOUNT_NUMBER"),
            Map.entry("iban", "IBAN"),
            Map.entry("salary", "FINANCIAL"),
            Map.entry("income", "FINANCIAL"),
            Map.entry("password", "CREDENTIAL"),
            Map.entry("secret", "CREDENTIAL"),
            Map.entry("api_key", "CREDENTIAL"),
            Map.entry("token", "CREDENTIAL")
    );

    private final DspmDataSourceRepository dataSourceRepository;
    private final DspmScanRepository scanRepository;
    private final DspmPolicyRepository policyRepository;
    private final DspmExceptionRepository exceptionRepository;
    private final DspmIdentityRepository identityRepository;
    private final DspmAccessAuditRepository accessAuditRepository;
    private final CurrentActorProvider currentActorProvider;

    // ── Data Sources ────────────────────────────────────────────────────────

    public List<DspmDataSource> getAllDataSources() {
        return dataSourceRepository.findAll(Sort.by(Sort.Direction.ASC, "sourceName"));
    }

    @Transactional
    public DspmDataSource createDataSource(DspmDataSource source) {
        if (!StringUtils.hasText(source.getSourceName())) {
            throw new BusinessException("Source name is required", "MISSING_SOURCE_NAME");
        }
        if (!StringUtils.hasText(source.getSourceType())) {
            throw new BusinessException("Source type is required", "MISSING_SOURCE_TYPE");
        }
        List<String> validTypes = List.of("DATABASE", "FILE_SYSTEM", "OBJECT_STORAGE", "API", "DATA_LAKE", "DATA_WAREHOUSE");
        if (!validTypes.contains(source.getSourceType())) {
            throw new BusinessException("Invalid source type: " + source.getSourceType() + ". Valid: " + validTypes,
                    "INVALID_SOURCE_TYPE");
        }

        source.setSourceCode("DS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (source.getStatus() == null) source.setStatus("ACTIVE");
        if (source.getClassification() == null) source.setClassification("UNCLASSIFIED");
        if (source.getSensitivityLevel() == null) source.setSensitivityLevel("LOW");

        DspmDataSource saved = dataSourceRepository.save(source);
        log.info("Data source created: code={}, name={}, type={}, actor={}",
                saved.getSourceCode(), saved.getSourceName(), saved.getSourceType(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    public DspmDataSource getDataSourceByCode(String code) {
        return dataSourceRepository.findBySourceCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("DspmDataSource", "sourceCode", code));
    }

    // ── Scans ───────────────────────────────────────────────────────────────

    public List<DspmScan> getAllScans() {
        return scanRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @Transactional
    public DspmScan startScan(DspmScan scan) {
        // Validate scan parameters
        if (!StringUtils.hasText(scan.getScanType())) {
            throw new BusinessException("Scan type is required", "MISSING_SCAN_TYPE");
        }

        scan.setScanCode("SCN-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        scan.setStatus("IN_PROGRESS");
        scan.setStartedAt(Instant.now());
        if (scan.getTriggeredBy() == null) {
            scan.setTriggeredBy(currentActorProvider.getCurrentActor());
        }

        // Determine which data sources to scan
        List<DspmDataSource> sourcesToScan;
        if (scan.getSourceId() != null) {
            DspmDataSource specificSource = dataSourceRepository.findById(scan.getSourceId())
                    .orElseThrow(() -> new ResourceNotFoundException("DspmDataSource", "id", String.valueOf(scan.getSourceId())));
            sourcesToScan = List.of(specificSource);
        } else {
            sourcesToScan = dataSourceRepository.findByStatusOrderBySourceNameAsc("ACTIVE");
        }

        scan.setTotalAssets(sourcesToScan.size());
        int totalIssues = 0;
        int critical = 0;
        int high = 0;
        int medium = 0;
        int low = 0;
        int scannedCount = 0;

        // Scan each data source for PII fields
        for (DspmDataSource source : sourcesToScan) {
            scannedCount++;
            List<String> findings = classifyDataSource(source);

            // Evaluate active policies against findings
            List<DspmPolicy> activePolicies = policyRepository.findByStatusOrderByPolicyNameAsc("ACTIVE");
            for (String finding : findings) {
                for (DspmPolicy policy : activePolicies) {
                    if (isPolicyViolated(policy, finding, source)) {
                        totalIssues++;
                        switch (policy.getSeverity().toUpperCase()) {
                            case "CRITICAL" -> critical++;
                            case "HIGH" -> high++;
                            case "MEDIUM" -> medium++;
                            default -> low++;
                        }
                        // Update policy violation count
                        policy.setViolationCount(policy.getViolationCount() + 1);
                        policy.setLastTriggeredAt(Instant.now());
                        policyRepository.save(policy);
                    }
                }
            }

            // Update source metadata
            source.setPiiFieldsCount(findings.size());
            source.setLastScanAt(Instant.now());
            if (!findings.isEmpty()) {
                source.setSensitivityLevel(determineSensitivityLevel(findings));
                source.setClassification(determineClassification(findings));
            }
            dataSourceRepository.save(source);
        }

        scan.setAssetsScanned(scannedCount);
        scan.setIssuesFound(totalIssues);
        scan.setCriticalFindings(critical);
        scan.setHighFindings(high);
        scan.setMediumFindings(medium);
        scan.setLowFindings(low);
        scan.setStatus("COMPLETED");
        scan.setCompletedAt(Instant.now());
        if (scan.getStartedAt() != null) {
            scan.setDurationSec((int) (Instant.now().getEpochSecond() - scan.getStartedAt().getEpochSecond()));
        }

        DspmScan saved = scanRepository.save(scan);
        log.info("DSPM scan completed: code={}, sources={}, issues={} (C:{} H:{} M:{} L:{}), actor={}",
                saved.getScanCode(), scannedCount, totalIssues, critical, high, medium, low,
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public DspmScan completeScan(String scanCode, int issuesFound, int critical, int high, int medium, int low) {
        DspmScan scan = scanRepository.findByScanCode(scanCode)
                .orElseThrow(() -> new ResourceNotFoundException("DspmScan", "scanCode", scanCode));

        if ("COMPLETED".equals(scan.getStatus())) {
            throw new BusinessException("Scan is already completed", "SCAN_ALREADY_COMPLETED");
        }
        if (!"IN_PROGRESS".equals(scan.getStatus())) {
            throw new BusinessException(
                    "Only IN_PROGRESS scans can be completed; current status: " + scan.getStatus(),
                    "INVALID_SCAN_STATUS");
        }

        scan.setStatus("COMPLETED");
        scan.setCompletedAt(Instant.now());
        scan.setIssuesFound(issuesFound);
        scan.setCriticalFindings(critical);
        scan.setHighFindings(high);
        scan.setMediumFindings(medium);
        scan.setLowFindings(low);
        if (scan.getStartedAt() != null) {
            scan.setDurationSec((int) (Instant.now().getEpochSecond() - scan.getStartedAt().getEpochSecond()));
        }

        DspmScan saved = scanRepository.save(scan);
        log.info("Scan manually completed: code={}, issues={}, actor={}",
                scanCode, issuesFound, currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Policies ────────────────────────────────────────────────────────────

    public List<DspmPolicy> getAllPolicies() {
        return policyRepository.findAll(Sort.by(Sort.Direction.ASC, "policyName"));
    }

    @Transactional
    public DspmPolicy createPolicy(DspmPolicy policy) {
        if (!StringUtils.hasText(policy.getPolicyName())) {
            throw new BusinessException("Policy name is required", "MISSING_POLICY_NAME");
        }
        if (!StringUtils.hasText(policy.getPolicyType())) {
            throw new BusinessException("Policy type is required", "MISSING_POLICY_TYPE");
        }
        if (policy.getSeverity() != null) {
            List<String> validSeverities = List.of("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO");
            if (!validSeverities.contains(policy.getSeverity().toUpperCase())) {
                throw new BusinessException("Invalid severity: " + policy.getSeverity(), "INVALID_SEVERITY");
            }
        }

        policy.setPolicyCode("POL-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (policy.getStatus() == null) policy.setStatus("DRAFT");
        if (policy.getViolationCount() == null) policy.setViolationCount(0);

        DspmPolicy saved = policyRepository.save(policy);
        log.info("Policy created: code={}, name={}, type={}, actor={}",
                saved.getPolicyCode(), saved.getPolicyName(), saved.getPolicyType(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public DspmPolicy activatePolicy(String policyCode) {
        DspmPolicy policy = policyRepository.findByPolicyCode(policyCode)
                .orElseThrow(() -> new ResourceNotFoundException("DspmPolicy", "policyCode", policyCode));
        if ("ACTIVE".equals(policy.getStatus())) {
            throw new BusinessException("Policy is already active", "ALREADY_ACTIVE");
        }
        if (!"DRAFT".equals(policy.getStatus()) && !"INACTIVE".equals(policy.getStatus())) {
            throw new BusinessException(
                    "Only DRAFT or INACTIVE policies can be activated; current status: " + policy.getStatus(),
                    "INVALID_POLICY_STATUS");
        }
        policy.setStatus("ACTIVE");
        DspmPolicy saved = policyRepository.save(policy);
        log.info("Policy activated: code={}, actor={}", policyCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public DspmPolicy updatePolicy(String policyCode, DspmPolicy updates) {
        DspmPolicy policy = policyRepository.findByPolicyCode(policyCode)
                .orElseThrow(() -> new ResourceNotFoundException("DspmPolicy", "policyCode", policyCode));
        if (updates.getPolicyName() != null) policy.setPolicyName(updates.getPolicyName());
        if (updates.getDescription() != null) policy.setDescription(updates.getDescription());
        if (updates.getSeverity() != null) policy.setSeverity(updates.getSeverity());
        if (updates.getRule() != null) policy.setRule(updates.getRule());
        if (updates.getDataTypes() != null) policy.setDataTypes(updates.getDataTypes());
        if (updates.getAppliesTo() != null) policy.setAppliesTo(updates.getAppliesTo());
        if (updates.getEnforcementAction() != null) policy.setEnforcementAction(updates.getEnforcementAction());
        if (updates.getAutoRemediate() != null) policy.setAutoRemediate(updates.getAutoRemediate());
        DspmPolicy saved = policyRepository.save(policy);
        log.info("Policy updated: code={}, actor={}", policyCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Exceptions ──────────────────────────────────────────────────────────

    public Page<DspmException> getExceptions(int page, int size, String sortBy, String order) {
        Sort.Direction dir = "desc".equalsIgnoreCase(order) ? Sort.Direction.DESC : Sort.Direction.ASC;
        String sortField = (sortBy != null && !sortBy.isBlank()) ? sortBy : "createdAt";
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sortField));
        return exceptionRepository.findAll(pageable);
    }

    public Page<DspmException> getExceptionsByStatus(String status, int page, int size, String sortBy, String order) {
        Sort.Direction dir = "desc".equalsIgnoreCase(order) ? Sort.Direction.DESC : Sort.Direction.ASC;
        String sortField = (sortBy != null && !sortBy.isBlank()) ? sortBy : "createdAt";
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sortField));
        return exceptionRepository.findByStatus(status, pageable);
    }

    @Transactional
    public DspmException createException(DspmException exception) {
        if (!StringUtils.hasText(exception.getReason())) {
            throw new BusinessException("Exception reason is required", "MISSING_REASON");
        }
        exception.setExceptionCode("EXC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (exception.getStatus() == null) exception.setStatus("PENDING");
        DspmException saved = exceptionRepository.save(exception);
        log.info("Exception created: code={}, actor={}", saved.getExceptionCode(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public DspmException approveException(String exceptionCode, String approvedBy) {
        DspmException exc = exceptionRepository.findByExceptionCode(exceptionCode)
                .orElseThrow(() -> new ResourceNotFoundException("DspmException", "exceptionCode", exceptionCode));
        if (!"PENDING".equals(exc.getStatus())) {
            throw new BusinessException(
                    "Only PENDING exceptions can be approved; current status: " + exc.getStatus(),
                    "INVALID_EXCEPTION_STATUS");
        }
        exc.setStatus("APPROVED");
        exc.setApprovedBy(approvedBy != null ? approvedBy : currentActorProvider.getCurrentActor());
        exc.setApprovedAt(Instant.now());
        DspmException saved = exceptionRepository.save(exc);
        log.info("Exception approved: code={}, approvedBy={}, actor={}",
                exceptionCode, exc.getApprovedBy(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public DspmException rejectException(String exceptionCode) {
        DspmException exc = exceptionRepository.findByExceptionCode(exceptionCode)
                .orElseThrow(() -> new ResourceNotFoundException("DspmException", "exceptionCode", exceptionCode));
        if (!"PENDING".equals(exc.getStatus())) {
            throw new BusinessException(
                    "Only PENDING exceptions can be rejected; current status: " + exc.getStatus(),
                    "INVALID_EXCEPTION_STATUS");
        }
        exc.setStatus("REJECTED");
        DspmException saved = exceptionRepository.save(exc);
        log.info("Exception rejected: code={}, actor={}", exceptionCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Identities ──────────────────────────────────────────────────────────

    public List<DspmIdentity> getAllIdentities() {
        return identityRepository.findAll(Sort.by(Sort.Direction.ASC, "identityName"));
    }

    public DspmIdentity getIdentityByCode(String code) {
        return identityRepository.findByIdentityCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("DspmIdentity", "identityCode", code));
    }

    @Transactional
    public DspmIdentity createIdentity(DspmIdentity identity) {
        if (!StringUtils.hasText(identity.getIdentityName())) {
            throw new BusinessException("Identity name is required", "MISSING_IDENTITY_NAME");
        }
        identity.setIdentityCode("IDN-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        DspmIdentity saved = identityRepository.save(identity);
        log.info("Identity created: code={}, name={}, actor={}",
                saved.getIdentityCode(), saved.getIdentityName(), currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Access Audit ────────────────────────────────────────────────────────

    public Page<DspmAccessAudit> getAuditByIdentity(Long identityId, int page, int size) {
        return accessAuditRepository.findByIdentityIdOrderByOccurredAtDesc(
                identityId, PageRequest.of(page, size));
    }

    public Page<DspmAccessAudit> getAuditBySource(Long sourceId, int page, int size) {
        return accessAuditRepository.findBySourceIdOrderByOccurredAtDesc(
                sourceId, PageRequest.of(page, size));
    }

    public List<DspmAccessAudit> getRiskyAccess() {
        return accessAuditRepository.findByRiskFlagTrueOrderByOccurredAtDesc();
    }

    @Transactional
    public DspmAccessAudit recordAccess(DspmAccessAudit audit) {
        if (audit.getIdentityId() == null) {
            throw new BusinessException("Identity ID is required for access audit", "MISSING_IDENTITY_ID");
        }
        if (audit.getSourceId() == null) {
            throw new BusinessException("Source ID is required for access audit", "MISSING_SOURCE_ID");
        }
        audit.setAuditCode("AUD-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        DspmAccessAudit saved = accessAuditRepository.save(audit);
        log.info("Access audit recorded: code={}, identity={}, source={}, riskFlag={}",
                saved.getAuditCode(), audit.getIdentityId(), audit.getSourceId(), audit.getRiskFlag());
        return saved;
    }

    // ── Private Helpers: Scanning & Classification ──────────────────────────

    private List<String> classifyDataSource(DspmDataSource source) {
        List<String> findings = new ArrayList<>();

        // Classify based on source tags
        if (source.getTags() != null) {
            for (String tag : source.getTags()) {
                String tagLower = tag.toLowerCase();
                for (Map.Entry<String, String> pattern : PII_PATTERNS.entrySet()) {
                    if (tagLower.contains(pattern.getKey())) {
                        findings.add(pattern.getValue());
                    }
                }
            }
        }

        // Classify based on source name patterns
        String nameLower = source.getSourceName().toLowerCase();
        for (Map.Entry<String, String> pattern : PII_PATTERNS.entrySet()) {
            if (nameLower.contains(pattern.getKey())) {
                findings.add(pattern.getValue());
            }
        }

        // Classify based on connection reference patterns (table/collection names)
        if (StringUtils.hasText(source.getConnectionRef())) {
            String connLower = source.getConnectionRef().toLowerCase();
            for (Map.Entry<String, String> pattern : PII_PATTERNS.entrySet()) {
                if (connLower.contains(pattern.getKey())) {
                    findings.add(pattern.getValue());
                }
            }
        }

        return findings.stream().distinct().toList();
    }

    private boolean isPolicyViolated(DspmPolicy policy, String finding, DspmDataSource source) {
        // Check if the policy applies to this data type
        if (policy.getDataTypes() != null && !policy.getDataTypes().isEmpty()) {
            boolean dataTypeMatch = policy.getDataTypes().stream()
                    .anyMatch(dt -> dt.equalsIgnoreCase(finding));
            if (!dataTypeMatch) return false;
        }

        // Check if the policy applies to this source
        if (policy.getAppliesTo() != null && !policy.getAppliesTo().isEmpty()) {
            boolean sourceMatch = policy.getAppliesTo().stream()
                    .anyMatch(s -> s.equalsIgnoreCase(source.getSourceCode())
                            || s.equalsIgnoreCase(source.getSourceType())
                            || s.equalsIgnoreCase(source.getEnvironment()));
            if (!sourceMatch) return false;
        }

        // Evaluate the policy rule if present
        Map<String, Object> rule = policy.getRule();
        if (rule != null && !rule.isEmpty()) {
            String ruleType = (String) rule.get("type");
            if ("SENSITIVITY_THRESHOLD".equals(ruleType)) {
                String minLevel = (String) rule.get("minSensitivityLevel");
                if (minLevel != null) {
                    int sourceLevel = sensitivityOrdinal(source.getSensitivityLevel());
                    int requiredLevel = sensitivityOrdinal(minLevel);
                    return sourceLevel < requiredLevel; // Violation if source is below minimum
                }
            }
            if ("ENCRYPTION_REQUIRED".equals(ruleType)) {
                // Flag as violation if source contains sensitive data without encryption tag
                if (source.getTags() == null || source.getTags().stream().noneMatch(t -> t.equalsIgnoreCase("ENCRYPTED"))) {
                    return true;
                }
            }
        }

        // Default: if the finding data type matches the policy data types, it is a violation
        return true;
    }

    private String determineSensitivityLevel(List<String> findings) {
        boolean hasCredential = findings.contains("CREDENTIAL");
        boolean hasSsn = findings.contains("SSN") || findings.contains("NATIONAL_ID");
        boolean hasFinancial = findings.contains("CREDIT_CARD") || findings.contains("ACCOUNT_NUMBER") || findings.contains("IBAN");

        if (hasCredential || hasSsn) return "CRITICAL";
        if (hasFinancial) return "HIGH";
        if (findings.contains("EMAIL") || findings.contains("PHONE") || findings.contains("ADDRESS")) return "MEDIUM";
        return "LOW";
    }

    private String determineClassification(List<String> findings) {
        if (findings.contains("CREDENTIAL") || findings.contains("SSN") || findings.contains("NATIONAL_ID")) {
            return "RESTRICTED";
        }
        if (findings.contains("CREDIT_CARD") || findings.contains("ACCOUNT_NUMBER") || findings.contains("FINANCIAL")) {
            return "CONFIDENTIAL";
        }
        if (!findings.isEmpty()) return "INTERNAL";
        return "UNCLASSIFIED";
    }

    private int sensitivityOrdinal(String level) {
        return switch (level != null ? level.toUpperCase() : "") {
            case "CRITICAL" -> 4;
            case "HIGH" -> 3;
            case "MEDIUM" -> 2;
            case "LOW" -> 1;
            default -> 0;
        };
    }
}
