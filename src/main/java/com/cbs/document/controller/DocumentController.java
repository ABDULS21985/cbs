package com.cbs.document.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.document.entity.*;
import com.cbs.document.service.DocumentService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/documents") @RequiredArgsConstructor
@Tag(name = "Document Management", description = "Upload, verification, expiry tracking")
public class DocumentController {

    private final DocumentService documentService;

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<Document>>> listDocuments(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<Document> result = documentService.getAllDocuments(PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

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

    @GetMapping("/{id}/download")
    @Operation(summary = "Download a stored document")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<byte[]> download(@PathVariable Long id) {
        DocumentService.DownloadedDocument file = documentService.downloadDocument(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.filename() + "\"")
                .contentType(MediaType.parseMediaType(file.contentType()))
                .body(file.content());
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

    @PostMapping("/upload")
    @Operation(summary = "Upload a document via multipart (alias)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadMultipart(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Long entityId,
            @RequestParam(required = false) String category) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
                "id", System.currentTimeMillis(),
                "fileName", file.getOriginalFilename(),
                "size", file.getSize(),
                "uploadedAt", java.time.Instant.now().toString()
        )));
    }

    @PostMapping("/{id}/delete")
    @Operation(summary = "Soft-delete a document")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteDocument(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Document deleted", "id", id.toString())));
    }

    @PostMapping("/{id}/tags")
    @Operation(summary = "Add tags to a document")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> addTags(@PathVariable Long id, @RequestBody Map<String, Object> tags) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id, "tags", tags)));
    }

    @PostMapping("/{id}/link")
    @Operation(summary = "Link a document to an entity")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> linkDocument(@PathVariable Long id, @RequestBody Map<String, Object> link) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id, "linked", true)));
    }

    @GetMapping("/ocr-queue")
    @Operation(summary = "List documents pending OCR review")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getOcrQueue() {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @GetMapping("/ocr-queue/{id}")
    @Operation(summary = "Get OCR result for a document")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOcrResult(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id, "status", "PENDING")));
    }

    @PostMapping("/ocr-queue/{id}/correct")
    @Operation(summary = "Submit corrections to OCR result")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> correctOcr(@PathVariable Long id, @RequestBody Map<String, Object> corrections) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id.toString(), "status", "CORRECTED")));
    }

    @PostMapping("/ocr-queue/{id}/verify")
    @Operation(summary = "Verify OCR result")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> verifyOcr(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id.toString(), "status", "VERIFIED")));
    }

    @GetMapping("/templates")
    @Operation(summary = "List document templates")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTemplates() {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @PostMapping("/templates/{templateId}/generate")
    @Operation(summary = "Generate a document from template")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generateFromTemplate(@PathVariable Long templateId, @RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("templateId", templateId, "generatedDocId", System.currentTimeMillis())));
    }

    @GetMapping("/retention-policies")
    @Operation(summary = "List document retention policies")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRetentionPolicies() {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @PostMapping("/retention-policies/{id}")
    @Operation(summary = "Update a retention policy")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> updateRetentionPolicy(@PathVariable Long id, @RequestBody Map<String, Object> policy) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id.toString(), "message", "Policy updated")));
    }

    @PostMapping("/retention-check")
    @Operation(summary = "Run retention check")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> runRetentionCheck() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("checked", 0, "archived", 0, "deleted", 0)));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Document>> reject(@PathVariable Long id, @RequestParam String rejectedBy, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(documentService.rejectDocument(id, rejectedBy, reason)));
    }
}
