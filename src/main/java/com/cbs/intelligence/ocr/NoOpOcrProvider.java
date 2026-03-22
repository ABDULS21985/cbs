package com.cbs.intelligence.ocr;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Fallback {@link OcrProvider} used when no real extraction backend is configured.
 *
 * <p>Every call returns an empty extraction result with {@code confidenceScore = 0}, which
 * causes {@link com.cbs.intelligence.service.DocumentProcessingService} to route the job to
 * {@code MANUAL_REVIEW} instead of auto-approving it on fabricated data.
 *
 * <p>This bean is created only when no other {@link OcrProvider} {@code @Bean} is present in
 * the application context (guarded by {@link ConditionalOnMissingBean}).  To replace it,
 * provide a {@code @Primary @Service} that implements {@link OcrProvider}.
 */
@Component
@ConditionalOnMissingBean(value = OcrProvider.class, ignored = NoOpOcrProvider.class)
@Slf4j
public class NoOpOcrProvider implements OcrProvider {

    @Override
    public OcrResult extract(String documentType, String processingType, String inputFormat) {
        log.warn(
                "OCR provider not configured — document routed to MANUAL_REVIEW. " +
                "documentType={}, processingType={}, inputFormat={}. " +
                "To enable automatic extraction wire an OcrProvider bean (AWS Textract, " +
                "Google Document AI, or Azure AI Document Intelligence).",
                documentType, processingType, inputFormat);

        return OcrResult.builder()
                .extractedData(Map.of())
                .confidenceScore(0.0)
                .flags(List.of("WARN:OCR_NOT_CONFIGURED", "WARN:NO_DATA_EXTRACTED"))
                .build();
    }

    @Override
    public boolean isAvailable() {
        return false;
    }

    @Override
    public String getName() {
        return "MANUAL_REVIEW_REQUIRED";
    }
}
