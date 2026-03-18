package com.cbs.interactivehelp.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.interactivehelp.entity.GuidedFlow;
import com.cbs.interactivehelp.entity.HelpArticle;
import com.cbs.interactivehelp.service.InteractiveHelpService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/help")
@RequiredArgsConstructor
@Tag(name = "Interactive Help", description = "Self-service help articles and guided workflow management")
public class InteractiveHelpController {

    private final InteractiveHelpService service;

    @PostMapping("/articles")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<HelpArticle>> createArticle(@RequestBody HelpArticle article) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createArticle(article)));
    }

    @PostMapping("/articles/{code}/publish")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<HelpArticle>> publishArticle(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.publishArticle(code)));
    }

    @PostMapping("/articles/{code}/view")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<HelpArticle>> recordView(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.recordView(code)));
    }

    @PostMapping("/articles/{code}/helpfulness")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<HelpArticle>> recordHelpfulness(@PathVariable String code, @RequestParam boolean helpful) {
        return ResponseEntity.ok(ApiResponse.ok(service.recordHelpfulness(code, helpful)));
    }

    @GetMapping("/articles/search")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<HelpArticle>>> searchArticles(@RequestParam String category, @RequestParam(required = false) String productFamily) {
        return ResponseEntity.ok(ApiResponse.ok(service.searchArticles(category, productFamily)));
    }

    @PostMapping("/flows")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<GuidedFlow>> createFlow(@RequestBody GuidedFlow flow) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createFlow(flow)));
    }

    @PostMapping("/flows/{code}/activate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<GuidedFlow>> activateFlow(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.activateFlow(code)));
    }

    @PostMapping("/flows/{code}/start")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<GuidedFlow>> startFlow(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.startFlow(code)));
    }
}
