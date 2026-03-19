package com.cbs.agreement.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.agreement.entity.CustomerAgreement;
import com.cbs.agreement.service.AgreementService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/agreements") @RequiredArgsConstructor
@Tag(name = "Customer Agreement", description = "Master agreement management — product-specific, channel access, privacy consent, mandates")
public class AgreementController {
    private final AgreementService agreementService;

    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerAgreement>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(agreementService.getAll()));
    }

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerAgreement>> create(@RequestBody CustomerAgreement agreement) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(agreementService.create(agreement)));
    }
    @PostMapping("/{number}/activate") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerAgreement>> activate(@PathVariable String number) {
        return ResponseEntity.ok(ApiResponse.ok(agreementService.activate(number)));
    }
    @PostMapping("/{number}/terminate") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CustomerAgreement>> terminate(@PathVariable String number) {
        return ResponseEntity.ok(ApiResponse.ok(agreementService.terminate(number)));
    }
    @GetMapping("/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerAgreement>>> byCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(agreementService.getByCustomer(customerId)));
    }
}
