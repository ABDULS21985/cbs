package com.cbs.marketresearch.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.marketresearch.entity.MarketResearchProject;
import com.cbs.marketresearch.service.MarketResearchService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/market-research")
@RequiredArgsConstructor
@Tag(name = "Market Research", description = "Market research projects (surveys, competitive analysis, product studies)")
public class MarketResearchController {

    private final MarketResearchService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketResearchProject>> create(@RequestBody MarketResearchProject project) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(project)));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketResearchProject>>> getActive() {
        return ResponseEntity.ok(ApiResponse.ok(service.getActive()));
    }

    @GetMapping("/library")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketResearchProject>>> getLibrary(
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(ApiResponse.ok(service.getLibrary(type)));
    }

    @GetMapping("/insights")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getInsights() {
        return ResponseEntity.ok(ApiResponse.ok(service.getInsights()));
    }

    @PostMapping("/{code}/complete")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketResearchProject>> complete(
            @PathVariable String code,
            @RequestBody Map<String, Object> body) {
        String findings = (String) body.getOrDefault("findings", "");
        @SuppressWarnings("unchecked")
        List<String> keyInsights = (List<String>) body.getOrDefault("keyInsights", List.of());
        @SuppressWarnings("unchecked")
        List<String> actionItems = (List<String>) body.getOrDefault("actionItems", List.of());
        return ResponseEntity.ok(ApiResponse.ok(service.complete(code, findings, keyInsights, actionItems)));
    }

    @PostMapping("/{code}/actions")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketResearchProject>> trackActions(
            @PathVariable String code,
            @RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(ApiResponse.ok(service.trackActions(code, data)));
    }
}
