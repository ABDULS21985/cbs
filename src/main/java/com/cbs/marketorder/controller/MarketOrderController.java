package com.cbs.marketorder.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.marketorder.entity.MarketOrder;
import com.cbs.marketorder.service.MarketOrderService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/market-orders")
@RequiredArgsConstructor
@Tag(name = "Market Orders", description = "Order capture, validation, routing, and lifecycle management")
public class MarketOrderController {

    private final MarketOrderService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketOrder>> submitOrder(@RequestBody MarketOrder order) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.submitOrder(order)));
    }

    @PostMapping("/{ref}/validate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketOrder>> validateOrder(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(service.validateOrder(ref)));
    }

    @PostMapping("/{ref}/route")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketOrder>> routeOrder(@PathVariable String ref, @RequestParam String destination) {
        return ResponseEntity.ok(ApiResponse.ok(service.routeOrder(ref, destination)));
    }

    @PostMapping("/{ref}/cancel")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketOrder>> cancelOrder(@PathVariable String ref, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(service.cancelOrder(ref, reason)));
    }

    @GetMapping("/{ref}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<MarketOrder>> getOrderStatus(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(service.getOrderStatus(ref)));
    }

    @GetMapping("/open")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketOrder>>> getOpenOrders() {
        return ResponseEntity.ok(ApiResponse.ok(service.getOpenOrders()));
    }

    @GetMapping("/customer/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketOrder>>> getOrdersByCustomer(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getOrdersByCustomer(id)));
    }
}
