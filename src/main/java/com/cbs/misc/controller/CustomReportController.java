package com.cbs.misc.controller;

import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/reports/custom") @RequiredArgsConstructor
@Tag(name = "Custom Reports", description = "Custom report builder")
public class CustomReportController {
    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }
    @GetMapping("/data-sources") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> dataSources() {
        return ResponseEntity.ok(ApiResponse.ok(List.of(
            Map.of("name", "customers", "label", "Customers", "fields", List.of("id","customerNumber","fullName","status")),
            Map.of("name", "accounts", "label", "Accounts", "fields", List.of("id","accountNumber","accountType","status","balance")),
            Map.of("name", "loans", "label", "Loans", "fields", List.of("id","loanNumber","productType","outstandingBalance","status")),
            Map.of("name", "payments", "label", "Payments", "fields", List.of("id","paymentReference","amount","status","createdAt"))
        )));
    }
    @PostMapping("/preview") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> preview(@RequestBody Map<String, Object> config) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("rows", List.of(), "totalCount", 0, "preview", true)));
    }
}
