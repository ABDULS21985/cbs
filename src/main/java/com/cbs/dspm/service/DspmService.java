package com.cbs.dspm.service;

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

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DspmService {

    private final DspmDataSourceRepository dataSourceRepository;
    private final DspmScanRepository scanRepository;
    private final DspmPolicyRepository policyRepository;
    private final DspmExceptionRepository exceptionRepository;
    private final DspmIdentityRepository identityRepository;
    private final DspmAccessAuditRepository accessAuditRepository;

    // ── Data Sources ────────────────────────────────────────────────────────

    public List<DspmDataSource> getAllDataSources() {
        return dataSourceRepository.findAll(Sort.by(Sort.Direction.ASC, "sourceName"));
    }

    @Transactional
    public DspmDataSource createDataSource(DspmDataSource source) {
        source.setSourceCode("DS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return dataSourceRepository.save(source);
    }

    public DspmDataSource getDataSourceByCode(String code) {
        return dataSourceRepository.findBySourceCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("DspmDataSource", "sourceCode", code));
    }

    // ── Scans (CONFIGURABLE — accepts scope, assetTypes, fullScan) ──────────

    public List<DspmScan> getAllScans() {
        return scanRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @Transactional
    public DspmScan startScan(DspmScan scan) {
        scan.setScanCode("SCN-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        scan.setStatus("IN_PROGRESS");
        scan.setStartedAt(Instant.now());
        // scope, assetTypes, and fullScan are persisted from the request body
        log.info("Starting DSPM scan {} with scope={}, assetTypes={}, fullScan={}",
                scan.getScanCode(), scan.getScope(), scan.getAssetTypes(), scan.getFullScan());
        return scanRepository.save(scan);
    }

    @Transactional
    public DspmScan completeScan(String scanCode, int issuesFound, int critical, int high, int medium, int low) {
        DspmScan scan = scanRepository.findByScanCode(scanCode)
                .orElseThrow(() -> new ResourceNotFoundException("DspmScan", "scanCode", scanCode));
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
        return scanRepository.save(scan);
    }

    // ── Policies ────────────────────────────────────────────────────────────

    public List<DspmPolicy> getAllPolicies() {
        return policyRepository.findAll(Sort.by(Sort.Direction.ASC, "policyName"));
    }

    @Transactional
    public DspmPolicy createPolicy(DspmPolicy policy) {
        policy.setPolicyCode("POL-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (policy.getStatus() == null) policy.setStatus("DRAFT");
        return policyRepository.save(policy);
    }

    @Transactional
    public DspmPolicy activatePolicy(String policyCode) {
        DspmPolicy policy = policyRepository.findByPolicyCode(policyCode)
                .orElseThrow(() -> new ResourceNotFoundException("DspmPolicy", "policyCode", policyCode));
        policy.setStatus("ACTIVE");
        return policyRepository.save(policy);
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
        return policyRepository.save(policy);
    }

    // ── Exceptions (SORTABLE — accepts sort/order via Pageable) ─────────────

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
        exception.setExceptionCode("EXC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return exceptionRepository.save(exception);
    }

    @Transactional
    public DspmException approveException(String exceptionCode, String approvedBy) {
        DspmException exc = exceptionRepository.findByExceptionCode(exceptionCode)
                .orElseThrow(() -> new ResourceNotFoundException("DspmException", "exceptionCode", exceptionCode));
        exc.setStatus("APPROVED");
        exc.setApprovedBy(approvedBy);
        exc.setApprovedAt(Instant.now());
        return exceptionRepository.save(exc);
    }

    @Transactional
    public DspmException rejectException(String exceptionCode) {
        DspmException exc = exceptionRepository.findByExceptionCode(exceptionCode)
                .orElseThrow(() -> new ResourceNotFoundException("DspmException", "exceptionCode", exceptionCode));
        exc.setStatus("REJECTED");
        return exceptionRepository.save(exc);
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
        identity.setIdentityCode("IDN-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return identityRepository.save(identity);
    }

    // ── Access Audit (for Identity Audit Trail) ─────────────────────────────

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
        audit.setAuditCode("AUD-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return accessAuditRepository.save(audit);
    }
}
