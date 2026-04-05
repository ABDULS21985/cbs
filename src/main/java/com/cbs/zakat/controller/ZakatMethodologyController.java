package com.cbs.zakat.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.zakat.dto.ZakatRequests;
import com.cbs.zakat.dto.ZakatResponses;
import com.cbs.zakat.entity.ZakatClassificationRule;
import com.cbs.zakat.entity.ZakatMethodology;
import com.cbs.zakat.service.ZakatClassificationService;
import com.cbs.zakat.service.ZakatMethodologyService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/zakat/methodologies")
@RequiredArgsConstructor
@Tag(name = "Zakat Methodologies", description = "Zakat methodology governance and classification rules")
@Transactional(readOnly = true)
public class ZakatMethodologyController {

    private final ZakatMethodologyService methodologyService;
    private final ZakatClassificationService classificationService;

    @PostMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ZakatMethodology>> createMethodology(@Valid @RequestBody ZakatMethodology request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(methodologyService.createMethodology(request)));
    }

    @PutMapping("/{methodologyId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ZakatMethodology>> updateMethodology(@PathVariable UUID methodologyId,
                                                                           @Valid @RequestBody ZakatMethodology request) {
        return ResponseEntity.ok(ApiResponse.ok(methodologyService.updateMethodology(methodologyId, request)));
    }

    @PostMapping("/{methodologyId}/submit")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Void>> submitForSsbApproval(@PathVariable UUID methodologyId) {
        methodologyService.submitForSsbApproval(methodologyId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Methodology submitted for SSB approval"));
    }

    @PostMapping("/{methodologyId}/approve")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> approveMethodology(@PathVariable UUID methodologyId,
                                                                @Valid @RequestBody ZakatRequests.SsbApprovalDetails request) {
        methodologyService.ssbApproveMethodology(methodologyId, request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Methodology approved"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<ZakatMethodology>>> listMethodologies() {
        return ResponseEntity.ok(ApiResponse.ok(methodologyService.getAllMethodologies()));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<ZakatMethodology>> getActiveMethodology() {
        return ResponseEntity.ok(ApiResponse.ok(methodologyService.getActiveMethodology()));
    }

    @GetMapping("/{methodologyCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<ZakatMethodology>> getMethodology(@PathVariable String methodologyCode) {
        return ResponseEntity.ok(ApiResponse.ok(methodologyService.getMethodology(methodologyCode)));
    }

    @GetMapping("/compare")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<ZakatResponses.MethodologyComparisonResult>> compareMethodologies(
            @RequestParam String methodologyCode1,
            @RequestParam String methodologyCode2) {
        return ResponseEntity.ok(ApiResponse.ok(methodologyService.compareMethodologies(methodologyCode1, methodologyCode2)));
    }

    @PostMapping("/rules")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ZakatClassificationRule>> createRule(@Valid @RequestBody ZakatClassificationRule request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(classificationService.createRule(request)));
    }

    @PutMapping("/rules/{ruleId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ZakatClassificationRule>> updateRule(@PathVariable UUID ruleId,
                                                                           @Valid @RequestBody ZakatClassificationRule request) {
        return ResponseEntity.ok(ApiResponse.ok(classificationService.updateRule(ruleId, request)));
    }

    @GetMapping("/rules")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<ZakatClassificationRule>>> getRules(@RequestParam String methodologyCode) {
        return ResponseEntity.ok(ApiResponse.ok(classificationService.getRulesForMethodology(methodologyCode)));
    }

    @GetMapping("/rules/debated")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<ZakatClassificationRule>>> getDebatedRules() {
        return ResponseEntity.ok(ApiResponse.ok(classificationService.getDebatedClassifications()));
    }
}