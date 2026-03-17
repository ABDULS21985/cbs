package com.cbs.pfm.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.pfm.entity.PfmSnapshot;
import com.cbs.pfm.service.PfmService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/pfm") @RequiredArgsConstructor
@Tag(name = "Personal Finance Manager", description = "Financial health scoring, spending analysis, savings rate, debt-to-income, recommendations")
public class PfmController {
    private final PfmService pfmService;

    @PostMapping("/snapshot/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<PfmSnapshot>> generate(@PathVariable Long customerId, @RequestParam(defaultValue = "MONTHLY") String snapshotType) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(pfmService.generateSnapshot(customerId, snapshotType)));
    }
    @GetMapping("/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<PfmSnapshot>>> history(@PathVariable Long customerId, @RequestParam(required = false) String type) {
        return ResponseEntity.ok(ApiResponse.ok(pfmService.getHistory(customerId, type)));
    }
    @GetMapping("/customer/{customerId}/latest") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<PfmSnapshot>>> latest(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(pfmService.getHistory(customerId, null)));
    }
}
