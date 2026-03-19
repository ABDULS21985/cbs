package com.cbs.leasing.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.leasing.entity.LeaseContract;
import com.cbs.leasing.service.LeasingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/leases") @RequiredArgsConstructor
@Tag(name = "Leasing", description = "Finance/operating lease lifecycle, IFRS 16 ROU accounting, depreciation, purchase option, early termination")
public class LeasingController {
    private final LeasingService leasingService;

    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<LeaseContract>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(leasingService.getAllLeases()));
    }

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<LeaseContract>> create(@RequestBody LeaseContract lease) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(leasingService.createLease(lease)));
    }
    @PostMapping("/{number}/activate") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<LeaseContract>> activate(@PathVariable String number) {
        return ResponseEntity.ok(ApiResponse.ok(leasingService.activate(number)));
    }
    @PostMapping("/{number}/depreciate") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<LeaseContract>> depreciate(@PathVariable String number) {
        return ResponseEntity.ok(ApiResponse.ok(leasingService.recordDepreciation(number)));
    }
    @PostMapping("/{number}/purchase-option") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<LeaseContract>> buyout(@PathVariable String number) {
        return ResponseEntity.ok(ApiResponse.ok(leasingService.exercisePurchaseOption(number)));
    }
    @PostMapping("/{number}/early-terminate") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<LeaseContract>> terminate(@PathVariable String number) {
        return ResponseEntity.ok(ApiResponse.ok(leasingService.earlyTerminate(number)));
    }
    @GetMapping("/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<LeaseContract>>> byCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(leasingService.getByCustomer(customerId)));
    }
    @GetMapping("/asset-category/{category}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<LeaseContract>>> byAsset(@PathVariable String category) {
        return ResponseEntity.ok(ApiResponse.ok(leasingService.getByAssetCategory(category)));
    }
}
