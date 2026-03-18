package com.cbs.contactcenter.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.contactcenter.entity.*;
import com.cbs.contactcenter.service.ContactCenterService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/contact-center") @RequiredArgsConstructor
@Tag(name = "Contact Center", description = "Contact center management, interaction tracking, queue stats, FCR, sentiment")
public class ContactCenterController {
    private final ContactCenterService service;
    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<ContactCenter>> create(@RequestBody ContactCenter center) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createCenter(center))); }
    @PostMapping("/interactions") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<ContactInteraction>> start(@RequestBody ContactInteraction interaction) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.startInteraction(interaction))); }
    @PostMapping("/interactions/{id}/assign") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<ContactInteraction>> assign(@PathVariable String id, @RequestParam String agentId) { return ResponseEntity.ok(ApiResponse.ok(service.assignToAgent(id, agentId))); }
    @PostMapping("/interactions/{id}/complete") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<ContactInteraction>> complete(@PathVariable String id, @RequestParam String disposition, @RequestParam(required = false) String sentiment, @RequestParam(defaultValue = "false") boolean fcr) { return ResponseEntity.ok(ApiResponse.ok(service.completeInteraction(id, disposition, sentiment, fcr))); }
    @GetMapping("/interactions/customer/{customerId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<ContactInteraction>>> byCustomer(@PathVariable Long customerId) { return ResponseEntity.ok(ApiResponse.ok(service.getByCustomer(customerId))); }
    @GetMapping("/interactions/agent/{agentId}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<ContactInteraction>>> agentQueue(@PathVariable String agentId) { return ResponseEntity.ok(ApiResponse.ok(service.getAgentQueue(agentId))); }
    @GetMapping @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<List<ContactCenter>>> getCenters() { return ResponseEntity.ok(ApiResponse.ok(service.getActiveCenters())); }
}
