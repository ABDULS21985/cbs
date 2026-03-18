package com.cbs.partyrouting.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.partyrouting.entity.PartyRoutingProfile;
import com.cbs.partyrouting.service.PartyRoutingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/party-routing")
@RequiredArgsConstructor
@Tag(name = "Party Routing", description = "Customer preferences — channel, language, RM, service tier, consent, risk profile")
public class PartyRoutingController {

    private final PartyRoutingService service;

    @PostMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<PartyRoutingProfile>> upsert(@RequestBody PartyRoutingProfile profile) {
        return ResponseEntity.ok(ApiResponse.ok(service.upsert(profile)));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<PartyRoutingProfile>> byCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByCustomer(customerId)));
    }

    @GetMapping("/rm/{rmId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<PartyRoutingProfile>>> byRm(@PathVariable String rmId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByRm(rmId)));
    }
}
