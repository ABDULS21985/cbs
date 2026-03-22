package com.cbs.intelligence.ocr;

/**
 * Strategy interface for AI-driven document extraction (OCR / NLP).
 *
 * <p>Implementations can wrap any extraction backend:
 * <ul>
 *   <li>AWS Textract</li>
 *   <li>Google Cloud Vision / Document AI</li>
 *   <li>Azure AI Document Intelligence (formerly Form Recognizer)</li>
 *   <li>Custom on-premise NLP pipeline</li>
 * </ul>
 *
 * <p>The active implementation is selected via Spring's {@code @Primary} or
 * {@code @ConditionalOnProperty} annotations.  When no provider is configured
 * the {@link NoOpOcrProvider} is used, which routes every document to
 * {@code MANUAL_REVIEW} rather than generating fake extracted data.
 *
 * <p>To wire in a real provider:
 * <ol>
 *   <li>Add the provider SDK to {@code build.gradle.kts}.</li>
 *   <li>Create a Spring {@code @Service} that implements this interface.</li>
 *   <li>Annotate it with {@code @Primary} or guard it with
 *       {@code @ConditionalOnProperty(name="cbs.ocr.provider", havingValue="aws")}
 *       (or whichever provider key you choose).</li>
 *   <li>Remove (or keep) the {@link NoOpOcrProvider} — it becomes the fallback
 *       when the property is absent.</li>
 * </ol>
 */
public interface OcrProvider {

    /**
     * Extract structured data from a document.
     *
     * @param documentType   One of the document type codes in the DB CHECK constraint
     *                       (e.g. {@code PASSPORT}, {@code BANK_STATEMENT}).
     * @param processingType The requested processing mode (e.g. {@code OCR}, {@code NLP_EXTRACTION}).
     * @param inputFormat    The file format (e.g. {@code PDF}, {@code JPEG}).
     * @return               An {@link OcrResult} — never {@code null}.
     *                       When extraction cannot be performed the result must have an empty
     *                       {@code extractedData} map, {@code confidenceScore = 0} and a
     *                       {@code WARN:*} flag so the job is routed to MANUAL_REVIEW.
     */
    OcrResult extract(String documentType, String processingType, String inputFormat);

    /**
     * Returns {@code true} if this provider is fully configured and capable of processing
     * documents.  Used by {@link com.cbs.intelligence.service.DocumentProcessingService} to
     * set the {@code model_used} field and to emit a startup warning when no provider is ready.
     */
    boolean isAvailable();

    /** Human-readable provider name included in the {@code model_used} field of the job record. */
    String getName();
}
