package com.cbs.orderexecution.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.orderexecution.entity.ExecutionQuality;
import com.cbs.orderexecution.entity.OrderExecution;
import com.cbs.orderexecution.service.OrderExecutionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/order-executions")
@RequiredArgsConstructor
@Tag(name = "Order Executions", description = "Trade execution recording, busting, and best execution analysis")
public class OrderExecutionController {

    private final OrderExecutionService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<OrderExecution>> recordExecution(@RequestBody OrderExecution execution) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordExecution(execution)));
    }

    @PostMapping("/{ref}/bust")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<OrderExecution>> bustExecution(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(service.bustExecution(ref)));
    }

    @PostMapping("/quality")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ExecutionQuality>> analyzeExecutionQuality(@RequestBody ExecutionQuality quality) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.analyzeExecutionQuality(quality)));
    }

    @GetMapping("/order/{orderId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<OrderExecution>>> getExecutionsByOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getExecutionsByOrder(orderId)));
    }

    @GetMapping("/order/{orderId}/quality")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ExecutionQuality>>> getBestExecutionReport(@PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getBestExecutionReport(orderId)));
    }
}
