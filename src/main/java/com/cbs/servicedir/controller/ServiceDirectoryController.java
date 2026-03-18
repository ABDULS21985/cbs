package com.cbs.servicedir.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.servicedir.entity.ServiceDirectoryEntry;
import com.cbs.servicedir.service.ServiceDirectoryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.web.bind.annotation.*; import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
@RestController @RequestMapping("/v1/service-directory") @RequiredArgsConstructor
@Tag(name = "Service Directory", description = "Catalog of available banking services with channels, eligibility, SLA, fees")
public class ServiceDirectoryController {
    private final ServiceDirectoryService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<ServiceDirectoryEntry>> create(@RequestBody ServiceDirectoryEntry entry) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(entry))); }
    @GetMapping("/category/{category}") public ResponseEntity<ApiResponse<List<ServiceDirectoryEntry>>> byCategory(@PathVariable String category) { return ResponseEntity.ok(ApiResponse.ok(service.getByCategory(category))); }
    @GetMapping public ResponseEntity<ApiResponse<List<ServiceDirectoryEntry>>> getAll() { return ResponseEntity.ok(ApiResponse.ok(service.getAll())); }
}
