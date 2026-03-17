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
            Map<String, Object> extracted = simulateExtraction(job.getDocumentType(), job.getProcessingType());
            List<String> flags = detectFlags(job.getDocumentType(), extracted);

            job.setExtractedData(extracted);
            job.setFlags(flags);
            job.setConfidenceScore(calculateConfidence(extracted, flags));
            job.setProcessingTimeMs((int)(System.currentTimeMillis() - start));
            job.setModelUsed("cbs-doc-ai-v2.1");

            if (job.getConfidenceScore().compareTo(new BigDecimal("90")) >= 0 && flags.isEmpty()) {
                job.setVerificationStatus("VERIFIED");
            } else if (job.getConfidenceScore().compareTo(new BigDecimal("60")) >= 0) {
                job.setVerificationStatus("EXTRACTED");
            } else {
                job.setVerificationStatus("MANUAL_REVIEW");
            }

            log.info("Document processed: jobId={}, type={}, confidence={}%, status={}, flags={}",
                    job.getJobId(), job.getDocumentType(), job.getConfidenceScore(), job.getVerificationStatus(), flags.size());
        } catch (Exception e) {
            job.setVerificationStatus("FAILED");
            job.setProcessingTimeMs((int)(System.currentTimeMillis() - start));
            log.error("Document processing failed: jobId={}, error={}", job.getJobId(), e.getMessage());
        }

        return jobRepository.save(job);
    }

    private Map<String, Object> simulateExtraction(String documentType, String processingType) {
        Map<String, Object> data = new LinkedHashMap<>();
        switch (documentType) {
            case "NATIONAL_ID" -> { data.put("full_name", "EXTRACTED"); data.put("id_number", "EXTRACTED"); data.put("date_of_birth", "EXTRACTED"); data.put("expiry_date", "EXTRACTED"); data.put("nationality", "EXTRACTED"); }
            case "PASSPORT" -> { data.put("full_name", "EXTRACTED"); data.put("passport_number", "EXTRACTED"); data.put("nationality", "EXTRACTED"); data.put("date_of_birth", "EXTRACTED"); data.put("expiry_date", "EXTRACTED"); data.put("mrz_line1", "EXTRACTED"); data.put("mrz_line2", "EXTRACTED"); }
            case "BANK_STATEMENT" -> { data.put("account_holder", "EXTRACTED"); data.put("account_number", "EXTRACTED"); data.put("period", "EXTRACTED"); data.put("opening_balance", "EXTRACTED"); data.put("closing_balance", "EXTRACTED"); data.put("transaction_count", "EXTRACTED"); }
            case "PAY_SLIP" -> { data.put("employee_name", "EXTRACTED"); data.put("employer", "EXTRACTED"); data.put("gross_salary", "EXTRACTED"); data.put("net_salary", "EXTRACTED"); data.put("pay_period", "EXTRACTED"); }
            case "CHEQUE" -> { data.put("payee", "EXTRACTED"); data.put("amount_numeric", "EXTRACTED"); data.put("amount_words", "EXTRACTED"); data.put("date", "EXTRACTED"); data.put("micr_code", "EXTRACTED"); }
            default -> data.put("raw_text", "EXTRACTED");
        }
        return data;
    }

    private List<String> detectFlags(String documentType, Map<String, Object> extracted) {
        List<String> flags = new ArrayList<>();
        // In production: run tamper detection, face matching, date validation
        if (extracted.containsKey("expiry_date")) flags.add("INFO:EXPIRY_DATE_CHECK_REQUIRED");
        return flags;
    }

    private BigDecimal calculateConfidence(Map<String, Object> extracted, List<String> flags) {
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
}
