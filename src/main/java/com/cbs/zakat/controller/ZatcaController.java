package com.cbs.zakat.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.zakat.dto.ZakatRequests;
import com.cbs.zakat.dto.ZakatResponses;
import com.cbs.zakat.entity.ZatcaReturn;
import com.cbs.zakat.service.ZatcaIntegrationService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/zakat/zatca")
@RequiredArgsConstructor
@Tag(name = "ZATCA", description = "ZATCA filing, assessment, payment, and appeal hooks")
@Transactional(readOnly = true)
public class ZatcaController {

    private final ZatcaIntegrationService zatcaIntegrationService;

    @PostMapping("/returns/prepare")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ZakatResponses.FiledReturnReference>> prepareReturn(
            @Valid @RequestBody ZakatRequests.PrepareZatcaReturnRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(zatcaIntegrationService.prepareReturn(request)));
    }

    @PostMapping("/returns/{returnRef}/file")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ZatcaReturn>> fileReturn(@PathVariable String returnRef) {
        return ResponseEntity.ok(ApiResponse.ok(zatcaIntegrationService.fileReturn(returnRef)));
    }

    @PostMapping("/returns/{returnRef}/assessment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ZatcaReturn>> recordAssessment(@PathVariable String returnRef,
                                                                     @Valid @RequestBody ZakatRequests.ZatcaAssessmentDetails request) {
        return ResponseEntity.ok(ApiResponse.ok(zatcaIntegrationService.recordAssessment(returnRef, request)));
    }

    @PostMapping("/returns/{returnRef}/payment")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ZatcaReturn>> recordPayment(@PathVariable String returnRef,
                                                                  @Valid @RequestBody ZakatRequests.PaymentDetails request) {
        return ResponseEntity.ok(ApiResponse.ok(zatcaIntegrationService.recordPayment(returnRef, request)));
    }

    @PostMapping("/returns/{returnRef}/appeal")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ZatcaReturn>> fileAppeal(@PathVariable String returnRef,
                                                               @Valid @RequestBody ZakatRequests.AppealDetails request) {
        return ResponseEntity.ok(ApiResponse.ok(zatcaIntegrationService.fileAppeal(returnRef, request)));
    }

    @PostMapping("/returns/{returnRef}/appeal-outcome")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ZatcaReturn>> recordAppealOutcome(@PathVariable String returnRef,
                                                                        @Valid @RequestBody ZakatRequests.AppealOutcomeDetails request) {
        return ResponseEntity.ok(ApiResponse.ok(zatcaIntegrationService.recordAppealOutcome(returnRef, request)));
    }

    @GetMapping("/returns/{returnRef}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<ZatcaReturn>> getReturn(@PathVariable String returnRef) {
        return ResponseEntity.ok(ApiResponse.ok(zatcaIntegrationService.getReturn(returnRef)));
    }

    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<ZakatResponses.ZatcaFilingHistory>> getHistory() {
        return ResponseEntity.ok(ApiResponse.ok(zatcaIntegrationService.getFilingHistory()));
    }
}