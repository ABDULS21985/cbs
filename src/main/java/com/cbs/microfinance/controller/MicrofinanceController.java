package com.cbs.microfinance.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.microfinance.entity.*;
import com.cbs.microfinance.service.MicrofinanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/microfinance")
@RequiredArgsConstructor
@Tag(name = "Microfinance", description = "Group lending, member management, meeting records")
public class MicrofinanceController {

    private final MicrofinanceService microfinanceService;

    @PostMapping("/groups")
    @Operation(summary = "Create a lending group")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<LendingGroup>> createGroup(
            @RequestParam String groupName, @RequestParam GroupType groupType,
            @RequestParam Long leaderCustomerId,
            @RequestParam(required = false) String meetingLocation,
            @RequestParam(required = false) String meetingFrequency,
            @RequestParam(required = false) String meetingDay,
            @RequestParam(required = false) Integer maxMembers,
            @RequestParam(required = false) String branchCode,
            @RequestParam(required = false) String fieldOfficer) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                microfinanceService.createGroup(groupName, groupType, leaderCustomerId,
                        meetingLocation, meetingFrequency, meetingDay, maxMembers, branchCode, fieldOfficer)));
    }

    @GetMapping("/groups/{id}")
    @Operation(summary = "Get group with members")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<LendingGroup>> getGroup(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(microfinanceService.getGroup(id)));
    }

    @PostMapping("/groups/{groupId}/members")
    @Operation(summary = "Add member to group")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<GroupMember>> addMember(
            @PathVariable Long groupId, @RequestParam Long customerId,
            @RequestParam(required = false) String role) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                microfinanceService.addMember(groupId, customerId, role)));
    }

    @DeleteMapping("/groups/{groupId}/members/{customerId}")
    @Operation(summary = "Remove member from group")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Void>> removeMember(@PathVariable Long groupId, @PathVariable Long customerId) {
        microfinanceService.removeMember(groupId, customerId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Member removed"));
    }

    @PostMapping("/groups/{groupId}/meetings")
    @Operation(summary = "Record a group meeting")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<GroupMeeting>> recordMeeting(
            @PathVariable Long groupId, @RequestParam LocalDate meetingDate,
            @RequestParam(required = false) Integer attendanceCount,
            @RequestParam(required = false) BigDecimal totalCollections,
            @RequestParam(required = false) BigDecimal totalDisbursements,
            @RequestParam(required = false) String notes,
            @RequestParam(required = false) String conductedBy,
            @RequestParam(required = false) BigDecimal gpsLatitude,
            @RequestParam(required = false) BigDecimal gpsLongitude) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                microfinanceService.recordMeeting(groupId, meetingDate, attendanceCount,
                        totalCollections, totalDisbursements, notes, conductedBy, gpsLatitude, gpsLongitude)));
    }

    @GetMapping("/groups/{groupId}/meetings")
    @Operation(summary = "Get meeting history")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<GroupMeeting>>> getMeetings(
            @PathVariable Long groupId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<GroupMeeting> result = microfinanceService.getMeetingHistory(groupId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
