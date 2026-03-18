package com.cbs.saleslead.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.saleslead.entity.SalesLead;
import com.cbs.saleslead.service.SalesLeadService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/sales-leads") @RequiredArgsConstructor
@Tag(name = "Sales Lead & Opportunity", description = "Lead lifecycle, pipeline management, scoring, assignment")
public class SalesLeadController {
    private final SalesLeadService service;
    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<SalesLead>> create(@RequestBody SalesLead lead) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createLead(lead))); }
    @PostMapping("/{number}/advance") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<SalesLead>> advance(@PathVariable String number, @RequestParam String stage, @RequestParam(required = false) String reason) { return ResponseEntity.ok(ApiResponse.ok(service.advanceStage(number, stage, reason))); }
    @PostMapping("/{number}/assign") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<SalesLead>> assign(@PathVariable String number, @RequestParam String assignedTo) { return ResponseEntity.ok(ApiResponse.ok(service.assign(number, assignedTo))); }
    @GetMapping("/assignee/{assignedTo}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<SalesLead>>> byAssignee(@PathVariable String assignedTo) { return ResponseEntity.ok(ApiResponse.ok(service.getByAssignee(assignedTo))); }
    @GetMapping("/stage/{stage}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<SalesLead>>> byStage(@PathVariable String stage) { return ResponseEntity.ok(ApiResponse.ok(service.getByStage(stage))); }
}
