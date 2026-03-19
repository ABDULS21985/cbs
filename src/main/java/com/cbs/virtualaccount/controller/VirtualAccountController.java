package com.cbs.virtualaccount.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.virtualaccount.entity.VirtualAccount;
import com.cbs.virtualaccount.service.VirtualAccountService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.*;

@RestController @RequestMapping("/v1/virtual-accounts") @RequiredArgsConstructor
@Tag(name = "Virtual Accounts", description = "Virtual account structures for corporate cash management, auto-sweep, payment matching")
public class VirtualAccountController {
    private final VirtualAccountService vaService;

    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<VirtualAccount>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(vaService.getAllAccounts()));
    }

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<VirtualAccount>> create(@RequestBody VirtualAccount va) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(vaService.create(va)));
    }
    @PostMapping("/{number}/credit") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<VirtualAccount>> credit(@PathVariable String number, @RequestParam BigDecimal amount, @RequestParam(required = false) String reference) {
        return ResponseEntity.ok(ApiResponse.ok(vaService.credit(number, amount, reference)));
    }
    @PostMapping("/{number}/debit") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<VirtualAccount>> debit(@PathVariable String number, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(vaService.debit(number, amount)));
    }
    @GetMapping("/match") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Optional<VirtualAccount>>> match(@RequestParam String paymentReference) {
        return ResponseEntity.ok(ApiResponse.ok(vaService.matchPayment(paymentReference)));
    }
    @PostMapping("/sweep") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> sweep() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("swept", vaService.executeSweeps())));
    }
    @GetMapping("/master/{masterAccountId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<VirtualAccount>>> byMaster(@PathVariable Long masterAccountId) {
        return ResponseEntity.ok(ApiResponse.ok(vaService.getByMaster(masterAccountId)));
    }
    @GetMapping("/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<VirtualAccount>>> byCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(vaService.getByCustomer(customerId)));
    }
    @PostMapping("/{number}/deactivate") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<VirtualAccount>> deactivate(@PathVariable String number) {
        return ResponseEntity.ok(ApiResponse.ok(vaService.deactivate(number)));
    }
}
