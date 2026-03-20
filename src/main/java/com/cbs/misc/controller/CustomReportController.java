package com.cbs.misc.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.reports.entity.CustomReport;
import com.cbs.reports.entity.ReportExecution;
import com.cbs.reports.service.ReportExecutionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/v1/reports/custom") @RequiredArgsConstructor
@Tag(name = "Custom Reports", description = "Custom report builder")
public class CustomReportController {

    private final ReportExecutionService reportExecutionService;

    @GetMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomReport>>> list(
            @RequestParam(required = false) String owner) {
        List<CustomReport> reports;
        if ("mine".equals(owner)) {
            reports = reportExecutionService.getByOwner("current-user");
        } else if ("shared".equals(owner)) {
            reports = reportExecutionService.getShared();
        } else {
            reports = reportExecutionService.getAll();
        }
        return ResponseEntity.ok(ApiResponse.ok(reports));
    }

    @GetMapping("/data-sources") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> dataSources() {
        return ResponseEntity.ok(ApiResponse.ok(List.of(
            Map.of("name", "customers", "label", "Customers", "fields", List.of("id","customerNumber","fullName","status")),
            Map.of("name", "accounts", "label", "Accounts", "fields", List.of("id","accountNumber","accountType","status","balance")),
            Map.of("name", "loans", "label", "Loans", "fields", List.of("id","loanNumber","productType","outstandingBalance","status")),
            Map.of("name", "payments", "label", "Payments", "fields", List.of("id","paymentReference","amount","status","createdAt")),
            Map.of("name", "cards", "label", "Cards", "fields", List.of("id","cardNumber","cardType","cardStatus","limit")),
            Map.of("name", "fixed_deposits", "label", "Deposits", "fields", List.of("id","depositId","principal","rate","maturityDate")),
            Map.of("name", "transactions", "label", "Transactions", "fields", List.of("id","txnRef","txnAmount","txnType","createdAt"))
        )));
    }

    @PostMapping("/preview") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> preview(@RequestBody Map<String, Object> config) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("rows", List.of(), "totalCount", 0, "preview", true)));
    }

    @PostMapping("/save") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    @SuppressWarnings("unchecked")
    public ResponseEntity<ApiResponse<CustomReport>> save(@RequestBody Map<String, Object> body) {
        CustomReport report;
        if (body.containsKey("id") && body.get("id") != null) {
            Long id = Long.valueOf(body.get("id").toString());
            report = reportExecutionService.getById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Report not found: " + id));
        } else {
            report = CustomReport.builder().build();
        }
        if (body.containsKey("name")) report.setReportName((String) body.get("name"));
        if (body.containsKey("description")) report.setDescription((String) body.get("description"));
        if (body.containsKey("category")) report.setCategory((String) body.get("category"));
        if (body.containsKey("owner")) report.setOwner((String) body.get("owner"));
        if (body.containsKey("config")) report.setConfig((Map<String, Object>) body.get("config"));
        if (body.containsKey("schedule")) {
            Object sched = body.get("schedule");
            if (sched instanceof Map) {
                report.setSchedule((Map<String, Object>) sched);
            } else if (sched instanceof String) {
                report.setSchedule(Map.of("frequency", sched));
            }
        }
        if (body.containsKey("recipients")) report.setRecipients((List<String>) body.get("recipients"));
        if (body.containsKey("savedTo")) {
            String savedTo = (String) body.get("savedTo");
            report.setAccessLevel("SHARED".equals(savedTo) ? "SHARED" : "PRIVATE");
        }
        report.setStatus("ACTIVE");
        CustomReport saved = reportExecutionService.save(report);
        return ResponseEntity.ok(ApiResponse.ok(saved));
    }

    @GetMapping("/mine") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomReport>>> mine() {
        return ResponseEntity.ok(ApiResponse.ok(reportExecutionService.getByOwner("current-user")));
    }

    @GetMapping("/{id}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomReport>> getById(@PathVariable Long id) {
        CustomReport report = reportExecutionService.getById(id)
                .orElseThrow(() -> new IllegalArgumentException("Report not found: " + id));
        return ResponseEntity.ok(ApiResponse.ok(report));
    }

    @PostMapping("/{id}/run") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> run(@PathVariable Long id) {
        Map<String, Object> result = reportExecutionService.run(id);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}/history") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ReportExecution>>> history(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(reportExecutionService.getHistory(id)));
    }

    @PostMapping("/{id}/schedule") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomReport>> updateSchedule(
            @PathVariable Long id, @RequestBody Map<String, Object> schedule) {
        return ResponseEntity.ok(ApiResponse.ok(reportExecutionService.updateSchedule(id, schedule)));
    }

    @DeleteMapping("/{id}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        reportExecutionService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
