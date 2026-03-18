package com.cbs.salessupport.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.salessupport.entity.SalesKnowledgeArticle;
import com.cbs.salessupport.entity.SalesCollateral;
import com.cbs.salessupport.service.SalesSupportService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;

@RestController @RequestMapping("/v1/sales-support") @RequiredArgsConstructor
@Tag(name = "Sales Support", description = "Knowledge articles, sales collateral, competitive positioning")
public class SalesSupportController {
    private final SalesSupportService service;
    @PostMapping("/articles") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<SalesKnowledgeArticle>> createArticle(@RequestBody SalesKnowledgeArticle article) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createArticle(article))); }
    @PostMapping("/articles/{code}/publish") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<SalesKnowledgeArticle>> publishArticle(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.publishArticle(code))); }
    @PostMapping("/collateral") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<SalesCollateral>> createCollateral(@RequestBody SalesCollateral collateral) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createCollateral(collateral))); }
    @PostMapping("/collateral/{code}/publish") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<SalesCollateral>> publishCollateral(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.publishCollateral(code))); }
    @GetMapping("/articles") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<SalesKnowledgeArticle>>> searchArticles(@RequestParam(required = false) String family, @RequestParam(required = false) String type) { return ResponseEntity.ok(ApiResponse.ok(service.searchArticles(family, type))); }
    @GetMapping("/collateral") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<SalesCollateral>>> searchCollateral(@RequestParam(required = false) String family, @RequestParam(required = false) String type) { return ResponseEntity.ok(ApiResponse.ok(service.searchCollateral(family, type))); }
    @PostMapping("/articles/{code}/view") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<SalesKnowledgeArticle>> recordView(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.recordView(code))); }
}
