package com.cbs.account.service;

import com.cbs.account.dto.TransactionWorkflowDto;
import com.cbs.account.entity.TransactionDispute;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.repository.TransactionDisputeRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.audit.CurrentCustomerProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.document.entity.Document;
import com.cbs.document.entity.DocumentType;
import com.cbs.document.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransactionDisputeService {

    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024L * 1024L;

    @org.springframework.beans.factory.annotation.Value("${document.storage.base-path:/var/data/document-store}")
    private String storageBasePath;

    private final TransactionService transactionService;
    private final TransactionDisputeRepository transactionDisputeRepository;
    private final CurrentActorProvider currentActorProvider;
    private final CurrentCustomerProvider currentCustomerProvider;
    private final DocumentService documentService;
    private final TransactionAuditService transactionAuditService;

    @Transactional
    public TransactionWorkflowDto.DisputeRecord fileDispute(Long transactionId,
                                                            TransactionWorkflowDto.DisputeActionRequest request,
                                                            String reasonCode,
                                                            String contactEmail,
                                                            String contactPhone,
                                                            List<MultipartFile> files) {
        TransactionJournal transaction = transactionService.getTransactionEntity(transactionId);
        enforcePortalOwnership(transaction);
        validateDisputeWindow(transaction);

        String actor = currentActorProvider.getCurrentActor();
        Long sequence = transactionDisputeRepository.nextDisputeSequence();
        String disputeRef = "DIS-" + LocalDate.now().getYear() + "-" + String.format("%06d", sequence);

        TransactionDispute dispute = TransactionDispute.builder()
                .disputeRef(disputeRef)
                .transaction(transaction)
                .transactionRef(transaction.getTransactionRef())
                .accountId(transaction.getAccount().getId())
                .customerId(transaction.getAccount().getCustomer().getId())
                .amount(transaction.getAmount())
                .currencyCode(transaction.getCurrencyCode())
                .reasonCode(reasonCode)
                .description(request != null ? request.getNotes() : null)
                .contactEmail(contactEmail)
                .contactPhone(contactPhone)
                .status("PENDING")
                .filedAt(Instant.now())
                .lastUpdatedAt(Instant.now())
                .filedBy(actor)
                .updatedBy(actor)
                .supportingDocumentIds(new ArrayList<>())
                .build();
        dispute = transactionDisputeRepository.save(dispute);

        List<Long> documentIds = storeSupportingDocuments(dispute, files);
        dispute.setSupportingDocumentIds(documentIds);
        dispute.setLastUpdatedAt(Instant.now());
        dispute = transactionDisputeRepository.save(dispute);

        transactionAuditService.recordEvent(
                transaction,
                "DISPUTED",
                "Dispute " + disputeRef + " raised",
                transaction.getChannel() != null ? transaction.getChannel().name() : null,
                Map.of("disputeRef", disputeRef, "reasonCode", reasonCode)
        );
        return toDto(dispute);
    }

    public Page<TransactionWorkflowDto.DisputeRecord> listDisputes(String status, Pageable pageable) {
        Page<TransactionDispute> page;
        if (isPortalScopedPrincipal()) {
            Long customerId = currentCustomerProvider.getCurrentCustomer().getId();
            page = StringUtils.hasText(status)
                    ? transactionDisputeRepository.findByCustomerIdAndStatusOrderByLastUpdatedAtDesc(customerId, status.trim().toUpperCase(Locale.ROOT), pageable)
                    : transactionDisputeRepository.findByCustomerIdOrderByLastUpdatedAtDesc(customerId, pageable);
        } else {
            page = StringUtils.hasText(status)
                    ? transactionDisputeRepository.findByStatusOrderByLastUpdatedAtDesc(status.trim().toUpperCase(Locale.ROOT), pageable)
                    : transactionDisputeRepository.findAllByOrderByLastUpdatedAtDesc(pageable);
        }
        return page.map(this::toDto);
    }

    public TransactionWorkflowDto.DisputeDashboard getDashboard() {
        Long customerId = isPortalScopedPrincipal() ? currentCustomerProvider.getCurrentCustomer().getId() : null;
        long pending = countByStatus(customerId, "PENDING");
        long underReview = countByStatus(customerId, "UNDER_REVIEW");
        long resolved = countByStatus(customerId, "RESOLVED")
                + countByStatus(customerId, "REJECTED");
        long escalated = countByStatus(customerId, "ESCALATED");
        return TransactionWorkflowDto.DisputeDashboard.builder()
                .total(pending + underReview + resolved + escalated)
                .pendingResponse(pending)
                .underReview(underReview)
                .resolved(resolved)
                .escalated(escalated)
                .build();
    }

    public TransactionWorkflowDto.DisputeRecord getDispute(Long id) {
        return toDto(findDispute(id));
    }

    @Transactional
    public TransactionWorkflowDto.DisputeRecord respond(Long id, TransactionWorkflowDto.DisputeActionRequest request) {
        TransactionDispute dispute = findDispute(id);
        dispute.setStatus("UNDER_REVIEW");
        dispute.setResponseNotes(request != null ? request.getResponse() : null);
        dispute.setLastUpdatedAt(Instant.now());
        dispute.setUpdatedBy(currentActorProvider.getCurrentActor());
        transactionAuditService.recordEvent(
                dispute.getTransaction(),
                "DISPUTE_RESPONSE",
                "Dispute " + dispute.getDisputeRef() + " moved to review",
                dispute.getTransaction().getChannel() != null ? dispute.getTransaction().getChannel().name() : null,
                Map.of("disputeRef", dispute.getDisputeRef())
        );
        return toDto(transactionDisputeRepository.save(dispute));
    }

    @Transactional
    public TransactionWorkflowDto.DisputeRecord escalate(Long id, TransactionWorkflowDto.DisputeActionRequest request) {
        TransactionDispute dispute = findDispute(id);
        dispute.setStatus("ESCALATED");
        dispute.setEscalationNotes(request != null ? request.getNotes() : null);
        dispute.setLastUpdatedAt(Instant.now());
        dispute.setUpdatedBy(currentActorProvider.getCurrentActor());
        transactionAuditService.recordEvent(
                dispute.getTransaction(),
                "DISPUTE_ESCALATED",
                "Dispute " + dispute.getDisputeRef() + " escalated",
                dispute.getTransaction().getChannel() != null ? dispute.getTransaction().getChannel().name() : null,
                Map.of("disputeRef", dispute.getDisputeRef())
        );
        return toDto(transactionDisputeRepository.save(dispute));
    }

    @Transactional
    public TransactionWorkflowDto.DisputeRecord close(Long id, TransactionWorkflowDto.DisputeActionRequest request) {
        TransactionDispute dispute = findDispute(id);
        String outcome = "REJECTED".equalsIgnoreCase(request != null ? request.getResponse() : null) ? "REJECTED" : "RESOLVED";
        dispute.setStatus(outcome);
        dispute.setClosingNotes(request != null ? request.getNotes() : null);
        dispute.setLastUpdatedAt(Instant.now());
        dispute.setUpdatedBy(currentActorProvider.getCurrentActor());
        dispute.setClosedAt(Instant.now());
        dispute.setClosedBy(currentActorProvider.getCurrentActor());
        transactionAuditService.recordEvent(
                dispute.getTransaction(),
                "DISPUTE_CLOSED",
                "Dispute " + dispute.getDisputeRef() + " closed as " + outcome,
                dispute.getTransaction().getChannel() != null ? dispute.getTransaction().getChannel().name() : null,
                Map.of("disputeRef", dispute.getDisputeRef(), "status", outcome)
        );
        return toDto(transactionDisputeRepository.save(dispute));
    }

    public TransactionWorkflowDto.DisputeSummary getLatestDisputeSummary(Long transactionId) {
        return transactionDisputeRepository.findTopByTransactionIdOrderByFiledAtDesc(transactionId)
                .map(dispute -> TransactionWorkflowDto.DisputeSummary.builder()
                        .id(dispute.getId())
                        .disputeRef(dispute.getDisputeRef())
                        .reasonCode(dispute.getReasonCode())
                        .status(dispute.getStatus())
                        .filedAt(dispute.getFiledAt())
                        .lastUpdatedAt(dispute.getLastUpdatedAt())
                        .build())
                .orElse(null);
    }

    private TransactionDispute findDispute(Long id) {
        TransactionDispute dispute = transactionDisputeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TransactionDispute", "id", id));
        enforcePortalOwnership(dispute);
        return dispute;
    }

    private void validateDisputeWindow(TransactionJournal transaction) {
        if (!"POSTED".equalsIgnoreCase(transaction.getStatus()) || Boolean.TRUE.equals(transaction.getIsReversed())) {
            throw new BusinessException("Only completed unreversed transactions can be disputed", "INVALID_DISPUTE_STATUS");
        }
        if (transaction.getPostingDate() != null && transaction.getPostingDate().isBefore(LocalDate.now().minusDays(90))) {
            throw new BusinessException("Only transactions from the last 90 days can be disputed", "DISPUTE_WINDOW_EXPIRED");
        }
    }

    private List<Long> storeSupportingDocuments(TransactionDispute dispute, List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            return List.of();
        }
        if (files.size() > 3) {
            throw new BusinessException("A maximum of 3 supporting documents is allowed", "TOO_MANY_DOCUMENTS");
        }

        List<Long> documentIds = new ArrayList<>();
        Path directory = Path.of(storageBasePath, "transactions", "disputes", dispute.getDisputeRef());
        try {
            Files.createDirectories(directory);
            for (MultipartFile file : files) {
                if (file == null || file.isEmpty()) {
                    continue;
                }
                if (file.getSize() > MAX_FILE_SIZE_BYTES) {
                    throw new BusinessException("Supporting documents must be 5MB or smaller", "DOCUMENT_TOO_LARGE");
                }
                String safeName = sanitizeFileName(file.getOriginalFilename());
                byte[] content = file.getBytes();
                Path storagePath = directory.resolve(UUID.randomUUID() + "-" + safeName);
                Files.write(storagePath, content, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
                Document document = documentService.uploadDocument(
                        dispute.getCustomerId(),
                        DocumentType.OTHER,
                        safeName,
                        normalizeFileType(file.getContentType(), safeName),
                        file.getSize(),
                        storagePath.toAbsolutePath().toString(),
                        sha256(content),
                        "Transaction dispute " + dispute.getDisputeRef(),
                        List.of("transaction-dispute", dispute.getDisputeRef()),
                        null,
                        dispute.getAccountId(),
                        null
                );
                documentIds.add(document.getId());
            }
        } catch (IOException ex) {
            throw new BusinessException("Failed to store supporting documents: " + ex.getMessage(), "DOCUMENT_STORE_FAILED");
        }
        return documentIds;
    }

    private String sanitizeFileName(String originalName) {
        String safe = StringUtils.hasText(originalName) ? originalName : "supporting-document";
        return safe.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private String normalizeFileType(String contentType, String fileName) {
        if (StringUtils.hasText(contentType) && contentType.length() <= 20) {
            return contentType;
        }
        int dot = fileName.lastIndexOf('.');
        if (dot >= 0 && dot < fileName.length() - 1) {
            String ext = fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
            return ext.length() > 20 ? ext.substring(0, 20) : ext;
        }
        return "bin";
    }

    private String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }

    private TransactionWorkflowDto.DisputeRecord toDto(TransactionDispute dispute) {
        return TransactionWorkflowDto.DisputeRecord.builder()
                .id(dispute.getId())
                .disputeRef(dispute.getDisputeRef())
                .transactionId(dispute.getTransaction().getId())
                .transactionRef(dispute.getTransactionRef())
                .amount(dispute.getAmount())
                .currencyCode(dispute.getCurrencyCode())
                .reasonCode(dispute.getReasonCode())
                .description(dispute.getDescription())
                .contactEmail(dispute.getContactEmail())
                .contactPhone(dispute.getContactPhone())
                .status(dispute.getStatus())
                .assignedTo(dispute.getAssignedTo())
                .filedAt(dispute.getFiledAt())
                .filedBy(dispute.getFiledBy())
                .lastUpdatedAt(dispute.getLastUpdatedAt())
                .updatedBy(dispute.getUpdatedBy())
                .closedAt(dispute.getClosedAt())
                .closedBy(dispute.getClosedBy())
                .responseNotes(dispute.getResponseNotes())
                .escalationNotes(dispute.getEscalationNotes())
                .closingNotes(dispute.getClosingNotes())
                .supportingDocumentIds(dispute.getSupportingDocumentIds())
                .build();
    }

    private long countByStatus(Long customerId, String status) {
        return customerId == null
                ? transactionDisputeRepository.countByStatus(status)
                : transactionDisputeRepository.countByCustomerIdAndStatus(customerId, status);
    }

    private void enforcePortalOwnership(TransactionJournal transaction) {
        if (!isPortalScopedPrincipal()) {
            return;
        }
        Long currentCustomerId = currentCustomerProvider.getCurrentCustomer().getId();
        if (!Objects.equals(transaction.getAccount().getCustomer().getId(), currentCustomerId)) {
            throw new BusinessException("You do not have access to this transaction dispute", "DISPUTE_ACCESS_DENIED");
        }
    }

    private void enforcePortalOwnership(TransactionDispute dispute) {
        if (!isPortalScopedPrincipal()) {
            return;
        }
        Long currentCustomerId = currentCustomerProvider.getCurrentCustomer().getId();
        if (!Objects.equals(dispute.getCustomerId(), currentCustomerId)) {
            throw new BusinessException("You do not have access to this dispute", "DISPUTE_ACCESS_DENIED");
        }
    }

    private boolean isPortalScopedPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }
        boolean portalUser = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_PORTAL_USER".equals(authority.getAuthority()));
        boolean staffUser = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_CBS_ADMIN".equals(authority.getAuthority())
                        || "ROLE_CBS_OFFICER".equals(authority.getAuthority()));
        return portalUser && !staffUser;
    }
}
