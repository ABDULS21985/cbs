package com.cbs.competitoranalysis.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.competitoranalysis.entity.CompetitorProfile;
import com.cbs.competitoranalysis.service.CompetitorAnalysisService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/competitors")
@RequiredArgsConstructor
@Tag(name = "Competitor Analysis", description = "Competitor profiling, market share tracking, and threat assessment")
public class CompetitorAnalysisController {

    private final CompetitorAnalysisService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CompetitorProfile>> create(@RequestBody CompetitorProfile profile) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(profile)));
    }

    @PutMapping("/{code}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CompetitorProfile>> update(@PathVariable String code, @RequestBody CompetitorProfile updated) {
        return ResponseEntity.ok(ApiResponse.ok(service.update(code, updated)));
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CompetitorProfile>>> getByType(@PathVariable String type) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByType(type)));
    }

    @GetMapping("/threats/{level}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CompetitorProfile>>> getThreats(@PathVariable String level) {
        return ResponseEntity.ok(ApiResponse.ok(service.getThreats(level)));
    }
}
