package com.cbs.rulesengine.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.rulesengine.dto.*;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import com.cbs.rulesengine.service.DecisionTableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class DecisionTableController {

    private final DecisionTableService decisionTableService;
    private final DecisionTableEvaluator decisionTableEvaluator;

    @PostMapping("/v1/rules/{ruleId}/decision-tables")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<DecisionTableResponse>> createDecisionTable(
            @PathVariable Long ruleId,
            @Valid @RequestBody CreateDecisionTableRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(decisionTableService.createDecisionTable(ruleId, request)));
    }

    @GetMapping("/v1/rules/{ruleId}/decision-tables")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<DecisionTableSummary>>> getDecisionTablesByRule(@PathVariable Long ruleId) {
        return ResponseEntity.ok(ApiResponse.ok(decisionTableService.getDecisionTablesByRule(ruleId)));
    }

    @GetMapping("/v1/decision-tables/{tableId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<DecisionTableResponse>> getDecisionTable(@PathVariable Long tableId) {
        return ResponseEntity.ok(ApiResponse.ok(decisionTableService.getDecisionTable(tableId)));
    }

    @PutMapping("/v1/decision-tables/{tableId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<DecisionTableResponse>> updateDecisionTable(
            @PathVariable Long tableId,
            @Valid @RequestBody UpdateDecisionTableRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(decisionTableService.updateDecisionTable(tableId, request)));
    }

    @PostMapping("/v1/decision-tables/{tableId}/rows")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<DecisionTableRowResponse>> addRow(
            @PathVariable Long tableId,
            @Valid @RequestBody DecisionTableRowRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(decisionTableService.addRow(tableId, request)));
    }

    @PutMapping("/v1/decision-tables/{tableId}/rows/{rowId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<DecisionTableRowResponse>> updateRow(
            @PathVariable Long tableId,
            @PathVariable Long rowId,
            @Valid @RequestBody DecisionTableRowRequest request) {
        decisionTableService.getDecisionTable(tableId);
        return ResponseEntity.ok(ApiResponse.ok(decisionTableService.updateRow(rowId, request)));
    }

    @DeleteMapping("/v1/decision-tables/{tableId}/rows/{rowId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<Void>> deleteRow(
            @PathVariable Long tableId,
            @PathVariable Long rowId) {
        decisionTableService.getDecisionTable(tableId);
        decisionTableService.deleteRow(rowId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Decision table row deleted"));
    }

    @PostMapping("/v1/decision-tables/{tableId}/reorder")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<Void>> reorderRows(
            @PathVariable Long tableId,
            @RequestBody List<Long> rowIdsInOrder) {
        decisionTableService.reorderRows(tableId, rowIdsInOrder);
        return ResponseEntity.ok(ApiResponse.ok(null, "Decision table rows reordered"));
    }

    @PostMapping("/v1/decision-tables/{tableId}/evaluate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<DecisionResultResponse>> evaluate(
            @PathVariable Long tableId,
            @Valid @RequestBody DecisionEvaluationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(decisionTableEvaluator.evaluate(tableId, request.getInputs())));
    }

    @PostMapping("/v1/decision-tables/evaluate-by-rule/{ruleCode}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<DecisionResultResponse>> evaluateByRuleCode(
            @PathVariable String ruleCode,
            @Valid @RequestBody DecisionEvaluationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                decisionTableEvaluator.evaluateByRuleCode(ruleCode, request.getInputs())
        ));
    }
}
