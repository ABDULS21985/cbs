package com.cbs.document.repository;

import com.cbs.document.entity.Document;
import com.cbs.document.entity.DocumentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    Optional<Document> findByDocumentRef(String documentRef);
    Page<Document> findByCustomerIdAndIsActiveTrueOrderByCreatedAtDesc(Long customerId, Pageable pageable);
    Page<Document> findByCustomerIdAndDocumentTypeAndIsActiveTrue(Long customerId, DocumentType type, Pageable pageable);
    Page<Document> findByVerificationStatusOrderByCreatedAtAsc(String status, Pageable pageable);
}
