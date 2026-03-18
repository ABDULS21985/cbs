package com.cbs.syndicate.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.syndicate.entity.SyndicateArrangement;
import com.cbs.syndicate.service.SyndicateService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/syndicates")
@RequiredArgsConstructor
@Tag(name = "Syndicate Management", description = "Loan syndication, bond underwriting — participants, share %, pricing, lifecycle")
public class SyndicateController {

    private final SyndicateService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SyndicateArrangement>> create(@RequestBody SyndicateArrangement s) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(s)));
    }

    @PostMapping("/{code}/activate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SyndicateArrangement>> activate(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.activate(code)));
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SyndicateArrangement>>> byType(@PathVariable String type) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByType(type)));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SyndicateArrangement>>> active() {
        return ResponseEntity.ok(ApiResponse.ok(service.getActive()));
    }
}
