package com.cbs.oprisk.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.oprisk.entity.*;
import com.cbs.oprisk.repository.OpRiskLossEventRepository;
import com.cbs.oprisk.service.OpRiskService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
import java.util.Map;

@RestController @RequestMapping("/v1/oprisk") @RequiredArgsConstructor
@Tag(name = "Operational Risk", description = "Loss events, KRIs, RAG dashboard")
public class OpRiskController {

    private final OpRiskService opRiskService;
    private final OpRiskLossEventRepository opRiskLossEventRepository;

    @GetMapping("/loss-events")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<OpRiskLossEvent>>> listAllLossEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "eventDate"));
        Page<OpRiskLossEvent> result = opRiskLossEventRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/loss-events")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<OpRiskLossEvent>> reportEvent(
            @RequestParam String eventCategory, @RequestParam String eventType, @RequestParam String description,
            @RequestParam BigDecimal grossLoss, @RequestParam(required = false) BigDecimal recoveryAmount,
            @RequestParam(required = false) String currencyCode, @RequestParam(required = false) String businessLine,
            @RequestParam(required = false) String department, @RequestParam LocalDate eventDate,
            @RequestParam LocalDate discoveryDate, @RequestParam String reportedBy) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(opRiskService.reportLossEvent(
                eventCategory, eventType, description, grossLoss, recoveryAmount, currencyCode, businessLine, department, eventDate, discoveryDate, reportedBy)));
    }

    @GetMapping("/loss-events/{category}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<OpRiskLossEvent>>> getLossEvents(@PathVariable String category,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<OpRiskLossEvent> result = opRiskService.getLossEventsByCategory(category, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/loss-events/total")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, BigDecimal>>> getTotalLoss(
            @RequestParam(required = false) LocalDate from, @RequestParam(required = false) LocalDate to) {
        if (from == null) from = LocalDate.now().minusYears(1);
        if (to == null) to = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("totalNetLoss", opRiskService.getTotalNetLoss(from, to))));
    }

    @PostMapping("/kris")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<OpRiskKri>> createKri(@RequestBody OpRiskKri kri) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(opRiskService.createKri(kri)));
    }

    @GetMapping("/kris")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<OpRiskKri>>> getKris() {
        return ResponseEntity.ok(ApiResponse.ok(opRiskService.getAllActiveKris()));
    }

    @PostMapping("/kris/{kriCode}/readings")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<OpRiskKriReading>> recordReading(@PathVariable String kriCode,
            @RequestParam LocalDate readingDate, @RequestParam BigDecimal value, @RequestParam(required = false) String commentary) {
        return ResponseEntity.ok(ApiResponse.ok(opRiskService.recordKriReading(kriCode, readingDate, value, commentary)));
    }

    @GetMapping("/dashboard/{date}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<OpRiskKriReading>>> getDashboard(@PathVariable LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(opRiskService.getDashboard(date)));
    }

    // List all operational risk loss events with stats
    @GetMapping
    @Operation(summary = "List all operational risk loss events")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<OpRiskLossEvent>>> listLossEvents(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "eventDate"));
        Page<OpRiskLossEvent> result = opRiskLossEventRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
