package com.cbs.hijri.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.hijri.dto.*;
import com.cbs.hijri.service.HijriCalendarService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/hijri")
@RequiredArgsConstructor
public class HijriCalendarController {

    private final HijriCalendarService hijriCalendarService;

    @GetMapping("/today")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<HijriDateResponse>> today() {
        return ResponseEntity.ok(ApiResponse.ok(hijriCalendarService.getCurrentHijriDate()));
    }

    @GetMapping("/convert")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<HijriDateResponse>> toHijri(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate gregorianDate) {
        return ResponseEntity.ok(ApiResponse.ok(hijriCalendarService.toHijri(gregorianDate)));
    }

    @GetMapping("/to-gregorian")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<LocalDate>> toGregorian(
            @RequestParam Integer hijriYear,
            @RequestParam Integer hijriMonth,
            @RequestParam Integer hijriDay) {
        return ResponseEntity.ok(ApiResponse.ok(
                hijriCalendarService.toGregorian(hijriYear, hijriMonth, hijriDay)
        ));
    }

    @GetMapping("/month")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<HijriDateResponse>>> getMonth(
            @RequestParam Integer hijriYear,
            @RequestParam Integer hijriMonth) {
        return ResponseEntity.ok(ApiResponse.ok(
                hijriCalendarService.getHijriMonthDays(hijriYear, hijriMonth)
        ));
    }

    @GetMapping("/is-business-day")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Boolean>> isBusinessDay(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(hijriCalendarService.isIslamicBusinessDay(date)));
    }

    @GetMapping("/next-business-day")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<LocalDate>> nextBusinessDay(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(hijriCalendarService.getNextIslamicBusinessDay(date)));
    }

    @GetMapping("/business-days")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Integer>> businessDays(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(hijriCalendarService.getIslamicBusinessDaysBetween(from, to)));
    }

    @GetMapping("/holidays")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ResolvedHolidayResponse>>> getHolidays() {
        return ResponseEntity.ok(ApiResponse.ok(hijriCalendarService.getActiveHolidays()));
    }

    @GetMapping("/holidays/range")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ResolvedHolidayResponse>>> getHolidaysInRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(hijriCalendarService.getHolidaysInRange(from, to)));
    }

    @PostMapping("/holidays")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<HijriHolidayResponse>> createHoliday(
            @Valid @RequestBody HijriHolidayRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(hijriCalendarService.createHoliday(request)));
    }

    @PutMapping("/holidays/{id}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<HijriHolidayResponse>> updateHoliday(
            @PathVariable Long id,
            @Valid @RequestBody HijriHolidayRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(hijriCalendarService.updateHoliday(id, request)));
    }

    @DeleteMapping("/holidays/{id}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivateHoliday(@PathVariable Long id) {
        hijriCalendarService.deactivateHoliday(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Hijri holiday deactivated"));
    }

    @PostMapping("/import")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<HijriDateResponse>>> importHijriCalendar(
            @Valid @RequestBody HijriCalendarImportRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(hijriCalendarService.importHijriCalendar(request)));
    }

    @GetMapping("/coverage")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<HijriCalendarCoverageResponse>> coverage() {
        return ResponseEntity.ok(ApiResponse.ok(hijriCalendarService.getCoverage()));
    }
}
