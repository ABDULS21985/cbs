package com.cbs.account.controller;

import com.cbs.account.dto.TransactionResponse;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/transactions")
@RequiredArgsConstructor
@Tag(name = "Transaction Search", description = "Cross-account transaction search, detail, and reversal")
public class TransactionController {

    private final TransactionJournalRepository transactionJournalRepository;
    @GetMapping
    @Operation(summary = "Search transactions across all accounts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<TransactionResponse>>> searchTransactions(
            @RequestParam(required = false) String accountNumber,
            @RequestParam(required = false) String transactionRef,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<TransactionJournal> result = transactionJournalRepository.findAll(pageable);

        List<TransactionResponse> responses = result.getContent().stream()
                .map(this::mapToResponse)
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(responses, PageMeta.from(result)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get transaction detail by ID")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<TransactionResponse>> getTransaction(@PathVariable Long id) {
        TransactionJournal txn = transactionJournalRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Transaction not found: " + id));
        return ResponseEntity.ok(ApiResponse.ok(mapToResponse(txn)));
    }

    @PostMapping("/{id}/reverse")
    @Operation(summary = "Reverse a transaction")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> reverseTransaction(
            @PathVariable Long id,
            @RequestParam(required = false) String reason,
            @RequestParam(required = false) String performedBy) {
        TransactionJournal txn = transactionJournalRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Transaction not found: " + id));

        if (Boolean.TRUE.equals(txn.getIsReversed())) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Transaction already reversed"));
        }

        // Generate reversal ref
        Long seq = transactionJournalRepository.getNextTransactionRefSequence();
        String reversalRef = "REV" + String.format("%012d", seq);

        txn.setIsReversed(true);
        txn.setReversalRef(reversalRef);
        transactionJournalRepository.save(txn);

        // Create contra entry
        TransactionJournal reversal = new TransactionJournal();
        reversal.setTransactionRef(reversalRef);
        reversal.setAccount(txn.getAccount());
        reversal.setContraAccount(txn.getContraAccount());
        reversal.setTransactionType(txn.getTransactionType());
        reversal.setAmount(txn.getAmount().negate());
        reversal.setCurrencyCode(txn.getCurrencyCode());
        reversal.setRunningBalance(txn.getAccount().getBookBalance());
        reversal.setNarration("REVERSAL: " + (reason != null ? reason : txn.getNarration()));
        reversal.setStatus("POSTED");
        reversal.setCreatedBy(performedBy != null ? performedBy : "SYSTEM");
        reversal.setCreatedAt(Instant.now());
        transactionJournalRepository.save(reversal);

        return ResponseEntity.ok(ApiResponse.ok(
                Map.of("message", "Transaction reversed successfully", "reversalRef", reversalRef)));
    }

    @GetMapping("/{id}/receipt")
    @Operation(summary = "Download transaction receipt")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getReceipt(@PathVariable Long id) {
        TransactionJournal txn = transactionJournalRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Transaction not found: " + id));
        TransactionResponse response = mapToResponse(txn);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "transaction", response,
                "receiptNumber", "RCT-" + txn.getTransactionRef(),
                "generatedAt", Instant.now().toString()
        )));
    }

    private TransactionResponse mapToResponse(TransactionJournal txn) {
        return TransactionResponse.builder()
                .id(txn.getId())
                .transactionRef(txn.getTransactionRef())
                .accountNumber(txn.getAccount() != null ? txn.getAccount().getAccountNumber() : null)
                .transactionType(txn.getTransactionType())
                .amount(txn.getAmount())
                .currencyCode(txn.getCurrencyCode())
                .runningBalance(txn.getRunningBalance())
                .narration(txn.getNarration())
                .valueDate(txn.getValueDate())
                .postingDate(txn.getPostingDate())
                .contraAccountNumber(txn.getContraAccountNumber())
                .channel(txn.getChannel())
                .externalRef(txn.getExternalRef())
                .status(txn.getStatus())
                .isReversed(txn.getIsReversed())
                .createdAt(txn.getCreatedAt())
                .createdBy(txn.getCreatedBy())
                .build();
    }
}
