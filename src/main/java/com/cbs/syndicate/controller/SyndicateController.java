package com.cbs.syndicate.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.syndicate.entity.SyndicateArrangement;
import com.cbs.syndicate.repository.SyndicateArrangementRepository;
import com.cbs.syndicate.service.SyndicateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
    private final SyndicateArrangementRepository syndicateArrangementRepository;

    @GetMapping
    @Operation(summary = "List all syndicated loan facilities")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SyndicateArrangement>>> listAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SyndicateArrangement> result = syndicateArrangementRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

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
