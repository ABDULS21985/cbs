package com.cbs.shariah.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.shariah.dto.*;
import com.cbs.shariah.entity.FatwaCategory;
import com.cbs.shariah.entity.FatwaStatus;
import com.cbs.shariah.entity.ReviewRequestStatus;
import com.cbs.shariah.service.ShariahGovernanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/v1/shariah")
@RequiredArgsConstructor
@Tag(name = "Shariah Governance", description = "SSB management, Fatwa registry, review workflows, and compliance dashboard")
public class ShariahGovernanceController {

    private final ShariahGovernanceService service;

    // ── SSB Board Members ───────────────────────────────────────────────

    @PostMapping("/ssb/members")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Operation(summary = "Register a new SSB board member")
    public ResponseEntity<ApiResponse<SsbMemberResponse>> createMember(
            @Valid @RequestBody CreateSsbMemberRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.createMember(request, auth.getName())));
    }

    @GetMapping("/ssb/members")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','SHARIAH_OFFICER')")
    @Operation(summary = "List active SSB board members")
    public ResponseEntity<ApiResponse<List<SsbMemberResponse>>> getActiveMembers() {
        return ResponseEntity.ok(ApiResponse.ok(service.getActiveMembers()));
    }

    @PutMapping("/ssb/members/{id}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Operation(summary = "Update SSB board member details")
    public ResponseEntity<ApiResponse<SsbMemberResponse>> updateMember(
            @PathVariable Long id, @Valid @RequestBody CreateSsbMemberRequest request, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(service.updateMember(id, request, auth.getName())));
    }

    @PostMapping("/ssb/members/{id}/deactivate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Operation(summary = "Deactivate an SSB board member")
    public ResponseEntity<ApiResponse<Void>> deactivateMember(@PathVariable Long id, Authentication auth) {
        service.deactivateMember(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.ok(null, "Member deactivated"));
    }

    // ── Fatwa Registry ──────────────────────────────────────────────────

    @PostMapping("/fatwa")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','SHARIAH_OFFICER')")
    @Operation(summary = "Create a new Fatwa draft")
    public ResponseEntity<ApiResponse<FatwaResponse>> createFatwa(
            @Valid @RequestBody CreateFatwaRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.createFatwa(request, auth.getName())));
    }

    @GetMapping("/fatwa")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','SHARIAH_OFFICER')")
    @Operation(summary = "List fatwas with optional status and category filters")
    public ResponseEntity<ApiResponse<List<FatwaResponse>>> listFatwas(
            @RequestParam(required = false) FatwaStatus status,
            @RequestParam(required = false) FatwaCategory category) {
        return ResponseEntity.ok(ApiResponse.ok(service.listFatwas(status, category)));
    }

    @GetMapping("/fatwa/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','SHARIAH_OFFICER')")
    @Operation(summary = "Get fatwa detail by ID")
    public ResponseEntity<ApiResponse<FatwaResponse>> getFatwa(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getFatwa(id)));
    }

    @PutMapping("/fatwa/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','SHARIAH_OFFICER')")
    @Operation(summary = "Update a draft fatwa")
    public ResponseEntity<ApiResponse<FatwaResponse>> updateFatwa(
            @PathVariable Long id, @Valid @RequestBody UpdateFatwaRequest request, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(service.updateFatwa(id, request, auth.getName())));
    }

    @PostMapping("/fatwa/{id}/activate")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Operation(summary = "Activate a draft fatwa (makes it effective)")
    public ResponseEntity<ApiResponse<FatwaResponse>> activateFatwa(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(service.activateFatwa(id, auth.getName())));
    }

    @PostMapping("/fatwa/{id}/revoke")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Operation(summary = "Revoke an active fatwa")
    public ResponseEntity<ApiResponse<FatwaResponse>> revokeFatwa(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(service.revokeFatwa(id, auth.getName())));
    }

    @PostMapping("/fatwa/{id}/supersede")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Operation(summary = "Supersede an active fatwa with a replacement active fatwa")
    public ResponseEntity<ApiResponse<FatwaResponse>> supersedeFatwa(
            @PathVariable Long id,
            @Valid @RequestBody SupersedeFatwaRequest request,
            Authentication auth
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.supersedeFatwa(id, request.getReplacementFatwaId(), auth.getName())
        ));
    }

    // ── SSB Review Requests ─────────────────────────────────────────────

    @PostMapping("/reviews")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','SHARIAH_OFFICER')")
    @Operation(summary = "Create a new SSB review request")
    public ResponseEntity<ApiResponse<ReviewRequestResponse>> createReview(
            @Valid @RequestBody CreateReviewRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.createReview(request, auth.getName())));
    }

    @GetMapping("/reviews")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','SHARIAH_OFFICER')")
    @Operation(summary = "List review requests with optional status filter")
    public ResponseEntity<ApiResponse<List<ReviewRequestResponse>>> listReviews(
            @RequestParam(required = false) ReviewRequestStatus status) {
        return ResponseEntity.ok(ApiResponse.ok(service.listReviews(status)));
    }

    @GetMapping("/reviews/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','SHARIAH_OFFICER')")
    @Operation(summary = "Get review request detail with votes")
    public ResponseEntity<ApiResponse<ReviewRequestResponse>> getReview(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getReview(id)));
    }

    @PostMapping("/reviews/{id}/submit")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','SHARIAH_OFFICER')")
    @Operation(summary = "Submit a draft review request for SSB consideration")
    public ResponseEntity<ApiResponse<ReviewRequestResponse>> submitReview(
            @PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(service.submitReview(id, auth.getName())));
    }

    @PostMapping("/reviews/{id}/vote")
    @PreAuthorize("hasRole('SHARIAH_OFFICER')")
    @Operation(summary = "Cast a vote on a review request (must be an assigned SSB member)")
    public ResponseEntity<ApiResponse<ReviewRequestResponse>> castVote(
            @PathVariable Long id, @Valid @RequestBody CastVoteRequest request, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(
                service.castVote(id, request, auth.getName(), extractPrincipalIdentifiers(auth))
        ));
    }

    @PostMapping("/reviews/{id}/resolve")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Operation(summary = "Add resolution notes to a completed review")
    public ResponseEntity<ApiResponse<ReviewRequestResponse>> resolveReview(
            @PathVariable Long id,
            @RequestParam(required = false) String resolutionNotes,
            Authentication auth) {
        return ResponseEntity.ok(ApiResponse.ok(service.resolveReview(id, resolutionNotes, auth.getName())));
    }

    // ── Dashboard ───────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','SHARIAH_OFFICER')")
    @Operation(summary = "Get SSB governance dashboard metrics")
    public ResponseEntity<ApiResponse<SsbDashboardResponse>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.ok(service.getDashboard()));
    }

    private Set<String> extractPrincipalIdentifiers(Authentication auth) {
        Set<String> identifiers = new LinkedHashSet<>();
        if (auth == null) {
            return identifiers;
        }

        if (auth.getName() != null && !auth.getName().isBlank()) {
            identifiers.add(auth.getName());
        }

        Object principal = auth.getPrincipal();
        if (principal instanceof Jwt jwt) {
            addIfPresent(identifiers, jwt.getSubject());
            addIfPresent(identifiers, jwt.getClaimAsString("preferred_username"));
            addIfPresent(identifiers, jwt.getClaimAsString("email"));
        }

        return identifiers;
    }

    private void addIfPresent(Set<String> identifiers, String value) {
        if (value != null && !value.isBlank()) {
            identifiers.add(value);
        }
    }
}
