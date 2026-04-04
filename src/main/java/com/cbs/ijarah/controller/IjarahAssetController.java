package com.cbs.ijarah.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.ijarah.dto.IjarahRequests;
import com.cbs.ijarah.dto.IjarahResponses;
import com.cbs.ijarah.entity.IjarahAsset;
import com.cbs.ijarah.entity.IjarahAssetMaintenanceRecord;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.service.IjarahAssetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/ijarah/assets")
@RequiredArgsConstructor
public class IjarahAssetController {

    private final IjarahAssetService assetService;

    @PostMapping
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN','TREASURY')")
    public ResponseEntity<ApiResponse<IjarahAsset>> registerAsset(@Valid @RequestBody IjarahRequests.RegisterAssetRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(assetService.registerAsset(request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<IjarahAsset>> getAsset(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(assetService.getAsset(id)));
    }

    @GetMapping("/ref/{ref}")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<IjarahAsset>> getAssetByRef(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(assetService.getAssetByRef(ref)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<List<IjarahAsset>>> listAssets(
            @RequestParam(required = false) IjarahDomainEnums.AssetCategory category,
            @RequestParam(required = false) IjarahDomainEnums.AssetStatus status) {
        return ResponseEntity.ok(ApiResponse.ok(assetService.getAssets(category, status)));
    }

    @PostMapping("/{id}/depreciate")
    @PreAuthorize("hasAnyRole('FINANCE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> depreciate(@PathVariable Long id) {
        assetService.processMonthlyDepreciation(id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", true)));
    }

    @PostMapping("/depreciate-batch")
    @PreAuthorize("hasAnyRole('FINANCE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> depreciateBatch() {
        assetService.processDepreciationBatch();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", true)));
    }

    @PostMapping("/{id}/maintenance")
    @PreAuthorize("hasAnyRole('CBS_OFFICER')")
    public ResponseEntity<ApiResponse<IjarahAssetMaintenanceRecord>> maintenance(
            @PathVariable Long id,
            @Valid @RequestBody IjarahRequests.MaintenanceRecordRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(assetService.recordMaintenance(id, request)));
    }

    @GetMapping("/{id}/maintenance-history")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<List<IjarahAssetMaintenanceRecord>>> maintenanceHistory(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(assetService.getMaintenanceHistory(id)));
    }

    @PostMapping("/{id}/insurance")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateInsurance(
            @PathVariable Long id,
            @Valid @RequestBody IjarahRequests.InsuranceUpdateRequest request) {
        assetService.updateInsurance(id, request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("updated", true)));
    }

    @PostMapping("/{id}/valuation")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> valuation(
            @PathVariable Long id,
            @Valid @RequestBody IjarahRequests.ValuationRequest request) {
        assetService.recordValuation(id, request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("recorded", true)));
    }

    @PostMapping("/{id}/dispose")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> dispose(
            @PathVariable Long id,
            @Valid @RequestBody IjarahRequests.AssetDisposalRequest request) {
        assetService.disposeAsset(id, request);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("disposed", true)));
    }

    @GetMapping("/expiring-insurance")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<List<IjarahAsset>>> expiringInsurance(@RequestParam(defaultValue = "30") int daysAhead) {
        return ResponseEntity.ok(ApiResponse.ok(assetService.getAssetsWithExpiringInsurance(daysAhead)));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','CBS_ADMIN','RISK_OFFICER','FINANCE')")
    public ResponseEntity<ApiResponse<IjarahResponses.IjarahAssetDashboard>> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(assetService.getAssetDashboard()));
    }
}
