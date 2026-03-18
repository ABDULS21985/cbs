package com.cbs.privateplacement.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.privateplacement.entity.PlacementInvestor;
import com.cbs.privateplacement.entity.PrivatePlacement;
import com.cbs.privateplacement.service.PrivatePlacementService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/private-placements") @RequiredArgsConstructor
@Tag(name = "Private Placements", description = "Private placement management and investor tracking")
public class PrivatePlacementController {
    private final PrivatePlacementService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<PrivatePlacement>> create(@RequestBody PrivatePlacement placement) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createPlacement(placement))); }
    @GetMapping("/{code}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<PrivatePlacement>> getByCode(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.getByCode(code))); }
    @GetMapping("/active") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<PrivatePlacement>>> getActive() { return ResponseEntity.ok(ApiResponse.ok(service.getActivePlacements())); }
    @PostMapping("/{code}/investors") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<PlacementInvestor>> addInvestor(@PathVariable String code, @RequestBody PlacementInvestor investor) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.addInvestor(code, investor))); }
    @PostMapping("/{code}/investors/{investorId}/fund") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<PlacementInvestor>> recordFunding(@PathVariable String code, @PathVariable Long investorId) { return ResponseEntity.ok(ApiResponse.ok(service.recordFunding(code, investorId))); }
    @PostMapping("/{code}/close") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<PrivatePlacement>> close(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.closePlacement(code))); }
}
