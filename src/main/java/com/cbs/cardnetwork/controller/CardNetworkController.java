package com.cbs.cardnetwork.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.cardnetwork.entity.CardNetworkMembership;
import com.cbs.cardnetwork.service.CardNetworkService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/card-networks") @RequiredArgsConstructor
@Tag(name = "Card Network Participation", description = "Visa/Mastercard/Verve membership, BIN ranges, issuing/acquiring, PCI-DSS compliance")
public class CardNetworkController {
    private final CardNetworkService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CardNetworkMembership>> register(@RequestBody CardNetworkMembership membership) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.register(membership))); }
    @GetMapping("/{network}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<CardNetworkMembership>>> byNetwork(@PathVariable String network) { return ResponseEntity.ok(ApiResponse.ok(service.getByNetwork(network))); }
    @GetMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<List<CardNetworkMembership>>> all() { return ResponseEntity.ok(ApiResponse.ok(service.getAllActive())); }
}
