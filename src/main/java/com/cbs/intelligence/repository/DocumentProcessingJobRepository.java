package com.cbs.intelligence.repository;

import com.cbs.intelligence.entity.DocumentProcessingJob;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DocumentProcessingJobRepository extends JpaRepository<DocumentProcessingJob, Long> {
    Optional<DocumentProcessingJob> findByJobId(String jobId);
    List<DocumentProcessingJob> findByVerificationStatusOrderByCreatedAtDesc(String status);
    List<DocumentProcessingJob> findByDocumentTypeAndVerificationStatusOrderByCreatedAtDesc(String docType, String status);
}
