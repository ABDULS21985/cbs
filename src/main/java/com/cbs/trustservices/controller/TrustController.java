package com.cbs.trustservices.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.trustservices.entity.TrustAccount;
import com.cbs.trustservices.service.TrustService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/v1/trusts")
@RequiredArgsConstructor
@Tag(name = "Trust Services", description = "Trust creation, corpus management, distributions, beneficiary tracking")
public class TrustController {

    private final TrustService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TrustAccount>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllTrusts()));
    }

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TrustAccount>> create(@RequestBody TrustAccount trust) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(trust)));
    }

    @PostMapping("/{code}/distribute")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TrustAccount>> distribute(
            @PathVariable String code, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(service.recordDistribution(code, amount)));
    }

    @GetMapping("/grantor/{grantorId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TrustAccount>>> getByGrantor(@PathVariable Long grantorId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByGrantor(grantorId)));
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TrustAccount>>> getByType(@PathVariable String type) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByType(type)));
    }
}
