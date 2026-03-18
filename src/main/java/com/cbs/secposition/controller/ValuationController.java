package com.cbs.secposition.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.secposition.entity.InstrumentValuation;
import com.cbs.secposition.entity.ValuationModel;
import com.cbs.secposition.entity.ValuationRun;
import com.cbs.secposition.service.ValuationService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController @RequestMapping("/v1/valuations") @RequiredArgsConstructor
@Tag(name = "Valuation Services", description = "FI valuation models, runs, instrument pricing, fair value disclosure")
public class ValuationController {

    private final ValuationService service;

    @PostMapping("/models")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ValuationModel>> defineModel(@RequestBody ValuationModel model) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.defineModel(model)));
    }

    @GetMapping("/models")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ValuationModel>>> getAllModels() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAllModels()));
    }

    @GetMapping("/models/{code}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ValuationModel>> getModel(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getModelByCode(code)));
    }

    @PostMapping("/runs")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ValuationRun>> runValuation(
            @RequestParam Long modelId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String runType) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.runValuation(modelId, date, runType)));
    }

    @PostMapping("/runs/{ref}/instruments")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<InstrumentValuation>> recordInstrument(
            @PathVariable String ref,
            @RequestBody InstrumentValuation valuation) {
        valuation.setRunId(service.getValuationSummary(ref).getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordInstrumentValuation(valuation)));
    }

    @PostMapping("/runs/{ref}/complete")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ValuationRun>> completeRun(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(service.completeRun(ref)));
    }

    @GetMapping("/runs/{ref}/summary")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ValuationRun>> getSummary(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(service.getValuationSummary(ref)));
    }

    @GetMapping("/runs/{ref}/exceptions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<InstrumentValuation>>> getExceptions(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(service.getExceptions(ref)));
    }
}
