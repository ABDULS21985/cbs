package com.cbs.intelligence.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.intelligence.entity.DocumentProcessingJob;
import com.cbs.intelligence.ocr.OcrProvider;
import com.cbs.intelligence.ocr.OcrResult;
import com.cbs.intelligence.repository.DocumentProcessingJobRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DocumentProcessingService {

    private final DocumentProcessingJobRepository jobRepository;
    private final OcrProvider ocrProvider;

    @PostConstruct
    void logProviderStatus() {
        if (ocrProvider.isAvailable()) {
            log.info("Document processing using OCR provider: {}", ocrProvider.getName());
        } else {
            log.warn("No OCR provider is configured (active provider: '{}').  " +
                    "All document jobs will be routed to MANUAL_REVIEW.  " +
                    "Wire an OcrProvider bean to enable automatic extraction.",
                    ocrProvider.getName());
        }
    }

    @Transactional
    public DocumentProcessingJob submitJob(DocumentProcessingJob job) {
        job.setJobId("DOC-" + java.util.UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        job.setVerificationStatus("PROCESSING");
        long start = System.currentTimeMillis();

        try {
            OcrResult result = ocrProvider.extract(
                    job.getDocumentType(), job.getProcessingType(), job.getInputFormat());

            job.setExtractedData(result.getExtractedData());
            job.setFlags(result.getFlags());
            job.setConfidenceScore(BigDecimal.valueOf(result.getConfidenceScore()));
            job.setProcessingTimeMs((int) (System.currentTimeMillis() - start));
            job.setModelUsed(ocrProvider.getName());

            // Route based on confidence and flags
            //   ≥ 90% and no flags    → VERIFIED (auto-approved)
            //   60–89%                → EXTRACTED (human spot-check recommended)
            //   < 60%                 → MANUAL_REVIEW (full human review required)
            BigDecimal confidence = job.getConfidenceScore();
            if (confidence.compareTo(new BigDecimal("90")) >= 0 && result.getFlags().isEmpty()) {
                job.setVerificationStatus("VERIFIED");
            } else if (confidence.compareTo(new BigDecimal("60")) >= 0) {
                job.setVerificationStatus("EXTRACTED");
            } else {
                job.setVerificationStatus("MANUAL_REVIEW");
            }

            log.info("Document job submitted: jobId={}, type={}, provider={}, confidence={}%, status={}, flags={}",
                    job.getJobId(), job.getDocumentType(), ocrProvider.getName(),
                    job.getConfidenceScore(), job.getVerificationStatus(), result.getFlags().size());

        } catch (Exception e) {
            job.setVerificationStatus("FAILED");
            job.setProcessingTimeMs((int) (System.currentTimeMillis() - start));
            log.error("Document processing failed: jobId={}, provider={}, error={}",
                    job.getJobId(), ocrProvider.getName(), e.getMessage());
        }

        return jobRepository.save(job);
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

    /**
     * Returns all jobs that require human review — both MANUAL_REVIEW (confidence too low for
     * auto-approval) and EXTRACTED (confidence in 60–89% range, ready for human spot-check).
     * Matches the frontend's pending tab which handles both statuses.
     */
    public List<DocumentProcessingJob> getPendingReview() {
        return jobRepository.findByVerificationStatusInOrderByCreatedAtDesc(
                List.of("MANUAL_REVIEW", "EXTRACTED"));
    }

    public List<DocumentProcessingJob> getAllJobs() {
        return jobRepository.findAll();
    }

    /** Returns whether the configured OCR provider can perform automatic extraction. */
    public boolean isOcrAvailable() {
        return ocrProvider.isAvailable();
    }

    /** Human-readable name of the active OCR provider (shown in API status responses). */
    public String getOcrProviderName() {
        return ocrProvider.getName();
    }
}
