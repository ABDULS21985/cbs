package com.cbs.promo.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.promo.entity.PromotionalEvent;
import com.cbs.promo.service.PromoService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;

@RestController @RequestMapping("/v1/promotions") @RequiredArgsConstructor
@Tag(name = "Promotional Events", description = "Offers, sponsorships, seasonal promotions")
public class PromoController {
    private final PromoService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<PromotionalEvent>> create(@RequestBody PromotionalEvent event) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(event))); }
    @PostMapping("/{code}/activate") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<PromotionalEvent>> activate(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.activate(code))); }
    @PostMapping("/{code}/redeem") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<PromotionalEvent>> redeem(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.recordRedemption(code))); }
    @GetMapping("/active") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<PromotionalEvent>>> getActive() { return ResponseEntity.ok(ApiResponse.ok(service.getActive())); }
    @GetMapping("/type/{type}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<PromotionalEvent>>> getByType(@PathVariable String type) { return ResponseEntity.ok(ApiResponse.ok(service.getByType(type))); }
}
