package com.cbs.posterminal.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.posterminal.dto.RegisterTerminalRequest;
import com.cbs.posterminal.dto.TerminalResponse;
import com.cbs.posterminal.dto.UpdateTerminalStatusRequest;
import com.cbs.posterminal.entity.PosTerminal;
import com.cbs.posterminal.mapper.PosTerminalMapper;
import com.cbs.posterminal.service.PosTerminalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/pos-terminals")
@RequiredArgsConstructor
@Tag(name = "POS Terminals", description = "POS terminal administration — registration, heartbeat, status, merchant fleet")
public class PosTerminalController {

    private final PosTerminalService service;
    private final PosTerminalMapper mapper;

    @GetMapping
    @Operation(summary = "List all POS terminals")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TerminalResponse>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(mapper.toResponseList(service.getAllTerminals())));
    }

    @PostMapping
    @Operation(summary = "Register a new POS terminal")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TerminalResponse>> register(
            @Valid @RequestBody RegisterTerminalRequest request) {
        PosTerminal entity = mapper.toEntity(request);
        PosTerminal saved = service.register(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(mapper.toResponse(saved)));
    }

    @PostMapping("/{terminalId}/heartbeat")
    @Operation(summary = "Report terminal heartbeat")
    public ResponseEntity<ApiResponse<TerminalResponse>> heartbeat(@PathVariable String terminalId) {
        return ResponseEntity.ok(ApiResponse.ok(mapper.toResponse(service.heartbeat(terminalId))));
    }

    @PostMapping("/{terminalId}/status")
    @Operation(summary = "Update terminal operational status")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TerminalResponse>> updateStatus(
            @PathVariable String terminalId,
            @Valid @RequestBody UpdateTerminalStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(mapper.toResponse(service.updateStatus(terminalId, request.getStatus()))));
    }

    @GetMapping("/merchant/{merchantId}")
    @Operation(summary = "Get terminals by merchant")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TerminalResponse>>> byMerchant(@PathVariable String merchantId) {
        return ResponseEntity.ok(ApiResponse.ok(mapper.toResponseList(service.getByMerchant(merchantId))));
    }
}
