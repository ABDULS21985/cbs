package com.cbs.islamicrisk.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.islamicrisk.dto.IslamicRiskRequests;
import com.cbs.islamicrisk.dto.IslamicRiskResponses;
import com.cbs.islamicrisk.entity.IslamicCreditAssessment;
import com.cbs.islamicrisk.entity.IslamicCreditScoreModel;
import com.cbs.islamicrisk.service.IslamicCreditScoringService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/islamic-risk/credit-scoring")
@RequiredArgsConstructor
public class IslamicCreditScoringController {

    private final IslamicCreditScoringService creditScoringService;

    @PostMapping("/assess")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','RISK_OFFICER')")
    public ResponseEntity<ApiResponse<IslamicCreditAssessment>> assess(
            @Valid @RequestBody IslamicRiskRequests.CreditAssessmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(creditScoringService.assessCredit(request)));
    }

    @GetMapping("/assessments/{id}")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicCreditAssessment>> getAssessment(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(creditScoringService.getAssessment(id)));
    }

    @GetMapping("/assessments/customer/{customerId}")
    @PreAuthorize("hasAnyRole('LOAN_OFFICER','RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<IslamicCreditAssessment>>> getCustomerAssessments(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(creditScoringService.getAssessmentsByCustomer(customerId)));
    }

    @PostMapping("/assessments/{id}/override")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicCreditAssessment>> overrideAssessment(
            @PathVariable Long id,
            @Valid @RequestBody IslamicRiskRequests.ScoreOverrideRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(creditScoringService.overrideScore(id, request)));
    }

    @GetMapping("/models")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<IslamicCreditScoreModel>>> getModels() {
        return ResponseEntity.ok(ApiResponse.ok(creditScoringService.getActiveModels()));
    }

    @GetMapping("/models/{contractType}")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicCreditScoreModel>> getModel(
            @PathVariable String contractType,
            @RequestParam(required = false) String productCategory) {
        return ResponseEntity.ok(ApiResponse.ok(creditScoringService.getModel(contractType, productCategory)));
    }

    @PostMapping("/models")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicCreditScoreModel>> createModel(
            @Valid @RequestBody IslamicRiskRequests.ScoreModelRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(creditScoringService.createModel(request)));
    }

    @PutMapping("/models/{id}")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicCreditScoreModel>> updateModel(
            @PathVariable Long id,
            @Valid @RequestBody IslamicRiskRequests.ScoreModelRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(creditScoringService.updateModel(id, request)));
    }

    @PostMapping("/models/{id}/backtest")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicRiskResponses.BacktestResult>> backtest(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(creditScoringService.backtestModel(id, from, to)));
    }

    @GetMapping("/distribution/{contractType}")
    @PreAuthorize("hasAnyRole('RISK_OFFICER','CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IslamicRiskResponses.ScoreDistribution>> distribution(@PathVariable String contractType) {
        return ResponseEntity.ok(ApiResponse.ok(creditScoringService.getScoreDistribution(contractType)));
    }
}
