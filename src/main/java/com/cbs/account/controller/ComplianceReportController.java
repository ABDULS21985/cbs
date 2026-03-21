package com.cbs.account.controller;

import com.cbs.account.service.TransactionComplianceReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;

@RestController
@RequestMapping("/v1/transactions/compliance")
@RequiredArgsConstructor
@Tag(name = "Transaction Compliance Reports", description = "CTR, STR, NIP, FIRS and large-value transaction exports")
public class ComplianceReportController {

    private final TransactionComplianceReportService transactionComplianceReportService;

    @GetMapping("/nip-report")
    @Operation(summary = "Download NIBSS / NIP transaction report")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','COMPLIANCE')")
    public ResponseEntity<byte[]> nipReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String channel) {
        return download(transactionComplianceReportService.generateNipReport(from, to, channel));
    }

    @GetMapping("/ctr-report")
    @Operation(summary = "Download cash transaction report")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','COMPLIANCE')")
    public ResponseEntity<byte[]> ctrReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) BigDecimal threshold,
            @RequestParam(required = false) String channel) {
        return download(transactionComplianceReportService.generateCtrReport(from, to, threshold, channel));
    }

    @GetMapping("/str-report")
    @Operation(summary = "Download suspicious transaction report")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','COMPLIANCE')")
    public ResponseEntity<byte[]> strReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String channel) {
        return download(transactionComplianceReportService.generateStrReport(from, to, channel));
    }

    @GetMapping("/firs-export")
    @Operation(summary = "Download FIRS withholding tax export")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','COMPLIANCE')")
    public ResponseEntity<byte[]> firsExport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate month) {
        return download(transactionComplianceReportService.generateFirsExport(month));
    }

    @GetMapping("/large-value-report")
    @Operation(summary = "Download large value transaction report")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','COMPLIANCE')")
    public ResponseEntity<byte[]> largeValueReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) BigDecimal threshold) {
        return download(transactionComplianceReportService.generateLargeValueReport(from, to, threshold));
    }

    private ResponseEntity<byte[]> download(TransactionComplianceReportService.ReportFile file) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + file.filename())
                .header(HttpHeaders.CONTENT_TYPE, file.contentType())
                .body(file.content());
    }
}
