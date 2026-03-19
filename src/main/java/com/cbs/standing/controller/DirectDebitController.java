package com.cbs.standing.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.standing.entity.InstructionType;
import com.cbs.standing.entity.StandingInstruction;
import com.cbs.standing.entity.StandingExecutionLog;
import com.cbs.standing.repository.StandingInstructionRepository;
import com.cbs.standing.service.StandingOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/direct-debits")
@RequiredArgsConstructor
@Tag(name = "Direct Debits", description = "Direct debit mandate management")
public class DirectDebitController {

    private final StandingOrderService standingOrderService;
    private final StandingInstructionRepository standingInstructionRepository;

    @GetMapping
    @Operation(summary = "List all direct debit mandates")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<StandingInstruction>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<StandingInstruction> all = standingInstructionRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<StandingInstruction> directDebits = all.getContent().stream()
                .filter(si -> si.getInstructionType() == InstructionType.DIRECT_DEBIT)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(directDebits, PageMeta.from(all)));
    }

    @PostMapping
    @Operation(summary = "Create a direct debit mandate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<StandingInstruction>> create(
            @RequestParam Long debitAccountId,
            @RequestParam String creditAccountNumber,
            @RequestParam(required = false) String creditAccountName,
            @RequestParam BigDecimal amount, @RequestParam String frequency,
            @RequestParam LocalDate startDate, @RequestParam(required = false) LocalDate endDate,
            @RequestParam(required = false) String mandateRef,
            @RequestParam(required = false) String narration) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                standingOrderService.create(debitAccountId, InstructionType.DIRECT_DEBIT,
                        creditAccountNumber, creditAccountName, null, amount, null,
                        frequency, startDate, endDate, null, mandateRef, narration)));
    }

    @PostMapping("/{id}/revoke")
    @Operation(summary = "Revoke a direct debit mandate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<StandingInstruction>> revoke(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(standingOrderService.cancel(id)));
    }
}
