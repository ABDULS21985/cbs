package com.cbs.payments.remittance;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController @RequestMapping("/v1/remittances") @RequiredArgsConstructor
@Tag(name = "Cross-Border Remittances", description = "Corridor pricing, beneficiary management, FX conversion, IMTO compliance")
public class RemittanceController {

    private final RemittanceService remittanceService;

    // Corridors
    @PostMapping("/corridors")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<RemittanceCorridor>> createCorridor(@RequestBody RemittanceCorridor corridor) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(remittanceService.createCorridor(corridor)));
    }

    @GetMapping("/corridors")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<RemittanceCorridor>>> getAllCorridors() {
        return ResponseEntity.ok(ApiResponse.ok(remittanceService.getAllCorridors()));
    }

    // Beneficiaries
    @PostMapping("/beneficiaries")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<RemittanceBeneficiary>> addBeneficiary(@RequestBody RemittanceBeneficiary beneficiary) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(remittanceService.addBeneficiary(beneficiary)));
    }

    @GetMapping("/beneficiaries/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<RemittanceBeneficiary>>> getBeneficiaries(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(remittanceService.getCustomerBeneficiaries(customerId)));
    }

    // Quote
    @GetMapping("/quote")
    @Operation(summary = "Get remittance quote with FX, fees, and total cost")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<RemittanceService.RemittanceQuote>> getQuote(
            @RequestParam String sourceCountry, @RequestParam String destinationCountry, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(remittanceService.getQuote(sourceCountry, destinationCountry, amount)));
    }

    // Send
    @PostMapping("/send")
    @Operation(summary = "Send a cross-border remittance")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<RemittanceTransaction>> send(
            @RequestParam Long senderCustomerId, @RequestParam Long senderAccountId,
            @RequestParam Long beneficiaryId, @RequestParam String sourceCountry,
            @RequestParam String destinationCountry, @RequestParam BigDecimal amount,
            @RequestParam(required = false) String purposeCode, @RequestParam(required = false) String purposeDescription,
            @RequestParam(required = false) String sourceOfFunds) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(remittanceService.sendRemittance(
                senderCustomerId, senderAccountId, beneficiaryId, sourceCountry, destinationCountry,
                amount, purposeCode, purposeDescription, sourceOfFunds)));
    }

    // Status
    @PatchMapping("/{ref}/status")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<RemittanceTransaction>> updateStatus(@PathVariable String ref,
            @RequestParam String status, @RequestParam(required = false) String message) {
        return ResponseEntity.ok(ApiResponse.ok(remittanceService.updateStatus(ref, status, message)));
    }

    // History
    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<RemittanceTransaction>>> getHistory(@PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<RemittanceTransaction> result = remittanceService.getCustomerRemittances(customerId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
