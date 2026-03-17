package com.cbs.intelligence.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.intelligence.entity.DocumentProcessingJob;
import com.cbs.intelligence.service.DocumentProcessingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/intelligence/documents") @RequiredArgsConstructor
@Tag(name = "AI Document Processing", description = "OCR/NLP extraction, classification, verification, tamper detection")
public class DocumentProcessingController {
    private final DocumentProcessingService service;

    @PostMapping("/process")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<DocumentProcessingJob>> submit(@RequestBody DocumentProcessingJob job) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.submitJob(job)));
    }

    @PostMapping("/{jobId}/review")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DocumentProcessingJob>> review(
            @PathVariable String jobId, @RequestParam String reviewedBy, @RequestParam String status) {
        return ResponseEntity.ok(ApiResponse.ok(service.markReviewed(jobId, reviewedBy, status)));
    }

    @GetMapping("/pending-review")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DocumentProcessingJob>>> pendingReview() {
        return ResponseEntity.ok(ApiResponse.ok(service.getPendingReview()));
    }
}
