package com.cbs.almfull.controller;
import com.cbs.common.dto.ApiResponse; import com.cbs.almfull.entity.AlmPosition; import com.cbs.almfull.service.AlmFullService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*; import java.time.LocalDate; import java.util.List;
@RestController @RequestMapping("/v1/alm-full") @RequiredArgsConstructor
@Tag(name = "ALM (Full)", description = "Asset-liability gap analysis by time bucket, duration gap, NII/EVE sensitivity")
public class AlmFullController {
    private final AlmFullService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<AlmPosition>> calc(@RequestBody AlmPosition pos) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.calculatePosition(pos))); }
    @GetMapping("/{date}/{currency}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<AlmPosition>>> get(@PathVariable LocalDate date, @PathVariable String currency) { return ResponseEntity.ok(ApiResponse.ok(service.getPositions(date, currency))); }
}
