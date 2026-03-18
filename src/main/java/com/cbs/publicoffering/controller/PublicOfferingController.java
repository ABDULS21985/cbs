package com.cbs.publicoffering.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.publicoffering.entity.PublicOfferingDetail;
import com.cbs.publicoffering.service.PublicOfferingService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/v1/public-offerings") @RequiredArgsConstructor
@Tag(name = "Public Offerings", description = "IPO and public offering management")
public class PublicOfferingController {
    private final PublicOfferingService service;
    @PostMapping("/{dealId}") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<PublicOfferingDetail>> create(@PathVariable Long dealId, @RequestBody PublicOfferingDetail detail) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createOffering(dealId, detail))); }
    @GetMapping("/{id}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<PublicOfferingDetail>> getStatus(@PathVariable Long id) { return ResponseEntity.ok(ApiResponse.ok(service.getOfferingStatus(id))); }
    @GetMapping("/deal/{dealId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<PublicOfferingDetail>> getByDeal(@PathVariable Long dealId) { return ResponseEntity.ok(ApiResponse.ok(service.getByDealId(dealId))); }
    @PostMapping("/{id}/submit-regulator") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<PublicOfferingDetail>> submitToRegulator(@PathVariable Long id) { return ResponseEntity.ok(ApiResponse.ok(service.submitToRegulator(id))); }
    @PostMapping("/{id}/open") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<PublicOfferingDetail>> open(@PathVariable Long id) { return ResponseEntity.ok(ApiResponse.ok(service.openApplications(id))); }
    @PostMapping("/{id}/close") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<PublicOfferingDetail>> close(@PathVariable Long id) { return ResponseEntity.ok(ApiResponse.ok(service.closeApplications(id))); }
    @PostMapping("/{id}/allotment") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<PublicOfferingDetail>> recordAllotment(@PathVariable Long id, @RequestParam String basis) { return ResponseEntity.ok(ApiResponse.ok(service.recordAllotment(id, basis))); }
}
