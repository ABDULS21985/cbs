package com.cbs.account.controller;

import com.cbs.account.dto.TransactionWorkflowDto;
import com.cbs.account.service.TransactionDisputeService;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/v1/transactions")
@RequiredArgsConstructor
@Tag(name = "Transaction Disputes", description = "Dispute filing and tracking for payment transactions")
public class DisputeController {

    private final TransactionDisputeService transactionDisputeService;

    @PostMapping(path = "/{id}/dispute", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Raise a dispute for a transaction")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<TransactionWorkflowDto.DisputeRecord>> raiseDispute(
            @PathVariable Long id,
            @RequestParam String reasonCode,
            @RequestParam String description,
            @RequestParam(required = false) String contactEmail,
            @RequestParam(required = false) String contactPhone,
            @RequestPart(name = "files", required = false) List<MultipartFile> files) {
        TransactionWorkflowDto.DisputeActionRequest request = TransactionWorkflowDto.DisputeActionRequest.builder()
                .notes(description)
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                transactionDisputeService.fileDispute(id, request, reasonCode, contactEmail, contactPhone, files)
        ));
    }

    @GetMapping("/disputes")
    @Operation(summary = "List transaction disputes")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<TransactionWorkflowDto.DisputeRecord>>> listDisputes(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<TransactionWorkflowDto.DisputeRecord> result = transactionDisputeService.listDisputes(status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/disputes/dashboard")
    @Operation(summary = "Get dispute dashboard counts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<TransactionWorkflowDto.DisputeDashboard>> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(transactionDisputeService.getDashboard()));
    }

    @GetMapping("/disputes/{id}")
    @Operation(summary = "Get dispute detail")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<TransactionWorkflowDto.DisputeRecord>> getDispute(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(transactionDisputeService.getDispute(id)));
    }

    @PostMapping("/disputes/{id}/respond")
    @Operation(summary = "Respond to a dispute and move it under review")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<TransactionWorkflowDto.DisputeRecord>> respond(
            @PathVariable Long id,
            @RequestBody(required = false) TransactionWorkflowDto.DisputeActionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(transactionDisputeService.respond(id, request)));
    }

    @PostMapping("/disputes/{id}/escalate")
    @Operation(summary = "Escalate a dispute")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<TransactionWorkflowDto.DisputeRecord>> escalate(
            @PathVariable Long id,
            @RequestBody(required = false) TransactionWorkflowDto.DisputeActionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(transactionDisputeService.escalate(id, request)));
    }

    @PostMapping("/disputes/{id}/close")
    @Operation(summary = "Close a dispute")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<TransactionWorkflowDto.DisputeRecord>> close(
            @PathVariable Long id,
            @RequestBody(required = false) TransactionWorkflowDto.DisputeActionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(transactionDisputeService.close(id, request)));
    }
}
