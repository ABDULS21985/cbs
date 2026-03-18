package com.cbs.syndicatedloan.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.syndicatedloan.entity.SyndicateDrawdown;
import com.cbs.syndicatedloan.entity.SyndicateParticipant;
import com.cbs.syndicatedloan.entity.SyndicatedLoanFacility;
import com.cbs.syndicatedloan.service.SyndicatedLoanService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/syndicated-loans")
@RequiredArgsConstructor
@Tag(name = "Syndicated Loans", description = "Multi-bank syndicated loan facility management")
public class SyndicatedLoanController {

    private final SyndicatedLoanService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SyndicatedLoanFacility>> createFacility(@RequestBody SyndicatedLoanFacility facility) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createFacility(facility)));
    }

    @PostMapping("/{code}/participants")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SyndicateParticipant>> addParticipant(@PathVariable String code, @RequestBody SyndicateParticipant participant) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.addParticipant(code, participant)));
    }

    @PostMapping("/{code}/drawdowns")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SyndicateDrawdown>> requestDrawdown(@PathVariable String code, @RequestBody SyndicateDrawdown drawdown) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.requestDrawdown(code, drawdown)));
    }

    @PostMapping("/drawdowns/{ref}/fund")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SyndicateDrawdown>> fundDrawdown(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.ok(service.fundDrawdown(ref)));
    }

    @GetMapping("/role/{role}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SyndicatedLoanFacility>>> getByRole(@PathVariable String role) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByRole(role)));
    }

    @GetMapping("/{code}/participants")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SyndicateParticipant>>> getParticipants(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getParticipants(code)));
    }

    @GetMapping("/{code}/drawdowns")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SyndicateDrawdown>>> getDrawdowns(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getDrawdowns(code)));
    }
}
