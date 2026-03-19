package com.cbs.cheque.controller;

import com.cbs.cheque.entity.*;
import com.cbs.cheque.repository.ChequeBookRepository;
import com.cbs.cheque.repository.ChequeLeafRepository;
import com.cbs.cheque.service.ChequeService;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/v1/cheques")
@RequiredArgsConstructor
@Tag(name = "Cheque Management", description = "Book issuance, presentation, clearing, stop payment")
public class ChequeController {

    private final ChequeService chequeService;
    private final ChequeBookRepository chequeBookRepository;
    private final ChequeLeafRepository chequeLeafRepository;

    @PostMapping("/books")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ChequeBook>> issueBook(@RequestParam Long accountId, @RequestParam String seriesPrefix,
            @RequestParam int startNumber, @RequestParam int totalLeaves) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(chequeService.issueBook(accountId, seriesPrefix, startNumber, totalLeaves)));
    }

    @GetMapping("/books/account/{accountId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<ChequeBook>>> getActiveBooks(@PathVariable Long accountId) {
        return ResponseEntity.ok(ApiResponse.ok(chequeService.getActiveBooks(accountId)));
    }

    @PostMapping("/present")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ChequeLeaf>> present(@RequestParam Long accountId, @RequestParam String chequeNumber,
            @RequestParam BigDecimal amount, @RequestParam String payeeName, @RequestParam(required = false) String presentingBankCode) {
        return ResponseEntity.ok(ApiResponse.ok(chequeService.presentCheque(accountId, chequeNumber, amount, payeeName, presentingBankCode)));
    }

    @PostMapping("/{leafId}/clear")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<ChequeLeaf>> clear(@PathVariable Long leafId) {
        return ResponseEntity.ok(ApiResponse.ok(chequeService.clearCheque(leafId)));
    }

    @PostMapping("/stop")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<ChequeLeaf>> stop(@RequestParam Long accountId, @RequestParam String chequeNumber,
            @RequestParam String reason, @RequestParam String stoppedBy) {
        return ResponseEntity.ok(ApiResponse.ok(chequeService.stopCheque(accountId, chequeNumber, reason, stoppedBy)));
    }

    @GetMapping("/account/{accountId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<ChequeLeaf>>> getAccountCheques(@PathVariable Long accountId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        Page<ChequeLeaf> result = chequeService.getAccountCheques(accountId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/books")
    @Operation(summary = "List all cheque books")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ChequeBook>>> listBooks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ChequeBook> result = chequeBookRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/clearing")
    @Operation(summary = "List cheques in clearing")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ChequeLeaf>>> listClearing(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ChequeLeaf> result = chequeLeafRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(
                result.getContent().stream()
                        .filter(l -> l.getStatus() == ChequeStatus.CLEARING || l.getStatus() == ChequeStatus.PRESENTED)
                        .toList()));
    }

    @GetMapping("/stop-payments")
    @Operation(summary = "List stopped cheques")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ChequeLeaf>>> listStopPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ChequeLeaf> result = chequeLeafRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(
                result.getContent().stream()
                        .filter(l -> l.getStatus() == ChequeStatus.STOPPED)
                        .toList()));
    }

    @GetMapping("/returns")
    @Operation(summary = "List returned cheques")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ChequeLeaf>>> listReturns(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ChequeLeaf> result = chequeLeafRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(
                result.getContent().stream()
                        .filter(l -> l.getStatus() == ChequeStatus.RETURNED)
                        .toList()));
    }
}
