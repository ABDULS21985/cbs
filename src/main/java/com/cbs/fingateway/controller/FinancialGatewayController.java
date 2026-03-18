package com.cbs.fingateway.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.fingateway.entity.*;
import com.cbs.fingateway.service.FinancialGatewayService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/financial-gateway") @RequiredArgsConstructor
@Tag(name = "Financial Gateway", description = "SWIFT MX/MT gateway, message routing, sanctions check, ACK/NACK, delivery tracking")
public class FinancialGatewayController {
    private final FinancialGatewayService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<FinancialGateway>> register(@RequestBody FinancialGateway gw) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.registerGateway(gw))); }
    @PostMapping("/messages") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<GatewayMessage>> send(@RequestBody GatewayMessage msg) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.sendMessage(msg))); }
    @PostMapping("/messages/{ref}/ack") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<GatewayMessage>> ack(@PathVariable String ref, @RequestParam String ackReference) { return ResponseEntity.ok(ApiResponse.ok(service.acknowledgeMessage(ref, ackReference))); }
    @PostMapping("/messages/{ref}/nack") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<GatewayMessage>> nack(@PathVariable String ref, @RequestParam String reason) { return ResponseEntity.ok(ApiResponse.ok(service.nackMessage(ref, reason))); }
    @GetMapping("/messages/queued/{gatewayId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<GatewayMessage>>> queued(@PathVariable Long gatewayId) { return ResponseEntity.ok(ApiResponse.ok(service.getQueuedMessages(gatewayId))); }
    @GetMapping("/type/{type}") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<List<FinancialGateway>>> byType(@PathVariable String type) { return ResponseEntity.ok(ApiResponse.ok(service.getByType(type))); }
}
