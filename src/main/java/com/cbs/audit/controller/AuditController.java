package com.cbs.audit.controller;

import com.cbs.audit.entity.AuditAction;
import com.cbs.audit.entity.AuditEvent;
import com.cbs.audit.service.AuditService;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/audit") @RequiredArgsConstructor
@Tag(name = "Audit Trail", description = "Compliance-grade audit event log with before/after state capture")
public class AuditController {

    private final AuditService auditService;

    @GetMapping("/entity/{entityType}/{entityId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AuditEvent>>> getEntityTrail(@PathVariable String entityType, @PathVariable Long entityId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<AuditEvent> result = auditService.getEntityAuditTrail(entityType, entityId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/user/{performedBy}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditEvent>>> getUserTrail(@PathVariable String performedBy,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<AuditEvent> result = auditService.getUserAuditTrail(performedBy, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/action/{action}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditEvent>>> getByAction(@PathVariable AuditAction action,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<AuditEvent> result = auditService.getByAction(action, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
