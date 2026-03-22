package com.cbs.goal.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.goal.dto.*;
import com.cbs.goal.entity.GoalStatus;
import com.cbs.deposit.dto.RecurringDepositResponse;
import com.cbs.deposit.service.RecurringDepositService;
import com.cbs.goal.service.SavingsGoalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/goals")
@RequiredArgsConstructor
@Tag(name = "Savings Goals", description = "Target-amount savings pots with auto-debit and progress tracking")
public class SavingsGoalController {

    private final SavingsGoalService goalService;
    private final RecurringDepositService recurringDepositService;

    @PostMapping("/customer/{customerId}")
    @Operation(summary = "Create a new savings goal")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<GoalResponse>> createGoal(
            @PathVariable Long customerId, @Valid @RequestBody CreateGoalRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(goalService.createGoal(customerId, request), "Goal created"));
    }

    @GetMapping("/{goalId}")
    @Operation(summary = "Get savings goal details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<GoalResponse>> getGoal(@PathVariable Long goalId) {
        return ResponseEntity.ok(ApiResponse.ok(goalService.getGoal(goalId)));
    }

    @GetMapping("/customer/{customerId}")
    @Operation(summary = "Get customer's savings goals")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<GoalResponse>>> getCustomerGoals(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<GoalResponse> result = goalService.getCustomerGoals(customerId,
                PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping
    @Operation(summary = "Create a new savings goal (customerId in body)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<GoalResponse>> createGoalFromBody(
            @Valid @RequestBody CreateGoalRequest request) {
        Long customerId = request.getCustomerId();
        if (customerId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("customerId is required"));
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(goalService.createGoal(customerId, request), "Goal created"));
    }

    @PostMapping("/{goalId}/contribute")
    @Operation(summary = "Contribute funds into a savings goal (alias for /fund)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<GoalResponse>> contributeToGoal(
            @PathVariable Long goalId, @Valid @RequestBody GoalFundRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(goalService.fundGoal(goalId, request)));
    }

    @PostMapping("/{goalId}/auto-debit")
    @Operation(summary = "Configure auto-debit for a savings goal")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<GoalResponse>> configureAutoDebit(
            @PathVariable Long goalId, @RequestBody Map<String, Object> config) {
        return ResponseEntity.ok(ApiResponse.ok(goalService.configureAutoDebit(goalId, config)));
    }

    @GetMapping("/{goalId}/contributions")
    @Operation(summary = "Get contribution history for a goal")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<GoalTransactionResponse>>> getContributions(
            @PathVariable Long goalId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<GoalTransactionResponse> result = goalService.getContributions(goalId,
                PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/{goalId}/fund")
    @Operation(summary = "Deposit funds into a savings goal")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<GoalResponse>> fundGoal(
            @PathVariable Long goalId, @Valid @RequestBody GoalFundRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(goalService.fundGoal(goalId, request)));
    }

    @PostMapping("/{goalId}/withdraw")
    @Operation(summary = "Withdraw funds from a savings goal")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<GoalResponse>> withdrawFromGoal(
            @PathVariable Long goalId, @Valid @RequestBody GoalFundRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(goalService.withdrawFromGoal(goalId, request)));
    }

    @PostMapping("/{goalId}/cancel")
    @Operation(summary = "Cancel a savings goal and return funds")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<GoalResponse>> cancelGoal(@PathVariable Long goalId) {
        return ResponseEntity.ok(ApiResponse.ok(goalService.cancelGoal(goalId)));
    }

    @PostMapping("/batch/auto-debit")
    @Operation(summary = "Process auto-debits for due savings goals")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> processAutoDebits() {
        // Service now returns {processed, skipped, failed} directly
        return ResponseEntity.ok(ApiResponse.ok(goalService.processAutoDebits()));
    }

    // List all savings goals with optional status and search filtering
    @GetMapping
    @Operation(summary = "List all savings goals")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<GoalResponse>>> listGoals(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        GoalStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            try {
                statusEnum = GoalStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // Invalid status value — treat as no filter
            }
        }
        Pageable pageable = PageRequest.of(page, size);
        Page<GoalResponse> result = goalService.getGoals(statusEnum, search, pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/recurring-deposits")
    @Operation(summary = "List recurring deposits (proxy to deposit module)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<RecurringDepositResponse>>> getRecurringDeposits(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<RecurringDepositResponse> result = recurringDepositService.listAll(
                PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/recurring-deposits/{id}")
    @Operation(summary = "Get recurring deposit by ID")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<RecurringDepositResponse>> getRecurringDeposit(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(recurringDepositService.getDeposit(id)));
    }
}
