package com.cbs.intelligence.ocr;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Value object returned by any {@link OcrProvider} implementation.
 *
 * <ul>
 *   <li>{@code extractedData}   — structured key/value pairs extracted from the document</li>
 *   <li>{@code confidenceScore} — 0–100 scale matching the {@code confidence_score} column in
 *       {@code document_processing_job}</li>
 *   <li>{@code flags}           — warning/error tokens (e.g. {@code WARN:TAMPER_DETECTED})</li>
 * </ul>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OcrResult {

    /** Structured data extracted from the document. Empty map when extraction was not possible. */
    private Map<String, Object> extractedData;

    /**
     * Extraction confidence on a 0–100 scale.
     * <ul>
     *   <li>0    — no extraction performed (NoOp / not configured)</li>
     *   <li>1–59 — low confidence → routed to MANUAL_REVIEW</li>
     *   <li>60–89 — medium confidence → EXTRACTED (human spot-check)</li>
     *   <li>90–100 and no flags → auto-VERIFIED</li>
     * </ul>
     */
    private double confidenceScore;

    /** Warning/error tokens detected during processing. */
    private List<String> flags;
}
