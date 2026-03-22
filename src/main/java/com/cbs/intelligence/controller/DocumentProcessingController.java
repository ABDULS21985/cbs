package com.cbs.intelligence.controller;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.dto.ApiResponse;
import com.cbs.intelligence.entity.DocumentProcessingJob;
import com.cbs.intelligence.service.DocumentProcessingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/intelligence/documents") @RequiredArgsConstructor
@Tag(name = "AI Document Processing", description = "OCR/NLP extraction, classification, verification, tamper detection")
public class DocumentProcessingController {
    private final DocumentProcessingService service;
    private final CurrentActorProvider currentActorProvider;

    @GetMapping("/process")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DocumentProcessingJob>>> listJobs() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllJobs()));
    }

    @PostMapping("/process")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<DocumentProcessingJob>> submit(@RequestBody DocumentProcessingJob job) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.submitJob(job)));
    }

    @PostMapping("/{jobId}/review")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DocumentProcessingJob>> review(
            @PathVariable String jobId, @RequestParam String status) {
        return ResponseEntity.ok(ApiResponse.ok(service.markReviewed(jobId, currentActorProvider.getCurrentActor(), status)));
    }

    @GetMapping("/pending-review")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DocumentProcessingJob>>> pendingReview() {
        return ResponseEntity.ok(ApiResponse.ok(service.getPendingReview()));
    }

    /**
     * Returns the current OCR provider status.
     * The frontend uses this to show an informational banner when no OCR is configured.
     */
    @GetMapping("/provider-status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> providerStatus() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "available", service.isOcrAvailable(),
                "providerName", service.getOcrProviderName()
        )));
    }
}
