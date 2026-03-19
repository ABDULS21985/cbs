package com.cbs.integration.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.integration.entity.*;
import com.cbs.integration.service.Iso20022Service;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/integration/iso20022") @RequiredArgsConstructor
@Tag(name = "ISO 20022", description = "ISO 20022 message ingestion, validation, code set lookup, SWIFT-to-ISO migration mapping")
public class Iso20022Controller {

    private final Iso20022Service iso20022Service;

    @GetMapping("/messages")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Iso20022Message>>> listMessages() {
        return ResponseEntity.ok(ApiResponse.ok(iso20022Service.getAllMessages()));
    }

    @PostMapping("/messages")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Iso20022Message>> ingest(@RequestBody Iso20022Message message) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(iso20022Service.ingestMessage(message)));
    }

    @PatchMapping("/messages/{messageId}/status")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Iso20022Message>> updateStatus(
            @PathVariable String messageId, @RequestParam String status) {
        return ResponseEntity.ok(ApiResponse.ok(iso20022Service.updateStatus(messageId, status)));
    }

    @GetMapping("/messages/status/{status}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Iso20022Message>>> getByStatus(@PathVariable String status) {
        return ResponseEntity.ok(ApiResponse.ok(iso20022Service.getByStatus(status)));
    }

    @GetMapping("/codes/{codeSetName}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Iso20022CodeSet>>> getCodeSet(@PathVariable String codeSetName) {
        return ResponseEntity.ok(ApiResponse.ok(iso20022Service.getCodeSet(codeSetName)));
    }

    @GetMapping("/codes/{codeSetName}/{code}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> lookupCode(
            @PathVariable String codeSetName, @PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("code", code, "display_name", iso20022Service.lookupCode(codeSetName, code))));
    }

    @GetMapping("/swift-migration-map")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> getSwiftMapping() {
        return ResponseEntity.ok(ApiResponse.ok(iso20022Service.getSwiftToIsoMapping()));
    }
}
