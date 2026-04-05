package com.cbs.islamicaml.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.islamicaml.dto.CombinedScreeningResult;
import com.cbs.islamicaml.dto.EntityScreeningRequest;
import com.cbs.islamicaml.dto.OverlappingEntity;
import com.cbs.islamicaml.dto.ScreeningRequirement;
import com.cbs.islamicaml.service.CombinedEntityScreeningService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/islamic-aml/combined-screening")
@RequiredArgsConstructor
@Slf4j
public class CombinedScreeningController {

    private final CombinedEntityScreeningService combinedScreeningService;

    @PostMapping("/screen")
    public ResponseEntity<ApiResponse<CombinedScreeningResult>> screenEntity(
            @Valid @RequestBody EntityScreeningRequest request) {
        log.info("Combined screening for entity {}", request.getEntityName());
        CombinedScreeningResult result = combinedScreeningService.screenEntity(request);
        return ResponseEntity.ok(ApiResponse.ok(result, "Combined screening completed"));
    }

    @GetMapping("/requirements/{accountId}")
    public ResponseEntity<ApiResponse<ScreeningRequirement>> determineRequirement(
            @PathVariable Long accountId,
            @RequestParam(required = false) String transactionType) {
        ScreeningRequirement requirement =
                combinedScreeningService.determineScreeningRequirement(accountId, transactionType);
        return ResponseEntity.ok(ApiResponse.ok(requirement));
    }

    @GetMapping("/overlapping-entities")
    public ResponseEntity<ApiResponse<List<OverlappingEntity>>> getOverlappingEntities() {
        return ResponseEntity.ok(ApiResponse.ok(combinedScreeningService.findOverlappingEntities()));
    }
}
