package com.cbs.segmentation.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.segmentation.dto.SegmentDto;
import com.cbs.segmentation.entity.AssignmentType;
import com.cbs.segmentation.service.SegmentationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/segments")
@RequiredArgsConstructor
@Tag(name = "Customer Segmentation", description = "Rule-based and ML-driven customer segmentation engine")
public class SegmentationController {

    private final SegmentationService segmentationService;

    @GetMapping
    @Operation(summary = "List all active segments with customer counts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<SegmentDto>>> getAllSegments() {
        return ResponseEntity.ok(ApiResponse.ok(segmentationService.getAllActiveSegments()));
    }

    @GetMapping("/{segmentId}")
    @Operation(summary = "Get segment details with rules")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<SegmentDto>> getSegment(@PathVariable Long segmentId) {
        return ResponseEntity.ok(ApiResponse.ok(segmentationService.getSegment(segmentId)));
    }

    @GetMapping("/code/{code}")
    @Operation(summary = "Get segment by code")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<SegmentDto>> getSegmentByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(segmentationService.getSegmentByCode(code)));
    }

    @PostMapping
    @Operation(summary = "Create a new segment with rules")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SegmentDto>> createSegment(@Valid @RequestBody SegmentDto request) {
        SegmentDto response = segmentationService.createSegment(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Segment created successfully"));
    }

    @PutMapping("/{segmentId}")
    @Operation(summary = "Update segment and rules")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SegmentDto>> updateSegment(
            @PathVariable Long segmentId,
            @Valid @RequestBody SegmentDto request) {
        return ResponseEntity.ok(ApiResponse.ok(segmentationService.updateSegment(segmentId, request)));
    }

    @DeleteMapping("/{segmentId}")
    @Operation(summary = "Delete a segment")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteSegment(@PathVariable Long segmentId) {
        segmentationService.deleteSegment(segmentId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Segment deleted"));
    }

    // Customer-Segment assignments
    @GetMapping("/customer/{customerId}")
    @Operation(summary = "Get segments assigned to a customer")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<SegmentDto>>> getCustomerSegments(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(segmentationService.getCustomerSegments(customerId)));
    }

    @PostMapping("/{segmentId}/customers/{customerId}")
    @Operation(summary = "Manually assign a customer to a segment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Void>> assignCustomer(
            @PathVariable Long segmentId,
            @PathVariable Long customerId) {
        segmentationService.assignCustomerToSegment(customerId, segmentId, AssignmentType.MANUAL);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(null, "Customer assigned to segment"));
    }

    @DeleteMapping("/{segmentId}/customers/{customerId}")
    @Operation(summary = "Remove a customer from a segment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Void>> removeCustomer(
            @PathVariable Long segmentId,
            @PathVariable Long customerId) {
        segmentationService.removeCustomerFromSegment(customerId, segmentId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Customer removed from segment"));
    }

    @GetMapping("/{segmentId}/customers")
    @Operation(summary = "Get customers in a segment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<Long>>> getCustomersInSegment(
            @PathVariable Long segmentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<Long> result = segmentationService.getCustomerIdsInSegment(segmentId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    // Evaluation engine
    @PostMapping("/evaluate/customer/{customerId}")
    @Operation(summary = "Evaluate and auto-assign segments for a single customer")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> evaluateCustomer(@PathVariable Long customerId) {
        int assigned = segmentationService.evaluateAndAssignSegments(customerId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("newAssignments", assigned)));
    }

    @PostMapping("/evaluate/all")
    @Operation(summary = "Bulk evaluate all customers against rule-based segments")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> evaluateAll() {
        int assigned = segmentationService.evaluateAllCustomers();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("totalNewAssignments", assigned)));
    }
}
