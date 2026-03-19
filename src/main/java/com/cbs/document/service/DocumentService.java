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

import java.time.Instant;
import java.util.List;
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
}