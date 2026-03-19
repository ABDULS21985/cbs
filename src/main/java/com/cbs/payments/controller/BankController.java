package com.cbs.payments.controller;

import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/banks")
@RequiredArgsConstructor
@Tag(name = "Bank Directory", description = "Bank code lookups for SWIFT and domestic transfers")
public class BankController {

    @GetMapping("/swift")
    @Operation(summary = "Search SWIFT/BIC codes")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> searchSwiftCodes(
            @RequestParam(required = false) String query) {
        // Return common Nigerian bank SWIFT codes
        List<Map<String, String>> banks = List.of(
                Map.of("bic", "ABORNGLA", "bankName", "Access Bank Plc", "country", "NG", "city", "Lagos"),
                Map.of("bic", "GTBINGLA", "bankName", "Guaranty Trust Bank", "country", "NG", "city", "Lagos"),
                Map.of("bic", "ABORNGLA", "bankName", "First Bank of Nigeria", "country", "NG", "city", "Lagos"),
                Map.of("bic", "UBNINGLA", "bankName", "Union Bank of Nigeria", "country", "NG", "city", "Lagos"),
                Map.of("bic", "LOYDGB2L", "bankName", "Lloyds Bank", "country", "GB", "city", "London"),
                Map.of("bic", "BARCGB22", "bankName", "Barclays Bank", "country", "GB", "city", "London"),
                Map.of("bic", "CHASUS33", "bankName", "JPMorgan Chase", "country", "US", "city", "New York"),
                Map.of("bic", "CITIUS33", "bankName", "Citibank N.A.", "country", "US", "city", "New York")
        );

        if (query != null && !query.isBlank()) {
            String q = query.toLowerCase();
            banks = banks.stream()
                    .filter(b -> b.get("bic").toLowerCase().contains(q) || b.get("bankName").toLowerCase().contains(q))
                    .toList();
        }

        return ResponseEntity.ok(ApiResponse.ok(banks));
    }
}
