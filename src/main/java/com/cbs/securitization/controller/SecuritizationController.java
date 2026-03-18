package com.cbs.securitization.controller;
import com.cbs.common.dto.ApiResponse; import com.cbs.securitization.entity.SecuritizationVehicle; import com.cbs.securitization.service.SecuritizationService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/securitization") @RequiredArgsConstructor
@Tag(name = "Asset Securitization", description = "RMBS/ABS/CLO structuring, tranching, issuance, performance monitoring")
public class SecuritizationController {
    private final SecuritizationService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<SecuritizationVehicle>> create(@RequestBody SecuritizationVehicle v) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(v))); }
    @PostMapping("/{code}/issue") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<SecuritizationVehicle>> issue(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.issue(code))); }
    @GetMapping("/type/{type}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<SecuritizationVehicle>>> byType(@PathVariable String type) { return ResponseEntity.ok(ApiResponse.ok(service.getByType(type))); }
    @GetMapping("/active") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<SecuritizationVehicle>>> active() { return ResponseEntity.ok(ApiResponse.ok(service.getActive())); }
}
