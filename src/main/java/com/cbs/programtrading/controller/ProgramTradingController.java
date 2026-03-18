package com.cbs.programtrading.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.programtrading.entity.ProgramExecution;
import com.cbs.programtrading.entity.TradingStrategy;
import com.cbs.programtrading.service.ProgramTradingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/program-trading")
@RequiredArgsConstructor
@Tag(name = "Program Trading", description = "Algorithmic and program trading strategy management and execution")
public class ProgramTradingController {

    private final ProgramTradingService service;

    @PostMapping("/strategies")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TradingStrategy>> defineStrategy(@RequestBody TradingStrategy strategy) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.defineStrategy(strategy)));
    }

    @PostMapping("/strategies/{code}/execute")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProgramExecution>> launchExecution(@PathVariable String code, @RequestBody ProgramExecution execution) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.launchExecution(code, execution)));
    }

    @PostMapping("/executions/{ref}/pause")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProgramExecution>> pauseExecution(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(service.pauseExecution(ref)));
    }

    @PostMapping("/executions/{ref}/resume")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProgramExecution>> resumeExecution(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(service.resumeExecution(ref)));
    }

    @PostMapping("/executions/{ref}/cancel")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ProgramExecution>> cancelExecution(@PathVariable String ref, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(service.cancelExecution(ref, reason)));
    }

    @GetMapping("/executions/active")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProgramExecution>>> getActiveExecutions() {
        return ResponseEntity.ok(ApiResponse.ok(service.getActiveExecutions()));
    }

    @GetMapping("/strategies/{code}/slippage")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ProgramExecution>>> getSlippageReport(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getSlippageReport(code)));
    }
}
