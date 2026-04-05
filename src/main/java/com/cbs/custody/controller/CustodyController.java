package com.cbs.custody.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.custody.entity.CustodyAccount;
import com.cbs.custody.service.CustodyService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/v1/custody")
@RequiredArgsConstructor
@Tag(name = "Custody Services", description = "Safekeeping, settlement, corporate actions, income collection")
public class CustodyController {

    private final CustodyService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustodyAccount>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll()));
    }

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CustodyAccount>> open(@RequestBody CustodyAccount account) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.open(account)));
    }

    @GetMapping("/{code}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustodyAccount>> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByCode(code)));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustodyAccount>>> getByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByCustomer(customerId)));
    }
}
