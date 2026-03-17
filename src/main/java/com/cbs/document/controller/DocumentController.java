package com.cbs.document.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.document.entity.*;
import com.cbs.document.service.DocumentService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController @RequestMapping("/v1/documents") @RequiredArgsConstructor
@Tag(name = "Document Management", description = "Upload, verification, expiry tracking")
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Document>> upload(
            @RequestParam Long customerId, @RequestParam DocumentType type,
            @RequestParam String fileName, @RequestParam String fileType,
            @RequestParam(required = false) Long fileSizeBytes, @RequestParam String storagePath,
            @RequestParam(required = false) String checksum, @RequestParam(required = false) String description,
            @RequestParam(required = false) List<String> tags, @RequestParam(required = false) LocalDate expiryDate,
            @RequestParam(required = false) Long accountId, @RequestParam(required = false) Long loanAccountId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(documentService.uploadDocument(
                customerId, type, fileName, fileType, fileSizeBytes, storagePath, checksum, description, tags, expiryDate, accountId, loanAccountId)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<Document>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(documentService.getDocument(id)));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<Document>>> getCustomerDocs(@PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<Document> result = documentService.getCustomerDocuments(customerId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/pending-verification")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Document>>> pendingVerification(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<Document> result = documentService.getPendingVerification(PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/{id}/verify")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Document>> verify(@PathVariable Long id, @RequestParam String verifiedBy) {
        return ResponseEntity.ok(ApiResponse.ok(documentService.verifyDocument(id, verifiedBy)));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Document>> reject(@PathVariable Long id, @RequestParam String rejectedBy, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(documentService.rejectDocument(id, rejectedBy, reason)));
    }
}
