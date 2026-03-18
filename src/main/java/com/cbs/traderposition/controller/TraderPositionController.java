package com.cbs.traderposition.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.traderposition.entity.TraderPosition;
import com.cbs.traderposition.entity.TraderPositionLimit;
import com.cbs.traderposition.service.TraderPositionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/trader-positions")
@RequiredArgsConstructor
@Tag(name = "Trader Position", description = "Trader position and limit management")
public class TraderPositionController {

    private final TraderPositionService traderPositionService;

    @PostMapping("/update")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TraderPosition>> updatePosition(@RequestParam String dealerId, @RequestBody TraderPosition position) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(traderPositionService.updatePosition(dealerId, position)));
    }

    @PostMapping("/limits")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<TraderPositionLimit>> setLimit(@RequestParam String dealerId, @RequestBody TraderPositionLimit limit) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(traderPositionService.setLimit(dealerId, limit)));
    }

    @GetMapping("/dealer/{dealerId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TraderPosition>>> getTraderPositions(@PathVariable String dealerId) {
        return ResponseEntity.ok(ApiResponse.ok(traderPositionService.getTraderPositions(dealerId)));
    }

    @GetMapping("/breaches")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TraderPositionLimit>>> getLimitBreaches(@RequestParam LocalDate from, @RequestParam LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(traderPositionService.getLimitBreaches(from, to)));
    }

    @GetMapping("/overnight/{deskId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<TraderPosition>>> getOvernightPositions(@PathVariable Long deskId) {
        return ResponseEntity.ok(ApiResponse.ok(traderPositionService.getOvernightPositions(deskId)));
    }
}
