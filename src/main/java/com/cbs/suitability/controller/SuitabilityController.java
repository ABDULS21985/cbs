package com.cbs.suitability.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.suitability.entity.ClientRiskProfile;
import com.cbs.suitability.entity.SuitabilityCheck;
import com.cbs.suitability.service.SuitabilityService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/suitability") @RequiredArgsConstructor
@Tag(name = "Suitability", description = "Client risk profiling and suitability checking")
public class SuitabilityController {
    private final SuitabilityService service;
    @PostMapping("/profiles") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<ClientRiskProfile>> createProfile(@RequestBody ClientRiskProfile profile) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createRiskProfile(profile))); }
    @PutMapping("/profiles/{code}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<ClientRiskProfile>> updateProfile(@PathVariable String code, @RequestBody ClientRiskProfile update) { return ResponseEntity.ok(ApiResponse.ok(service.updateRiskProfile(code, update))); }
    @GetMapping("/profiles/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<ClientRiskProfile>> getByCustomer(@PathVariable Long customerId) { return ResponseEntity.ok(ApiResponse.ok(service.getProfileByCustomer(customerId))); }
    @GetMapping("/profiles/expired") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<ClientRiskProfile>>> getExpired() { return ResponseEntity.ok(ApiResponse.ok(service.getExpiredProfiles())); }
    @PostMapping("/checks") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<SuitabilityCheck>> performCheck(@RequestBody SuitabilityCheck check) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.performSuitabilityCheck(check))); }
    @PostMapping("/checks/{ref}/override") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<SuitabilityCheck>> override(@PathVariable String ref, @RequestParam String justification, @RequestParam String approver) { return ResponseEntity.ok(ApiResponse.ok(service.overrideCheck(ref, justification, approver))); }
    @PostMapping("/checks/{ref}/acknowledge") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<SuitabilityCheck>> acknowledge(@PathVariable String ref) { return ResponseEntity.ok(ApiResponse.ok(service.acknowledgeDisclosure(ref))); }
    @GetMapping("/checks/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<SuitabilityCheck>>> getHistory(@PathVariable Long customerId) { return ResponseEntity.ok(ApiResponse.ok(service.getCheckHistory(customerId))); }
}
