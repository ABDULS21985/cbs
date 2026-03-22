package com.cbs.casemgmt.service;

import com.cbs.admin.service.AdminUserService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.casemgmt.entity.*;
import com.cbs.casemgmt.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CaseManagementService {

    private final CustomerCaseRepository caseRepository;
    private final CaseNoteRepository noteRepository;
    private final CaseAttachmentRepository attachmentRepository;
    private final AdminUserService adminUserService;

    private static final Map<String, Integer> SLA_HOURS = Map.of(
            "CRITICAL", 4, "HIGH", 8, "MEDIUM", 24, "LOW", 72);

    private static final Map<String, String> CASE_TYPE_TO_CATEGORY = Map.ofEntries(
            Map.entry("COMPLAINT", "GENERAL"), Map.entry("SERVICE_REQUEST", "GENERAL"),
            Map.entry("INQUIRY", "GENERAL"), Map.entry("DISPUTE", "PAYMENTS"),
            Map.entry("FRAUD_REPORT", "GENERAL"), Map.entry("ACCOUNT_ISSUE", "ACCOUNTS"),
            Map.entry("PAYMENT_ISSUE", "PAYMENTS"), Map.entry("CARD_ISSUE", "CARDS"),
            Map.entry("LOAN_ISSUE", "LOANS"), Map.entry("FEE_REVERSAL", "FEES"),
            Map.entry("DOCUMENT_REQUEST", "GENERAL"), Map.entry("PRODUCT_CHANGE", "GENERAL"),
            Map.entry("CLOSURE", "ACCOUNTS"), Map.entry("REGULATORY", "GENERAL"),
            Map.entry("ESCALATION", "GENERAL"));

    @Transactional
    public CustomerCase createCase(CustomerCase customerCase) {
        customerCase.setCaseNumber("CASE-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        customerCase.setStatus("OPEN");
        customerCase.setSlaDueAt(Instant.now().plus(SLA_HOURS.getOrDefault(customerCase.getPriority(), 24), ChronoUnit.HOURS));
        // Auto-derive caseCategory from caseType if not provided
        if (customerCase.getCaseCategory() == null || customerCase.getCaseCategory().isBlank()) {
            customerCase.setCaseCategory(CASE_TYPE_TO_CATEGORY.getOrDefault(customerCase.getCaseType(), "GENERAL"));
        }

        CustomerCase saved = caseRepository.save(customerCase);
        log.info("Case created: number={}, type={}, priority={}, sla_due={}", saved.getCaseNumber(),
                saved.getCaseType(), saved.getPriority(), saved.getSlaDueAt());
        return saved;
    }

    @Transactional
    public CustomerCase assignCase(String caseNumber, String assignedTo, String assignedTeam) {
        CustomerCase c = getCase(caseNumber);
        c.setAssignedTo(assignedTo);
        c.setAssignedTeam(assignedTeam);
        c.setStatus("IN_PROGRESS");
        c.setUpdatedAt(Instant.now());
        return caseRepository.save(c);
    }

    @Transactional
    public CustomerCase resolveCase(String caseNumber, String resolutionSummary, String resolutionType, String rootCause) {
        CustomerCase c = getCase(caseNumber);
        if ("RESOLVED".equals(c.getStatus()) || "CLOSED".equals(c.getStatus()))
            throw new BusinessException("Case already resolved/closed");
        c.setStatus("RESOLVED");
        c.setResolutionSummary(resolutionSummary);
        c.setResolutionType(resolutionType);
        c.setRootCause(rootCause);
        c.setResolvedAt(Instant.now());
        c.setUpdatedAt(Instant.now());
        log.info("Case resolved: number={}, type={}", caseNumber, resolutionType);
        return caseRepository.save(c);
    }

    @Transactional
    public CustomerCase escalateCase(String caseNumber, String escalatedTo, String reason) {
        CustomerCase c = getCase(caseNumber);
        c.setStatus("ESCALATED");
        c.setAssignedTo(escalatedTo);
        c.setPriority("HIGH".equals(c.getPriority()) ? "CRITICAL" : "HIGH");
        c.setSlaDueAt(Instant.now().plus(SLA_HOURS.get(c.getPriority()), ChronoUnit.HOURS));
        c.setUpdatedAt(Instant.now());
        if (reason != null && !reason.isBlank()) {
            c.setDescription(c.getDescription() != null ? c.getDescription() + "\n[Escalation reason]: " + reason : "[Escalation reason]: " + reason);
        }
        log.warn("Case escalated: number={}, to={}, newPriority={}, reason={}", caseNumber, escalatedTo, c.getPriority(), reason);
        return caseRepository.save(c);
    }

    @Transactional
    public CustomerCase escalateCase(String caseNumber, String escalatedTo) {
        return escalateCase(caseNumber, escalatedTo, null);
    }

    @Transactional
    public CaseNote addNote(String caseNumber, String content, String noteType, String createdBy) {
        CustomerCase c = getCase(caseNumber);
        CaseNote note = CaseNote.builder().caseId(c.getId()).content(content).noteType(noteType).createdBy(createdBy).build();
        return noteRepository.save(note);
    }

    @Transactional
    public int checkSlaBreaches() {
        List<CustomerCase> breachCandidates = caseRepository.findSlaBreachCandidates();
        for (CustomerCase c : breachCandidates) { c.setSlaBreached(true); caseRepository.save(c); }
        if (!breachCandidates.isEmpty()) log.warn("SLA breaches detected: count={}", breachCandidates.size());
        return breachCandidates.size();
    }

    public List<CustomerCase> getSlaBreachedCases() {
        // First mark any new breaches
        checkSlaBreaches();
        return caseRepository.findSlaBreachedCases();
    }

    public List<CustomerCase> getAllCases() {
        return caseRepository.findAll();
    }

    public List<CustomerCase> getEscalatedCases() {
        return caseRepository.findByStatusOrderByCreatedAtDesc("ESCALATED");
    }

    public List<CustomerCase> getMyCases(String username) {
        return caseRepository.findByAssignedToAndStatusNotInOrderBySlaDueAtAsc(username, List.of("CLOSED"));
    }

    @Transactional
    public CustomerCase saveCase(CustomerCase customerCase) {
        return caseRepository.save(customerCase);
    }

    public List<CustomerCase> getByCustomer(Long customerId) { return caseRepository.findByCustomerIdOrderByCreatedAtDesc(customerId); }
    public List<CustomerCase> getOpenCases() { return caseRepository.findByStatusOrderByPriorityAscSlaDueAtAsc("OPEN"); }
    public List<CaseNote> getCaseNotes(String caseNumber) { CustomerCase c = getCase(caseNumber); return noteRepository.findByCaseIdOrderByCreatedAtDesc(c.getId()); }

    public CustomerCase getCase(String number) {
        return caseRepository.findByCaseNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerCase", "caseNumber", number));
    }

    // ── Paginated + filtered case listing ────────────────────────────────

    public Page<CustomerCase> searchCases(String search, String caseType, String priority,
                                          String status, String dateFrom, String dateTo,
                                          Pageable pageable) {
        Specification<CustomerCase> spec = (root, query, cb) -> cb.conjunction();

        if (search != null && !search.isBlank()) {
            String q = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("caseNumber")), q),
                    cb.like(cb.lower(root.get("customerName")), q),
                    cb.like(cb.lower(root.get("subject")), q)
            ));
        }
        if (caseType != null && !caseType.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("caseType"), caseType));
        }
        if (priority != null && !priority.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("priority"), priority));
        }
        if (status != null && !status.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (dateFrom != null && !dateFrom.isBlank()) {
            Instant from = LocalDate.parse(dateFrom).atStartOfDay().toInstant(java.time.ZoneOffset.UTC);
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), from));
        }
        if (dateTo != null && !dateTo.isBlank()) {
            Instant to = LocalDate.parse(dateTo).plusDays(1).atStartOfDay().toInstant(java.time.ZoneOffset.UTC);
            spec = spec.and((root, query, cb) -> cb.lessThan(root.get("createdAt"), to));
        }

        return caseRepository.findAll(spec, pageable);
    }

    // ── Attachment storage (local filesystem) ────────────────────────────

    private static final Path ATTACHMENT_ROOT = Path.of("build", "document-store", "case-attachments");

    @Transactional
    public CaseAttachment uploadAttachment(String caseNumber, MultipartFile file, String uploadedBy) {
        CustomerCase c = getCase(caseNumber);
        if (file == null || file.isEmpty()) {
            throw new BusinessException("File is required");
        }

        try {
            byte[] bytes = file.getBytes();
            Path directory = ATTACHMENT_ROOT.resolve(caseNumber);
            Files.createDirectories(directory);

            String safeName = sanitizeFileName(file.getOriginalFilename());
            String storedName = UUID.randomUUID().toString().substring(0, 8) + "-" + safeName;
            Path storagePath = directory.resolve(storedName);
            Files.write(storagePath, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

            CaseAttachment att = CaseAttachment.builder()
                    .caseId(c.getId())
                    .filename(storedName)
                    .originalFilename(safeName)
                    .fileSize(file.getSize())
                    .mimeType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                    .storagePath(storagePath.toAbsolutePath().toString())
                    .checksum(sha256(bytes))
                    .uploadedBy(uploadedBy)
                    .build();

            CaseAttachment saved = attachmentRepository.save(att);
            log.info("Case attachment uploaded: case={}, file={}, size={}", caseNumber, safeName, file.getSize());
            return saved;
        } catch (IOException ex) {
            throw new BusinessException("Failed to store attachment: " + ex.getMessage());
        }
    }

    public byte[] downloadAttachment(Long attachmentId) {
        CaseAttachment att = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("CaseAttachment", "id", attachmentId));
        try {
            Path file = Path.of(att.getStoragePath());
            if (!Files.exists(file)) {
                throw new BusinessException("Attachment file not found on disk");
            }
            return Files.readAllBytes(file);
        } catch (IOException ex) {
            throw new BusinessException("Failed to read attachment: " + ex.getMessage());
        }
    }

    public List<CaseAttachment> getCaseAttachments(Long caseId) {
        return attachmentRepository.findByCaseIdOrderByUploadedAtDesc(caseId);
    }

    private String sanitizeFileName(String originalName) {
        String safe = originalName == null || originalName.isBlank() ? "attachment" : originalName;
        return safe.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private String sha256(byte[] bytes) {
        try {
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }

    // ── User display name resolution ─────────────────────────────────────

    /**
     * Resolves a username (assignedTo) to a display name via Keycloak.
     * Falls back to the raw username when Keycloak is not configured.
     */
    public String resolveDisplayName(String username) {
        if (username == null || username.isBlank()) return null;
        try {
            Map<String, Map<String, Object>> index = adminUserService.getUsernameIndex();
            Map<String, Object> kcUser = index.get(username.toLowerCase());
            if (kcUser != null) {
                String first = kcUser.get("firstName") != null ? kcUser.get("firstName").toString() : "";
                String last = kcUser.get("lastName") != null ? kcUser.get("lastName").toString() : "";
                String full = (first + " " + last).trim();
                return full.isEmpty() ? username : full;
            }
        } catch (Exception e) {
            log.debug("Could not resolve display name for {}: {}", username, e.getMessage());
        }
        return username;
    }

    // ── Compensation approval ────────────────────────────────────────────

    @Transactional
    public CustomerCase approveCompensation(String caseNumber, String approvedBy) {
        CustomerCase c = getCase(caseNumber);
        if (c.getCompensationAmount() == null) {
            throw new BusinessException("No compensation amount set on this case");
        }
        if (Boolean.TRUE.equals(c.getCompensationApproved())) {
            throw new BusinessException("Compensation already approved");
        }
        c.setCompensationApproved(true);
        c.setCompensationApprovedBy(approvedBy);
        c.setCompensationApprovedAt(Instant.now());
        c.setCompensationRejectionReason(null);
        c.setUpdatedAt(Instant.now());
        log.info("Compensation approved: case={}, amount={}, by={}", caseNumber, c.getCompensationAmount(), approvedBy);
        return caseRepository.save(c);
    }

    @Transactional
    public CustomerCase rejectCompensation(String caseNumber, String rejectedBy, String reason) {
        CustomerCase c = getCase(caseNumber);
        if (c.getCompensationAmount() == null) {
            throw new BusinessException("No compensation amount set on this case");
        }
        c.setCompensationApproved(false);
        c.setCompensationApprovedBy(rejectedBy);
        c.setCompensationApprovedAt(Instant.now());
        c.setCompensationRejectionReason(reason);
        c.setUpdatedAt(Instant.now());
        log.info("Compensation rejected: case={}, amount={}, by={}, reason={}", caseNumber, c.getCompensationAmount(), rejectedBy, reason);
        return caseRepository.save(c);
    }

    @Transactional
    public CustomerCase setCompensation(String caseNumber, java.math.BigDecimal amount) {
        CustomerCase c = getCase(caseNumber);
        c.setCompensationAmount(amount);
        c.setCompensationApproved(null);
        c.setCompensationApprovedBy(null);
        c.setCompensationApprovedAt(null);
        c.setCompensationRejectionReason(null);
        c.setUpdatedAt(Instant.now());
        return caseRepository.save(c);
    }
}
