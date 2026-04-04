package com.cbs.notification.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.notification.dto.*;
import com.cbs.notification.service.IslamicNotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/notifications/islamic")
@RequiredArgsConstructor
public class IslamicNotificationController {

    private final IslamicNotificationService islamicNotificationService;

    @PostMapping("/templates/{templateId}/locales")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<TemplateLocaleResponse>> addLocaleTemplate(
            @PathVariable Long templateId,
            @Valid @RequestBody CreateLocaleTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(islamicNotificationService.addLocaleTemplate(templateId, request)));
    }

    @PutMapping("/templates/{templateId}/locales/{localeId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<TemplateLocaleResponse>> updateLocaleTemplate(
            @PathVariable Long templateId,
            @PathVariable Long localeId,
            @Valid @RequestBody UpdateLocaleTemplateRequest request) {
        islamicNotificationService.getLocaleTemplates(templateId);
        return ResponseEntity.ok(ApiResponse.ok(islamicNotificationService.updateLocaleTemplate(localeId, request)));
    }

    @GetMapping("/templates/{templateId}/locales")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<TemplateLocaleResponse>>> getLocaleTemplates(@PathVariable Long templateId) {
        return ResponseEntity.ok(ApiResponse.ok(islamicNotificationService.getLocaleTemplates(templateId)));
    }

    @PostMapping("/templates/{templateId}/render")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<RenderedNotificationResponse>> renderTemplate(
            @PathVariable Long templateId,
            @Valid @RequestBody RenderIslamicNotificationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                islamicNotificationService.resolveTemplate(templateId, request.getLocale(), request.getVariables(), request.getContext())
        ));
    }

    @PostMapping("/templates/{templateId}/render-bilingual")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<BilingualNotificationResponse>> renderBilingual(
            @PathVariable Long templateId,
            @Valid @RequestBody RenderIslamicNotificationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                islamicNotificationService.renderBilingual(templateId, request.getVariables(), request.getContext())
        ));
    }

    @GetMapping("/terminology")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, TerminologyResponse>>> getTerminologyDictionary() {
        return ResponseEntity.ok(ApiResponse.ok(islamicNotificationService.getTerminologyDictionary()));
    }

    @GetMapping("/terminology/{context}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<TerminologyResponse>>> getTerminologyByContext(@PathVariable String context) {
        return ResponseEntity.ok(ApiResponse.ok(islamicNotificationService.getTerminologyMappings(context)));
    }

    @PostMapping("/terminology")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<TerminologyResponse>> addTerminologyMapping(
            @Valid @RequestBody CreateTerminologyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(islamicNotificationService.addTerminologyMapping(request)));
    }

    @PutMapping("/terminology/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<TerminologyResponse>> updateTerminologyMapping(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTerminologyRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(islamicNotificationService.updateTerminologyMapping(id, request)));
    }

    @DeleteMapping("/terminology/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','COMPLIANCE')")
    public ResponseEntity<ApiResponse<Void>> deactivateTerminologyMapping(@PathVariable Long id) {
        islamicNotificationService.deactivateTerminologyMapping(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Islamic terminology mapping deactivated"));
    }
}
