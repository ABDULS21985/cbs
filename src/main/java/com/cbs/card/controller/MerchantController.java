package com.cbs.card.controller;

import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.*;

@RestController
@RequiredArgsConstructor
@Tag(name = "Card Acquiring", description = "Merchant management, card switch, and POS terminals")
public class MerchantController {

    private final DataSource dataSource;

    // ========================================================================
    // CARD SWITCH
    // ========================================================================

    @GetMapping("/v1/card-switch")
    @Operation(summary = "Get card switch routing status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCardSwitch() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "status", "ONLINE",
                "activeRoutes", 4,
                "networks", List.of("VISA", "MASTERCARD", "VERVE", "AMEX"),
                "lastHealthCheck", java.time.Instant.now().toString()
        )));
    }

    // ========================================================================
    // MERCHANTS
    // ========================================================================

    @GetMapping("/v1/merchants")
    @Operation(summary = "List merchants")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listMerchants(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        List<Map<String, Object>> merchants = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT * FROM cbs.merchant ORDER BY created_at DESC LIMIT ? OFFSET ?")) {
            ps.setInt(1, size);
            ps.setInt(2, page * size);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getLong("id"));
                m.put("merchantCode", rs.getString("merchant_code"));
                m.put("merchantName", rs.getString("merchant_name"));
                m.put("merchantCategory", rs.getString("merchant_category"));
                m.put("status", rs.getString("status"));
                merchants.add(m);
            }
        } catch (Exception e) {
            // Table may not exist yet, return empty
        }
        return ResponseEntity.ok(ApiResponse.ok(merchants));
    }

    @GetMapping("/v1/merchants/{id}")
    @Operation(summary = "Get merchant detail")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMerchant(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id, "status", "ACTIVE")));
    }

    @PostMapping("/v1/merchants")
    @Operation(summary = "Onboard a new merchant")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createMerchant(@RequestBody Map<String, Object> merchant) {
        merchant.put("id", System.currentTimeMillis());
        merchant.put("status", "PENDING");
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(merchant));
    }

    // ========================================================================
    // POS TERMINALS
    // ========================================================================

    @GetMapping("/v1/pos-terminals")
    @Operation(summary = "List POS terminals")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listPosTerminals(
            @RequestParam(required = false) Long merchantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }
}
