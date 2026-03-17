package com.cbs.gl.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.common.web.CbsPageRequestFactory;
import com.cbs.gl.dto.CreateGlAccountRequest;
import com.cbs.gl.dto.GlAccountResponse;
import com.cbs.gl.dto.GlBalanceResponse;
import com.cbs.gl.dto.JournalEntryResponse;
import com.cbs.gl.dto.JournalLineResponse;
import com.cbs.gl.dto.PostJournalRequest;
import com.cbs.gl.dto.SubledgerReconRunResponse;
import com.cbs.gl.entity.ChartOfAccounts;
import com.cbs.gl.entity.GlBalance;
import com.cbs.gl.entity.GlCategory;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.entity.JournalLine;
import com.cbs.gl.entity.SubledgerReconRun;
import com.cbs.gl.service.GeneralLedgerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/v1/gl")
@RequiredArgsConstructor
@Tag(name = "General Ledger", description = "Real-time double-entry GL, chart of accounts, journal posting, trial balance")
public class GeneralLedgerController {

    private final GeneralLedgerService glService;
    private final CbsPageRequestFactory pageRequestFactory;

    @PostMapping("/accounts")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<GlAccountResponse>> createGlAccount(
            @Valid @RequestBody CreateGlAccountRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(toGlAccountResponse(glService.createGlAccount(request))));
    }

    @GetMapping("/accounts/postable")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<GlAccountResponse>>> getPostableAccounts() {
        return ResponseEntity.ok(ApiResponse.ok(
                glService.getPostableAccounts().stream().map(this::toGlAccountResponse).toList()));
    }

    @GetMapping("/accounts/category/{category}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<GlAccountResponse>>> getByCategory(@PathVariable GlCategory category) {
        return ResponseEntity.ok(ApiResponse.ok(
                glService.getByCategory(category).stream().map(this::toGlAccountResponse).toList()));
    }

    @PostMapping("/journals")
    @Operation(summary = "Post a journal entry (validates double-entry)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<JournalEntryResponse>> postJournal(@Valid @RequestBody PostJournalRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(toJournalEntryResponse(glService.postJournal(request), true)));
    }

    @GetMapping("/journals/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<JournalEntryResponse>> getJournal(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(toJournalEntryResponse(glService.getJournal(id), true)));
    }

    @PostMapping("/journals/{id}/reverse")
    @Operation(summary = "Reverse a posted journal")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<JournalEntryResponse>> reverseJournal(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(toJournalEntryResponse(glService.reverseJournal(id), true)));
    }

    @GetMapping("/journals")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<JournalEntryResponse>>> getJournalsByDate(
            @RequestParam LocalDate from,
            @RequestParam LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<JournalEntry> result = glService.getJournalsByDate(from, to, pageRequestFactory.create(page, size));
        return ResponseEntity.ok(ApiResponse.ok(
                result.getContent().stream().map(journal -> toJournalEntryResponse(journal, false)).toList(),
                PageMeta.from(result)));
    }

    @GetMapping("/trial-balance/{date}")
    @Operation(summary = "Get trial balance for a date")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<GlBalanceResponse>>> getTrialBalance(@PathVariable LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(
                glService.getTrialBalance(date).stream().map(this::toGlBalanceResponse).toList()));
    }

    @GetMapping("/balances/{glCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<GlBalanceResponse>>> getGlHistory(
            @PathVariable String glCode,
            @RequestParam LocalDate from,
            @RequestParam LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(
                glService.getGlHistory(glCode, from, to).stream().map(this::toGlBalanceResponse).toList()));
    }

    @PostMapping("/reconciliation")
    @Operation(summary = "Run sub-ledger reconciliation")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<SubledgerReconRunResponse>> runRecon(
            @RequestParam String subledgerType,
            @RequestParam String glCode,
            @RequestParam BigDecimal subledgerBalance,
            @RequestParam LocalDate reconDate) {
        return ResponseEntity.ok(ApiResponse.ok(
                toSubledgerReconRunResponse(glService.runReconciliation(subledgerType, glCode, subledgerBalance, reconDate))));
    }

    @GetMapping("/reconciliation/{date}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<SubledgerReconRunResponse>>> getReconResults(@PathVariable LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(
                glService.getReconResults(date).stream().map(this::toSubledgerReconRunResponse).toList()));
    }

    private GlAccountResponse toGlAccountResponse(ChartOfAccounts coa) {
        return new GlAccountResponse(
                coa.getId(),
                coa.getGlCode(),
                coa.getGlName(),
                coa.getGlCategory(),
                coa.getGlSubCategory(),
                coa.getParentGlCode(),
                coa.getLevelNumber(),
                coa.getIsHeader(),
                coa.getIsPostable(),
                coa.getCurrencyCode(),
                coa.getIsMultiCurrency(),
                coa.getBranchCode(),
                coa.getIsInterBranch(),
                coa.getNormalBalance(),
                coa.getAllowManualPosting(),
                coa.getRequiresCostCentre(),
                coa.getIsActive(),
                coa.getCreatedAt(),
                coa.getUpdatedAt(),
                coa.getCreatedBy());
    }

    private JournalEntryResponse toJournalEntryResponse(JournalEntry journal, boolean includeLines) {
        List<JournalLineResponse> lines = includeLines
                ? journal.getLines().stream().map(this::toJournalLineResponse).toList()
                : List.of();
        return new JournalEntryResponse(
                journal.getId(),
                journal.getJournalNumber(),
                journal.getJournalType(),
                journal.getDescription(),
                journal.getSourceModule(),
                journal.getSourceRef(),
                journal.getValueDate(),
                journal.getPostingDate(),
                journal.getStatus(),
                journal.getTotalDebit(),
                journal.getTotalCredit(),
                journal.getCreatedBy(),
                journal.getApprovedBy(),
                journal.getPostedAt(),
                journal.getReversedAt(),
                journal.getReversalJournalId(),
                journal.getCreatedAt(),
                lines);
    }

    private JournalLineResponse toJournalLineResponse(JournalLine line) {
        return new JournalLineResponse(
                line.getId(),
                line.getLineNumber(),
                line.getGlCode(),
                line.getDebitAmount(),
                line.getCreditAmount(),
                line.getCurrencyCode(),
                line.getLocalDebit(),
                line.getLocalCredit(),
                line.getFxRate(),
                line.getNarration(),
                line.getCostCentre(),
                line.getBranchCode(),
                line.getAccountId(),
                line.getCustomerId(),
                line.getCreatedAt());
    }

    private GlBalanceResponse toGlBalanceResponse(GlBalance balance) {
        return new GlBalanceResponse(
                balance.getId(),
                balance.getGlCode(),
                balance.getBranchCode(),
                balance.getCurrencyCode(),
                balance.getBalanceDate(),
                balance.getOpeningBalance(),
                balance.getDebitTotal(),
                balance.getCreditTotal(),
                balance.getClosingBalance(),
                balance.getTransactionCount(),
                balance.getCreatedAt(),
                balance.getUpdatedAt());
    }

    private SubledgerReconRunResponse toSubledgerReconRunResponse(SubledgerReconRun recon) {
        return new SubledgerReconRunResponse(
                recon.getId(),
                recon.getReconDate(),
                recon.getSubledgerType(),
                recon.getGlCode(),
                recon.getGlBalance(),
                recon.getSubledgerBalance(),
                recon.getDifference(),
                recon.getIsBalanced(),
                recon.getExceptionCount(),
                recon.getStatus(),
                recon.getResolvedBy(),
                recon.getResolvedAt(),
                recon.getCreatedAt());
    }
}
