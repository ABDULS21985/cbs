package com.cbs.advertising.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.advertising.entity.AdPlacement;
import com.cbs.advertising.service.AdvertisingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;

@RestController @RequestMapping("/v1/advertising") @RequiredArgsConstructor
@Tag(name = "Advertising", description = "Campaign placement, media buying, performance analytics")
public class AdvertisingController {
    private final AdvertisingService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<AdPlacement>> create(@RequestBody AdPlacement ad) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(ad))); }
    @PostMapping("/{code}/go-live") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<AdPlacement>> goLive(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.goLive(code))); }
    @PostMapping("/{code}/performance") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<AdPlacement>> recordPerformance(@PathVariable String code, @RequestParam long impressions, @RequestParam long clicks, @RequestParam int conversions) { return ResponseEntity.ok(ApiResponse.ok(service.recordPerformance(code, impressions, clicks, conversions))); }
    @GetMapping("/status/{status}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<AdPlacement>>> getByStatus(@PathVariable String status) { return ResponseEntity.ok(ApiResponse.ok(service.getByStatus(status))); }
    @GetMapping("/media/{type}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<AdPlacement>>> getByMediaType(@PathVariable String type) { return ResponseEntity.ok(ApiResponse.ok(service.getByMediaType(type))); }
}
