package com.cbs.regulatory.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.regulatory.dto.RegulatoryRequests;
import com.cbs.regulatory.dto.RegulatoryResponses;
import com.cbs.regulatory.entity.RegulatoryDomainEnums;
import com.cbs.regulatory.entity.RegulatoryReturn;
import com.cbs.regulatory.entity.RegulatoryReturnTemplate;
import com.cbs.regulatory.service.RegulatoryTemplateEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/regulatory")
@RequiredArgsConstructor
public class RegulatoryTemplateController {

    private final RegulatoryTemplateEngine templateEngine;

    @PostMapping("/templates")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryReturnTemplate>> createTemplate(@RequestBody RegulatoryRequests.CreateTemplateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(templateEngine.createTemplate(request)));
    }

    @GetMapping("/templates/{code}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryReturnTemplate>> getTemplate(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(templateEngine.getTemplate(code)));
    }

    @PutMapping("/templates/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryReturnTemplate>> updateTemplate(@PathVariable Long id,
                                                                                @RequestBody RegulatoryRequests.UpdateTemplateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(templateEngine.updateTemplate(id, request)));
    }

    @GetMapping("/templates/jurisdiction/{jurisdiction}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<List<RegulatoryReturnTemplate>>> templatesByJurisdiction(@PathVariable String jurisdiction) {
        return ResponseEntity.ok(ApiResponse.ok(templateEngine.getTemplatesForJurisdiction(jurisdiction)));
    }

    @GetMapping("/templates/active")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<List<RegulatoryReturnTemplate>>> activeTemplates() {
        return ResponseEntity.ok(ApiResponse.ok(templateEngine.getAllActiveTemplates()));
    }

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryReturn>> generateReturn(@RequestBody RegulatoryRequests.GenerateReturnRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(templateEngine.generateReturn(
                request.getTemplateCode(), request.getReportingDate(), request.getPeriodFrom(), request.getPeriodTo())));
    }

    @PostMapping("/returns/{id}/regenerate")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryReturn>> regenerate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(templateEngine.regenerateReturn(id)));
    }

    @PostMapping("/returns/{id}/override-line")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<String>> overrideLine(@PathVariable Long id,
                                                            @RequestBody RegulatoryRequests.OverrideLineItemRequest request) {
        templateEngine.overrideLineItem(id, request.getLineNumber(), request.getNewValue(), request.getReason(), request.getOverrideBy());
        return ResponseEntity.ok(ApiResponse.ok("OK", "Line overridden"));
    }

    @PostMapping("/returns/{id}/validate")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryResponses.ValidationResult>> validate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(templateEngine.validateReturn(id)));
    }

    @PostMapping("/returns/{id}/cross-validate")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryResponses.ValidationResult>> crossValidate(@PathVariable Long id,
                                                                                           @RequestBody List<Long> relatedReturnIds) {
        return ResponseEntity.ok(ApiResponse.ok(templateEngine.crossValidateReturns(id, relatedReturnIds)));
    }

    @PostMapping("/returns/{id}/export")
    @PreAuthorize("hasAnyRole('FINANCE','COMPLIANCE')")
    public ResponseEntity<byte[]> export(@PathVariable Long id, @RequestParam String format) {
        RegulatoryDomainEnums.OutputFormat outputFormat = RegulatoryDomainEnums.OutputFormat.valueOf(format.toUpperCase());
        byte[] content = templateEngine.exportReturn(id, outputFormat);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename("regulatory-return-" + id + "." + format.toLowerCase())
                .build());
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok().headers(headers).body(content);
    }

    @GetMapping("/templates/{code}/compare")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<RegulatoryResponses.TemplateComparisonResult>> compareTemplateVersions(
            @PathVariable String code,
            @RequestParam int version1,
            @RequestParam int version2) {
        return ResponseEntity.ok(ApiResponse.ok(templateEngine.compareTemplateVersions(code, version1, version2)));
    }
}
