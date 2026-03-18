package com.cbs.interbankrel.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.interbankrel.entity.InterbankRelationship;
import com.cbs.interbankrel.service.InterbankRelationshipService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/interbank-relationships")
@RequiredArgsConstructor
@Tag(name = "Interbank Relationships", description = "Money market, FX trading, repo, clearing — credit lines and agreements")
public class InterbankRelationshipController {

    private final InterbankRelationshipService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<InterbankRelationship>> create(@RequestBody InterbankRelationship rel) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.create(rel)));
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<InterbankRelationship>>> byType(@PathVariable String type) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByType(type)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<InterbankRelationship>>> all() {
        return ResponseEntity.ok(ApiResponse.ok(service.getAll()));
    }
}
