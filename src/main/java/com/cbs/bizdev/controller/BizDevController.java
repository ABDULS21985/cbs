package com.cbs.bizdev.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.bizdev.entity.BizDevInitiative;
import com.cbs.bizdev.service.BizDevService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.math.BigDecimal; import java.util.List; import java.util.Map;

@RestController @RequestMapping("/v1/biz-dev") @RequiredArgsConstructor
@Tag(name = "Business Development", description = "Strategic initiatives, partnerships, market expansion")
public class BizDevController {
    private final BizDevService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<BizDevInitiative>> create(@RequestBody BizDevInitiative init) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(init))); }
    @PostMapping("/{code}/approve") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<BizDevInitiative>> approve(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.approve(code))); }
    @PatchMapping("/{code}/progress") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BizDevInitiative>> updateProgress(@PathVariable String code, @RequestParam BigDecimal progressPct, @RequestBody(required = false) Map<String, Object> kpis) { return ResponseEntity.ok(ApiResponse.ok(service.updateProgress(code, progressPct, kpis))); }
    @PostMapping("/{code}/complete") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<BizDevInitiative>> complete(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.complete(code))); }
    @GetMapping("/status/{status}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BizDevInitiative>>> getByStatus(@PathVariable String status) { return ResponseEntity.ok(ApiResponse.ok(service.getByStatus(status))); }
}
