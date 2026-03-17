package com.cbs.proposition.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.proposition.entity.CustomerProposition;
import com.cbs.proposition.service.PropositionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/propositions") @RequiredArgsConstructor
@Tag(name = "Customer Propositions", description = "Value propositions — packaged offerings for target segments with eligibility criteria")
public class PropositionController {
    private final PropositionService propositionService;

    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CustomerProposition>> create(@RequestBody CustomerProposition proposition) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(propositionService.create(proposition)));
    }
    @PostMapping("/{code}/activate") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CustomerProposition>> activate(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(propositionService.activate(code)));
    }
    @GetMapping("/segment/{segment}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerProposition>>> bySegment(@PathVariable String segment) {
        return ResponseEntity.ok(ApiResponse.ok(propositionService.getBySegment(segment)));
    }
    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerProposition>>> all() {
        return ResponseEntity.ok(ApiResponse.ok(propositionService.getActive()));
    }
}
