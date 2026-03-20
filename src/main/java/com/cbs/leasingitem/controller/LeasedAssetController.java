package com.cbs.leasingitem.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.leasingitem.entity.LeasedAsset;
import com.cbs.leasingitem.service.LeasedAssetService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.time.LocalDate; import java.util.List;
@RestController @RequestMapping("/v1/leased-assets") @RequiredArgsConstructor
@Tag(name = "Leased Asset Tracking", description = "Asset lifecycle, inspections, returns")
public class LeasedAssetController {
    private final LeasedAssetService service;
    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<LeasedAsset>>> listAll() { return ResponseEntity.ok(ApiResponse.ok(service.getAll())); }
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<LeasedAsset>> register(@RequestBody LeasedAsset asset) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.register(asset))); }
    @GetMapping("/{code}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<LeasedAsset>> get(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.getByCode(code))); }
    @PostMapping("/{code}/inspect") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<LeasedAsset>> inspect(@PathVariable String code, @RequestBody InspectionRequest request) { return ResponseEntity.ok(ApiResponse.ok(service.recordInspection(code, request.condition(), request.nextInspectionDue()))); }
    @PostMapping("/{code}/return") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<LeasedAsset>> returnAsset(@PathVariable String code, @RequestBody(required = false) ReturnRequest request) { return ResponseEntity.ok(ApiResponse.ok(service.returnAsset(code, request != null ? request.returnCondition() : null))); }
    @GetMapping("/contract/{contractId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<LeasedAsset>>> getByContract(@PathVariable Long contractId) { return ResponseEntity.ok(ApiResponse.ok(service.getByContract(contractId))); }
    @GetMapping("/due-inspection") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<LeasedAsset>>> getDueForInspection() { return ResponseEntity.ok(ApiResponse.ok(service.getDueForInspection())); }

    public record InspectionRequest(String condition, @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate nextInspectionDue) {}
    public record ReturnRequest(String returnCondition) {}
}
