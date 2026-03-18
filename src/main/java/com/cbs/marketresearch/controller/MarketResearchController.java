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
@Tag(name = "Market Research", description = "Market research project lifecycle and insights management")
public class MarketResearchController {

    private final MarketResearchService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketResearchProject>> create(@RequestBody MarketResearchProject project) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createProject(project)));
    }

    @PostMapping("/{code}/complete")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketResearchProject>> complete(@PathVariable String code, @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        Map<String, Object> findings = (Map<String, Object>) body.get("findings");
        @SuppressWarnings("unchecked")
        Map<String, Object> recommendations = (Map<String, Object>) body.get("recommendations");
        return ResponseEntity.ok(ApiResponse.ok(service.completeProject(code, findings, recommendations)));
    }

    @PostMapping("/{code}/actions")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<MarketResearchProject>> trackActions(@PathVariable String code, @RequestBody Map<String, Object> action) {
        return ResponseEntity.ok(ApiResponse.ok(service.trackActions(code, action)));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketResearchProject>>> getActiveProjects() {
        return ResponseEntity.ok(ApiResponse.ok(service.getActiveProjects()));
    }

    @GetMapping("/library")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketResearchProject>>> getResearchLibrary(@RequestParam String type) {
        return ResponseEntity.ok(ApiResponse.ok(service.getResearchLibrary(type)));
    }

    @GetMapping("/insights")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<MarketResearchProject>>> getInsightsSummary() {
        return ResponseEntity.ok(ApiResponse.ok(service.getInsightsSummary()));
    }
}
