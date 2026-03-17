package com.cbs.notionalpool.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.notionalpool.entity.*;
import com.cbs.notionalpool.service.NotionalPoolService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/v1/notional-pools") @RequiredArgsConstructor
@Tag(name = "Notional Pooling", description = "Notional cash pooling — interest optimization, multi-currency netting, advantage rate calculation")
public class NotionalPoolController {
    private final NotionalPoolService notionalPoolService;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<NotionalPool>> create(@RequestBody NotionalPool pool) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(notionalPoolService.createPool(pool)));
    }
    @PostMapping("/{poolCode}/members") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<NotionalPoolMember>> addMember(@PathVariable String poolCode, @RequestBody NotionalPoolMember m) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(notionalPoolService.addMember(poolCode, m)));
    }
    @PostMapping("/{poolCode}/calculate") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> calculate(@PathVariable String poolCode) {
        return ResponseEntity.ok(ApiResponse.ok(notionalPoolService.calculateInterestBenefit(poolCode)));
    }
    @GetMapping("/{poolCode}/members") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<NotionalPoolMember>>> members(@PathVariable String poolCode) {
        return ResponseEntity.ok(ApiResponse.ok(notionalPoolService.getMembers(poolCode)));
    }
}
