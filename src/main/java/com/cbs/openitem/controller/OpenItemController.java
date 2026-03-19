package com.cbs.openitem.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.openitem.entity.OpenItem;
import com.cbs.openitem.service.OpenItemService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/open-items") @RequiredArgsConstructor
@Tag(name = "Open Item Management", description = "Unmatched transactions, suspense entries, reconciliation breaks")
public class OpenItemController {
    private final OpenItemService service;

    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<OpenItem>> create(@RequestBody OpenItem item) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(item)));
    }
    @PostMapping("/{code}/assign") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<OpenItem>> assign(@PathVariable String code, @RequestParam String assignedTo, @RequestParam(required = false) String assignedTeam) {
        return ResponseEntity.ok(ApiResponse.ok(service.assign(code, assignedTo, assignedTeam)));
    }
    @PostMapping("/{code}/resolve") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<OpenItem>> resolve(@PathVariable String code, @RequestParam String action, @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(ApiResponse.ok(service.resolve(code, action, notes)));
    }
    @GetMapping("/open") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<OpenItem>>> getOpen() {
        return ResponseEntity.ok(ApiResponse.ok(service.getOpen()));
    }
    @GetMapping("/assignee/{assignedTo}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<OpenItem>>> getByAssignee(@PathVariable String assignedTo) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByAssignee(assignedTo)));
    }
    @GetMapping("/update-aging") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> getAgingStatus() {
        return ResponseEntity.ok(ApiResponse.ok(java.util.Map.of("status", "READY")));
    }
    @PostMapping("/update-aging") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Integer>> updateAging() {
        return ResponseEntity.ok(ApiResponse.ok(service.updateAging()));
    }
}
