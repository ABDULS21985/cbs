package com.cbs.intelligence.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.intelligence.entity.DocumentProcessingJob;
import com.cbs.intelligence.repository.DocumentProcessingJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class DocumentProcessingService {

    private final DocumentProcessingJobRepository jobRepository;

    @Transactional
    public DocumentProcessingJob submitJob(DocumentProcessingJob job) {
        job.setJobId("DOC-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        job.setVerificationStatus("PROCESSING");
        long start = System.currentTimeMillis();

        try {
            Map<String, Object> extracted = extractDocumentData(job.getDocumentType(), job.getProcessingType());
            List<String> flags = detectFlags(job.getDocumentType(), extracted);

            job.setExtractedData(extracted);
            job.setFlags(flags);
            job.setConfidenceScore(calculateConfidence(extracted, flags));
            job.setProcessingTimeMs((int)(System.currentTimeMillis() - start));
            job.setModelUsed("MANUAL_REVIEW_REQUIRED");

            // With no OCR integration, confidence is 0.0 and extracted data is empty,
            // so the document always routes to MANUAL_REVIEW — no auto-approval.
            if (job.getConfidenceScore().compareTo(new BigDecimal("90")) >= 0 && flags.isEmpty()) {
                job.setVerificationStatus("VERIFIED");
            } else if (job.getConfidenceScore().compareTo(new BigDecimal("60")) >= 0) {
                job.setVerificationStatus("EXTRACTED");
            } else {
                job.setVerificationStatus("MANUAL_REVIEW");
            }

            log.info("Document job submitted: jobId={}, type={}, confidence={}%, status={}, flags={}",
                    job.getJobId(), job.getDocumentType(), job.getConfidenceScore(), job.getVerificationStatus(), flags.size());
        } catch (Exception e) {
            job.setVerificationStatus("FAILED");
            job.setProcessingTimeMs((int)(System.currentTimeMillis() - start));
            log.error("Document processing failed: jobId={}, error={}", job.getJobId(), e.getMessage());
        }

        return jobRepository.save(job);
    }

    /**
     * Attempt to extract structured data from a document image or file.
     *
     * No OCR provider (AWS Textract, Google Vision, Azure Form Recognizer) is
     * configured in this deployment.  An empty map is returned so that the
     * confidence score stays at 0.0 and the job is routed to MANUAL_REVIEW
     * rather than being auto-approved on fake "EXTRACTED" strings.
     *
     * To enable real extraction: add the provider SDK to build.gradle.kts,
     * inject its client here, and replace this method body with the actual
     * provider call.
     */
    private Map<String, Object> extractDocumentData(String documentType, String processingType) {
        log.warn("Document extraction not configured. Document type {} requires OCR integration (jobType={}).",
                documentType, processingType);
        return Map.of(); // Empty — triggers MANUAL_REVIEW workflow
    }

    private List<String> detectFlags(String documentType, Map<String, Object> extracted) {
        List<String> flags = new ArrayList<>();
        // No tamper detection or face matching is implemented.
        // Always flag that OCR has not run so reviewers know to perform manual checks.
        flags.add("WARN:OCR_NOT_CONFIGURED");
        if (extracted.isEmpty()) {
            flags.add("WARN:NO_DATA_EXTRACTED");
        }
        return flags;
    }

    /**
     * Confidence score.
     * With no OCR result the score is 0.0, ensuring every document goes to
     * MANUAL_REVIEW until a real extraction service is wired in.
     */
    private BigDecimal calculateConfidence(Map<String, Object> extracted, List<String> flags) {
        if (extracted.isEmpty()) {
            return BigDecimal.ZERO;
        }
        double base = 95.0;
        base -= flags.size() * 5;
        base -= (extracted.values().stream().filter(v -> v == null).count()) * 10;
        return BigDecimal.valueOf(Math.max(10, Math.min(100, base)));
    }

    @Transactional
    public DocumentProcessingJob markReviewed(String jobId, String reviewedBy, String newStatus) {
        DocumentProcessingJob job = jobRepository.findByJobId(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("DocumentProcessingJob", "jobId", jobId));
        job.setReviewedBy(reviewedBy);
        job.setReviewedAt(Instant.now());
        job.setVerificationStatus(newStatus);
        return jobRepository.save(job);
    }

    public List<DocumentProcessingJob> getPendingReview() {
        return jobRepository.findByVerificationStatusOrderByCreatedAtDesc("MANUAL_REVIEW");
    }

    public java.util.List<DocumentProcessingJob> getAllJobs() {
        return jobRepository.findAll();
    }

}
