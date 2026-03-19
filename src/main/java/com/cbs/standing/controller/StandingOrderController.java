package com.cbs.standing.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.standing.entity.*;
import com.cbs.standing.repository.StandingInstructionRepository;
import com.cbs.standing.service.StandingOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/standing-orders")
@RequiredArgsConstructor
@Tag(name = "Standing Orders & Direct Debits", description = "Recurring payment instructions with retry logic")
public class StandingOrderController {

    private final StandingOrderService standingOrderService;
    private final StandingInstructionRepository standingInstructionRepository;

    @PostMapping
    @Operation(summary = "Create a standing order or direct debit instruction")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<StandingInstruction>> create(
            @RequestParam Long debitAccountId, @RequestParam InstructionType type,
            @RequestParam String creditAccountNumber, @RequestParam(required = false) String creditAccountName,
            @RequestParam(required = false) String creditBankCode,
            @RequestParam BigDecimal amount, @RequestParam(required = false) String currencyCode,
            @RequestParam String frequency, @RequestParam LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate,
            @RequestParam(required = false) Integer maxExecutions,
            @RequestParam(required = false) String mandateRef,
            @RequestParam(required = false) String narration) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                standingOrderService.create(debitAccountId, type, creditAccountNumber, creditAccountName,
                        creditBankCode, amount, currencyCode, frequency, startDate, endDate,
                        maxExecutions, mandateRef, narration)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get standing instruction details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<StandingInstruction>> getInstruction(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(standingOrderService.getInstruction(id)));
    }

    @GetMapping("/account/{accountId}")
    @Operation(summary = "Get standing instructions for an account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<StandingInstruction>>> getAccountInstructions(
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<StandingInstruction> result = standingOrderService.getAccountInstructions(accountId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/{id}/pause")
    @Operation(summary = "Pause a standing instruction")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<StandingInstruction>> pause(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(standingOrderService.pause(id)));
    }

    @PostMapping("/{id}/resume")
    @Operation(summary = "Resume a paused instruction")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<StandingInstruction>> resume(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(standingOrderService.resume(id)));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel a standing instruction")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<StandingInstruction>> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(standingOrderService.cancel(id)));
    }

    @PostMapping("/batch/execute")
    @Operation(summary = "Execute all due standing instructions")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> executeDue() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("processed", standingOrderService.executeDueInstructions())));
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Get execution history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<StandingExecutionLog>>> getHistory(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<StandingExecutionLog> result = standingOrderService.getExecutionHistory(id, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    // List all standing instructions
    @GetMapping
    @Operation(summary = "List all standing orders and direct debits")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<StandingInstruction>>> listAll(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<StandingInstruction> result = standingInstructionRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
