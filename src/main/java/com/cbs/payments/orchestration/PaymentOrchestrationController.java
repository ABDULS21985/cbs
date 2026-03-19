package com.cbs.payments.orchestration;

import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController @RequestMapping("/v1/payments/orchestration") @RequiredArgsConstructor
@Tag(name = "Payment Orchestration", description = "Intelligent routing across payment rails by cost, speed, availability")
public class PaymentOrchestrationController {

    private final PaymentOrchestrationService orchestrationService;

    @PostMapping("/route")
    @Operation(summary = "Route a payment to the optimal rail")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<PaymentOrchestrationService.RoutingDecision>> routePayment(
            @RequestParam String paymentRef, @RequestParam(required = false) String sourceCountry,
            @RequestParam(required = false) String destinationCountry, @RequestParam String currencyCode,
            @RequestParam BigDecimal amount, @RequestParam(required = false) String paymentType) {
        return ResponseEntity.ok(ApiResponse.ok(orchestrationService.routePayment(
                paymentRef, sourceCountry, destinationCountry, currencyCode, amount, paymentType)));
    }

    @PostMapping("/rails")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<PaymentRail>> createRail(@RequestBody PaymentRail rail) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(orchestrationService.createRail(rail)));
    }

    @GetMapping("/rails")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<PaymentRail>>> getAllRails() {
        return ResponseEntity.ok(ApiResponse.ok(orchestrationService.getAllActiveRails()));
    }

    @GetMapping("/rules")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<PaymentRoutingRule>>> listRules() {
        return ResponseEntity.ok(ApiResponse.ok(orchestrationService.getAllRules()));
    }

    @PostMapping("/rules")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<PaymentRoutingRule>> createRule(@RequestBody PaymentRoutingRule rule) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(orchestrationService.createRule(rule)));
    }
}
