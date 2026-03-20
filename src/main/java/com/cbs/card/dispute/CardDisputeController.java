package com.cbs.card.dispute;

import com.cbs.common.audit.CurrentActorProvider;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/cards/disputes") @RequiredArgsConstructor
@Tag(name = "Dispute & Chargeback", description = "Scheme-compliant dispute lifecycle with Visa RDR / Mastercard Ethoca timelines")
public class CardDisputeController {

    private final CardDisputeService disputeService;
    private final CurrentActorProvider currentActorProvider;

    @PostMapping
    @Operation(summary = "Initiate a card dispute")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<CardDispute>> initiate(
            @RequestParam Long cardId, @RequestParam Long customerId, @RequestParam Long accountId,
            @RequestParam(required = false) Long transactionId, @RequestParam(required = false) String transactionRef,
            @RequestParam LocalDate transactionDate, @RequestParam BigDecimal transactionAmount,
            @RequestParam String transactionCurrency, @RequestParam(required = false) String merchantName,
            @RequestParam(required = false) String merchantId, @RequestParam DisputeType disputeType,
            @RequestParam String disputeReason, @RequestParam BigDecimal disputeAmount,
            @RequestParam String cardScheme) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(disputeService.initiateDispute(
                cardId, customerId, accountId, transactionId, transactionRef, transactionDate,
                transactionAmount, transactionCurrency, merchantName, merchantId,
                disputeType, disputeReason, disputeAmount, cardScheme, currentActorProvider.getCurrentActor())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CardDispute>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(disputeService.getDispute(id)));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<CardDispute>>> getCustomerDisputes(@PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<CardDispute> result = disputeService.getCustomerDisputes(customerId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CardDispute>>> getByStatus(@PathVariable DisputeStatus status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<CardDispute> result = disputeService.getByStatus(status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/{id}/provisional-credit")
    @Operation(summary = "Issue provisional credit to cardholder")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CardDispute>> provisionalCredit(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(disputeService.issueProvisionalCredit(id, currentActorProvider.getCurrentActor())));
    }

    @PostMapping("/{id}/chargeback")
    @Operation(summary = "File chargeback with card scheme")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CardDispute>> fileChargeback(@PathVariable Long id,
            @RequestParam String schemeCaseId, @RequestParam String schemeReasonCode) {
        return ResponseEntity.ok(ApiResponse.ok(disputeService.fileChargeback(id, schemeCaseId, schemeReasonCode, currentActorProvider.getCurrentActor())));
    }

    @PostMapping("/{id}/representment")
    @Operation(summary = "Record merchant representment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CardDispute>> representment(@PathVariable Long id,
            @RequestParam String merchantResponse) {
        return ResponseEntity.ok(ApiResponse.ok(disputeService.recordRepresentment(id, merchantResponse, currentActorProvider.getCurrentActor())));
    }

    @PostMapping("/{id}/arbitration")
    @Operation(summary = "Escalate to pre-arbitration or arbitration")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CardDispute>> arbitration(@PathVariable Long id,
            @RequestParam(defaultValue = "true") boolean preArbitration,
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(ApiResponse.ok(disputeService.escalateToArbitration(id, preArbitration, currentActorProvider.getCurrentActor(), notes)));
    }

    @PostMapping("/{id}/resolve")
    @Operation(summary = "Resolve dispute (CUSTOMER_FAVOUR / MERCHANT_FAVOUR / SPLIT / WITHDRAWN)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CardDispute>> resolve(@PathVariable Long id,
            @RequestParam String resolutionType, @RequestParam BigDecimal resolutionAmount,
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(ApiResponse.ok(disputeService.resolveDispute(id, resolutionType, resolutionAmount, notes, currentActorProvider.getCurrentActor())));
    }

    @PostMapping("/sla-check")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> slaCheck() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("breached", disputeService.checkSlaBreaches())));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CardDisputeService.DisputeDashboard>> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(disputeService.getDashboard()));
    }
}
