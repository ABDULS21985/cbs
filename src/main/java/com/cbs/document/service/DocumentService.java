package com.cbs.document.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.document.entity.*;
import com.cbs.document.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DocumentService {

    private final DocumentRepository documentRepository;

    @Transactional
    public Document uploadDocument(Long customerId, DocumentType type, String fileName, String fileType,
                                     Long fileSizeBytes, String storagePath, String checksum,
                                     String description, List<String> tags, java.time.LocalDate expiryDate,
                                     Long accountId, Long loanAccountId) {
        String ref = "DOC-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
        Document doc = Document.builder()
                .documentRef(ref).documentType(type)
                .customerId(customerId).accountId(accountId).loanAccountId(loanAccountId)
                .fileName(fileName).fileType(fileType).fileSizeBytes(fileSizeBytes)
                .storagePath(storagePath).checksum(checksum)
                .description(description).tags(tags != null ? tags : List.of())
                .expiryDate(expiryDate).verificationStatus("PENDING").build();
        Document saved = documentRepository.save(doc);
        log.info("Document uploaded: ref={}, type={}, customer={}", ref, type, customerId);
        return saved;
    }

    public Document getDocument(Long id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", id));
    }

    public Page<Document> getCustomerDocuments(Long customerId, Pageable pageable) {
        return documentRepository.findByCustomerIdAndIsActiveTrueOrderByCreatedAtDesc(customerId, pageable);
    }

    public Page<Document> getPendingVerification(Pageable pageable) {
        return documentRepository.findByVerificationStatusOrderByCreatedAtAsc("PENDING", pageable);
    }

    public List<Document> getLoanAccountDocuments(Long loanAccountId) {
        return documentRepository.findByLoanAccountIdAndIsActiveTrueOrderByCreatedAtDesc(loanAccountId);
    }

    @Transactional
    public Document verifyDocument(Long docId, String verifiedBy) {
        Document doc = getDocument(docId);
        doc.setVerificationStatus("VERIFIED");
        doc.setVerifiedBy(verifiedBy);
        doc.setVerifiedAt(Instant.now());
        log.info("Document verified: ref={}, by={}", doc.getDocumentRef(), verifiedBy);
        return documentRepository.save(doc);
    }

    @Transactional
    public Document rejectDocument(Long docId, String rejectedBy, String reason) {
        Document doc = getDocument(docId);
        doc.setVerificationStatus("REJECTED");
        doc.setVerifiedBy(rejectedBy);
        doc.setVerifiedAt(Instant.now());
        doc.setRejectionReason(reason);
        log.info("Document rejected: ref={}, reason={}", doc.getDocumentRef(), reason);
        return documentRepository.save(doc);
    }

    public Page<Document> getAllDocuments(org.springframework.data.domain.Pageable pageable) {
        return documentRepository.findAll(pageable);
    }

    @Transactional
    public Document uploadMultipartDocument(Long customerId, DocumentType type, MultipartFile file,
                                            String description, List<String> tags, LocalDate expiryDate,
                                            Long accountId, Long loanAccountId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Document file is required");
        }

        try {
            byte[] bytes = file.getBytes();
            Path directory = Path.of("build", "document-store", "loans", String.valueOf(loanAccountId));
            Files.createDirectories(directory);

            String originalName = sanitizeFileName(file.getOriginalFilename());
            Path storagePath = directory.resolve(UUID.randomUUID() + "-" + originalName);
            Files.write(storagePath, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

            return uploadDocument(
                    customerId,
                    type,
                    originalName,
                    normalizeFileType(file.getContentType(), originalName),
                    file.getSize(),
                    storagePath.toAbsolutePath().toString(),
                    sha256(bytes),
                    description,
                    tags,
                    expiryDate,
                    accountId,
                    loanAccountId
            );
        } catch (IOException ex) {
            throw new BusinessException("Failed to store document: " + ex.getMessage());
        }
    }

    private String sanitizeFileName(String originalName) {
        String safe = originalName == null || originalName.isBlank() ? "document" : originalName;
        return safe.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private String normalizeFileType(String contentType, String fileName) {
        String candidate = contentType != null && !contentType.isBlank() ? contentType : "";
        if (candidate.length() > 20 || candidate.isBlank()) {
            int dot = fileName.lastIndexOf('.');
            candidate = dot >= 0 && dot < fileName.length() - 1
                    ? fileName.substring(dot + 1).toLowerCase(Locale.ROOT)
                    : "bin";
        }
        return candidate.length() > 20 ? candidate.substring(0, 20) : candidate;
    }

    private String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }
}
