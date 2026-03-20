package com.cbs.campaign.controller;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.dto.ApiResponse;
import com.cbs.campaign.entity.MarketingCampaign;
import com.cbs.campaign.service.CampaignService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/v1/campaigns") @RequiredArgsConstructor
@Tag(name = "Marketing Campaigns", description = "Campaign lifecycle, multi-channel execution, performance analytics (open/click/conversion rates)")
public class CampaignController {
    private final CampaignService service;
    private final CurrentActorProvider currentActorProvider;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<MarketingCampaign>> create(@RequestBody MarketingCampaign campaign) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(campaign))); }
    @PostMapping("/{code}/approve") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<MarketingCampaign>> approve(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.approve(code, currentActorProvider.getCurrentActor()))); }
    @PostMapping("/{code}/launch") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<MarketingCampaign>> launch(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.launch(code))); }
    @PostMapping("/{code}/metrics") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<MarketingCampaign>> recordMetrics(@PathVariable String code, @RequestParam int sent, @RequestParam int delivered, @RequestParam int opened, @RequestParam int clicked, @RequestParam int converted) { return ResponseEntity.ok(ApiResponse.ok(service.recordMetrics(code, sent, delivered, opened, clicked, converted))); }
    @GetMapping("/{code}/performance") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<Map<String, Object>>> performance(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.getPerformance(code))); }
    @GetMapping("/active") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarketingCampaign>>> getActive() { return ResponseEntity.ok(ApiResponse.ok(service.getActive())); }
}
