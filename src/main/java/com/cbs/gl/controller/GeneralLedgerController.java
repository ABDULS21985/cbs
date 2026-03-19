package com.cbs.gl.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.gl.entity.*;
import com.cbs.gl.repository.ChartOfAccountsRepository;
import com.cbs.gl.repository.GlBalanceRepository;
import com.cbs.gl.repository.JournalEntryRepository;
import com.cbs.gl.repository.SubledgerReconRunRepository;
import com.cbs.gl.service.GeneralLedgerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController @RequestMapping("/v1/gl") @RequiredArgsConstructor
@Tag(name = "General Ledger", description = "Real-time double-entry GL, chart of accounts, journal posting, trial balance")
public class GeneralLedgerController {

    private final GeneralLedgerService glService;
    private final ChartOfAccountsRepository chartOfAccountsRepository;
    private final GlBalanceRepository glBalanceRepository;
    private final JournalEntryRepository journalEntryRepository;
    private final SubledgerReconRunRepository subledgerReconRunRepository;

    @PostMapping("/accounts")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<ChartOfAccounts>> createGlAccount(@RequestBody ChartOfAccounts coa) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(glService.createGlAccount(coa)));
    }

    @GetMapping("/accounts/postable")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ChartOfAccounts>>> getPostableAccounts() {
        return ResponseEntity.ok(ApiResponse.ok(glService.getPostableAccounts()));
    }

    @GetMapping("/accounts/category/{category}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ChartOfAccounts>>> getByCategory(@PathVariable GlCategory category) {
        return ResponseEntity.ok(ApiResponse.ok(glService.getByCategory(category)));
    }

    @PostMapping("/journals")
    @Operation(summary = "Post a journal entry (validates double-entry)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<JournalEntry>> postJournal(
            @RequestParam String journalType, @RequestParam String description,
            @RequestParam(required = false) String sourceModule, @RequestParam(required = false) String sourceRef,
            @RequestParam(required = false) LocalDate valueDate, @RequestParam String createdBy,
            @RequestBody List<GeneralLedgerService.JournalLineRequest> lines) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                glService.postJournal(journalType, description, sourceModule, sourceRef, valueDate, createdBy, lines)));
    }

    @GetMapping("/journals/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<JournalEntry>> getJournal(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(glService.getJournal(id)));
    }

    @PostMapping("/journals/{id}/reverse")
    @Operation(summary = "Reverse a posted journal")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<JournalEntry>> reverseJournal(@PathVariable Long id, @RequestParam String reversedBy) {
        return ResponseEntity.ok(ApiResponse.ok(glService.reverseJournal(id, reversedBy)));
    }

    @GetMapping("/journals")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<JournalEntry>>> getJournalsByDate(
            @RequestParam(required = false) LocalDate from, @RequestParam(required = false) LocalDate to,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        if (from == null) from = LocalDate.now().minusMonths(1);
        if (to == null) to = LocalDate.now();
        Page<JournalEntry> result = glService.getJournalsByDate(from, to, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/trial-balance/{date}")
    @Operation(summary = "Get trial balance for a date")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<GlBalance>>> getTrialBalance(@PathVariable LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(glService.getTrialBalance(date)));
    }

    @GetMapping("/balances/{glCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<GlBalance>>> getGlHistory(@PathVariable String glCode,
            @RequestParam LocalDate from, @RequestParam LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(glService.getGlHistory(glCode, from, to)));
    }

    @PostMapping("/reconciliation")
    @Operation(summary = "Run sub-ledger reconciliation")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SubledgerReconRun>> runRecon(
            @RequestParam String subledgerType, @RequestParam String glCode,
            @RequestParam BigDecimal subledgerBalance, @RequestParam LocalDate reconDate) {
        return ResponseEntity.ok(ApiResponse.ok(glService.runReconciliation(subledgerType, glCode, subledgerBalance, reconDate)));
    }

    @GetMapping("/reconciliation/{date}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SubledgerReconRun>>> getReconResults(@PathVariable LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(glService.getReconResults(date)));
    }

    // List all GL accounts (chart of accounts)
    @GetMapping
    @Operation(summary = "List all GL entries")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ChartOfAccounts>>> listAll(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "glCode"));
        Page<ChartOfAccounts> result = chartOfAccountsRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/accounts")
    @Operation(summary = "List all chart of accounts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<ChartOfAccounts>>> listAccounts(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "glCode"));
        Page<ChartOfAccounts> result = chartOfAccountsRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/balances")
    @Operation(summary = "List all GL balances for today")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<GlBalance>>> listBalances() {
        return ResponseEntity.ok(ApiResponse.ok(glBalanceRepository.findByBalanceDateOrderByGlCodeAsc(LocalDate.now())));
    }

    @GetMapping("/journals/list")
    @Operation(summary = "List all journal entries with pagination")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<JournalEntry>>> listJournals(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<JournalEntry> result = journalEntryRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @GetMapping("/trial-balance")
    @Operation(summary = "Get trial balance for today")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<GlBalance>>> getTrialBalanceToday() {
        return ResponseEntity.ok(ApiResponse.ok(glService.getTrialBalance(LocalDate.now())));
    }

    @GetMapping("/reconciliation")
    @Operation(summary = "List all reconciliation runs")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SubledgerReconRun>>> listReconciliation(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SubledgerReconRun> result = subledgerReconRunRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "reconDate")));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
