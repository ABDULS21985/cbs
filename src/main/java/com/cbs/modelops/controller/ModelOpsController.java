package com.cbs.modelops.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.modelops.entity.ModelLifecycleEvent;
import com.cbs.modelops.service.ModelOpsService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/model-ops") @RequiredArgsConstructor
@Tag(name = "Model Risk Operations", description = "Model lifecycle governance and monitoring")
public class ModelOpsController {
    private final ModelOpsService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<ModelLifecycleEvent>> record(@RequestBody ModelLifecycleEvent event) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordEvent(event))); }
    @GetMapping("/model/{code}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<ModelLifecycleEvent>>> getByModel(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.getByModel(code))); }
    @GetMapping("/alerts") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<ModelLifecycleEvent>>> getAlerts() { return ResponseEntity.ok(ApiResponse.ok(service.getAlerts())); }
}
