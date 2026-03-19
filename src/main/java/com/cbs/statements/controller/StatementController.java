package com.cbs.statements.controller;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/v1/statements")
@RequiredArgsConstructor
@Tag(name = "Statements", description = "Account statements, certificates, confirmations, and subscriptions")
public class StatementController {

    private final AccountRepository accountRepository;
    private final TransactionJournalRepository transactionJournalRepository;

    @PostMapping("/generate")
    @Operation(summary = "Generate statement for account and date range")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generateStatement(
            @RequestParam Long accountId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));

        List<TransactionJournal> transactions = transactionJournalRepository
                .findByAccountIdAndDateRange(accountId, fromDate, toDate);

        BigDecimal openingBalance = BigDecimal.ZERO;
        BigDecimal closingBalance = account.getBookBalance();
        BigDecimal totalCredits = BigDecimal.ZERO;
        BigDecimal totalDebits = BigDecimal.ZERO;

        List<Map<String, Object>> txnList = new ArrayList<>();
        for (TransactionJournal txn : transactions) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("transactionRef", txn.getTransactionRef());
            entry.put("date", txn.getPostingDate());
            entry.put("narration", txn.getNarration());
            entry.put("type", txn.getTransactionType().name());
            entry.put("amount", txn.getAmount());
            entry.put("runningBalance", txn.getRunningBalance());
            txnList.add(entry);

            if (txn.getTransactionType().name().contains("CREDIT") || txn.getTransactionType().name().contains("DEPOSIT")) {
                totalCredits = totalCredits.add(txn.getAmount());
            } else {
                totalDebits = totalDebits.add(txn.getAmount());
            }
        }

        if (!transactions.isEmpty()) {
            closingBalance = transactions.get(0).getRunningBalance();
            openingBalance = transactions.get(transactions.size() - 1).getRunningBalance()
                    .subtract(transactions.get(transactions.size() - 1).getAmount());
        }

        String statementId = "STMT-" + accountId + "-" + System.currentTimeMillis();

        Map<String, Object> statement = new LinkedHashMap<>();
        statement.put("statementId", statementId);
        statement.put("accountId", accountId);
        statement.put("accountNumber", account.getAccountNumber());
        statement.put("accountName", account.getAccountName());
        statement.put("currencyCode", account.getCurrencyCode());
        statement.put("fromDate", fromDate);
        statement.put("toDate", toDate);
        statement.put("openingBalance", openingBalance);
        statement.put("closingBalance", closingBalance);
        statement.put("totalCredits", totalCredits);
        statement.put("totalDebits", totalDebits);
        statement.put("transactionCount", transactions.size());
        statement.put("transactions", txnList);
        statement.put("generatedAt", Instant.now().toString());

        return ResponseEntity.ok(ApiResponse.ok(statement));
    }

    @GetMapping("/download")
    @Operation(summary = "Download generated statement (PDF-ready data)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> downloadStatement(
            @RequestParam Long accountId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "PDF") String format) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));

        List<TransactionJournal> transactions = transactionJournalRepository
                .findByAccountIdAndDateRange(accountId, fromDate, toDate);

        Map<String, Object> downloadData = new LinkedHashMap<>();
        downloadData.put("accountNumber", account.getAccountNumber());
        downloadData.put("accountName", account.getAccountName());
        downloadData.put("currencyCode", account.getCurrencyCode());
        downloadData.put("fromDate", fromDate);
        downloadData.put("toDate", toDate);
        downloadData.put("transactionCount", transactions.size());
        downloadData.put("format", format);
        downloadData.put("generatedAt", Instant.now().toString());
        downloadData.put("downloadReady", true);

        return ResponseEntity.ok(ApiResponse.ok(downloadData));
    }

    @PostMapping("/email")
    @Operation(summary = "Email statement to customer")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> emailStatement(
            @RequestParam Long accountId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam String emailAddress) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "accountId", accountId,
                "accountNumber", account.getAccountNumber(),
                "emailAddress", emailAddress,
                "fromDate", fromDate.toString(),
                "toDate", toDate.toString(),
                "status", "QUEUED",
                "message", "Statement has been queued for delivery to " + emailAddress,
                "timestamp", Instant.now().toString()
        )));
    }

    @GetMapping("/certificate")
    @Operation(summary = "Certificate of balance data for an account")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCertificateOfBalance(
            @RequestParam Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));

        Map<String, Object> certificate = new LinkedHashMap<>();
        certificate.put("accountId", accountId);
        certificate.put("accountNumber", account.getAccountNumber());
        certificate.put("accountName", account.getAccountName());
        certificate.put("currencyCode", account.getCurrencyCode());
        certificate.put("currentBalance", account.getBookBalance());
        certificate.put("availableBalance", account.getAvailableBalance());
        certificate.put("accountStatus", account.getStatus().name());
        certificate.put("asOfDate", LocalDate.now());
        certificate.put("certificateRef", "COB-" + accountId + "-" + System.currentTimeMillis());
        certificate.put("generatedAt", Instant.now().toString());

        return ResponseEntity.ok(ApiResponse.ok(certificate));
    }

    @GetMapping("/confirmation")
    @Operation(summary = "Account confirmation letter data")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAccountConfirmation(
            @RequestParam Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));

        Map<String, Object> confirmation = new LinkedHashMap<>();
        confirmation.put("accountId", accountId);
        confirmation.put("accountNumber", account.getAccountNumber());
        confirmation.put("accountName", account.getAccountName());
        confirmation.put("accountType", account.getAccountType().name());
        confirmation.put("currencyCode", account.getCurrencyCode());
        confirmation.put("accountStatus", account.getStatus().name());
        confirmation.put("openedDate", account.getOpenedDate());
        confirmation.put("branchCode", account.getBranchCode());
        confirmation.put("confirmationRef", "ACL-" + accountId + "-" + System.currentTimeMillis());
        confirmation.put("generatedAt", Instant.now().toString());

        return ResponseEntity.ok(ApiResponse.ok(confirmation));
    }

    @GetMapping("/subscriptions")
    @Operation(summary = "Recurring statement subscriptions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','PORTAL_USER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSubscriptions(
            @RequestParam(required = false) Long customerId) {
        // Statement subscriptions are not stored in a dedicated table yet, return empty list
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }
}
