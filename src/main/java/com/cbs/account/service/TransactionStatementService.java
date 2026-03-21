package com.cbs.account.service;

import com.cbs.account.dto.TransactionWorkflowDto;
import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.common.audit.CurrentCustomerProvider;
import com.cbs.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransactionStatementService {

    private final AccountRepository accountRepository;
    private final TransactionJournalRepository transactionJournalRepository;
    private final CurrentCustomerProvider currentCustomerProvider;
    private final com.cbs.notification.service.NotificationService notificationService;

    public StatementDownload generateStatement(TransactionWorkflowDto.StatementRequest request) {
        if (request == null || !StringUtils.hasText(request.getAccountNumber())) {
            throw new BusinessException("Account number is required for statement generation", "STATEMENT_ACCOUNT_REQUIRED");
        }
        LocalDate fromDate = request.getFromDate() != null ? request.getFromDate() : LocalDate.now().minusMonths(1);
        LocalDate toDate = request.getToDate() != null ? request.getToDate() : LocalDate.now();
        if (fromDate.isAfter(toDate)) {
            throw new BusinessException("Statement start date must be before end date", "INVALID_STATEMENT_PERIOD");
        }

        Account account = accountRepository.findByAccountNumberWithDetails(request.getAccountNumber().trim())
                .orElseThrow(() -> new BusinessException("Account not found for statement generation", "STATEMENT_ACCOUNT_NOT_FOUND"));
        enforcePortalOwnership(account);

        List<TransactionJournal> transactions = transactionJournalRepository.findByAccountIdAndDateRange(account.getId(), fromDate, toDate)
                .stream()
                .sorted(Comparator.comparing(TransactionJournal::getPostingDate).thenComparing(TransactionJournal::getCreatedAt))
                .toList();

        BigDecimal openingBalance = transactions.isEmpty()
                ? account.getBookBalance()
                : transactions.get(0).getRunningBalance()
                .add(isDebitLike(transactions.get(0)) ? transactions.get(0).getAmount() : transactions.get(0).getAmount().negate());
        BigDecimal closingBalance = transactions.isEmpty()
                ? account.getBookBalance()
                : transactions.get(transactions.size() - 1).getRunningBalance();

        String html = renderHtml(account, transactions, fromDate, toDate, openingBalance, closingBalance);
        String extension = "HTML";
        return new StatementDownload(
                html.getBytes(StandardCharsets.UTF_8),
                "statement-" + account.getAccountNumber() + "-" + fromDate + "-to-" + toDate + "." + extension.toLowerCase(),
                "text/html"
        );
    }

    public TransactionWorkflowDto.StatementDelivery queueEmail(TransactionWorkflowDto.StatementRequest request) {
        if (request == null || !StringUtils.hasText(request.getAccountNumber())) {
            throw new BusinessException("Account number is required for statement delivery", "STATEMENT_ACCOUNT_REQUIRED");
        }
        Account account = accountRepository.findByAccountNumberWithDetails(request.getAccountNumber().trim())
                .orElseThrow(() -> new BusinessException("Account not found for statement delivery", "STATEMENT_ACCOUNT_NOT_FOUND"));
        enforcePortalOwnership(account);
        String email = StringUtils.hasText(request.getEmailAddress())
                ? request.getEmailAddress().trim()
                : account.getCustomer() != null ? account.getCustomer().getEmail() : null;
        if (!StringUtils.hasText(email)) {
            throw new BusinessException("Customer email is not available for statement delivery", "STATEMENT_EMAIL_REQUIRED");
        }

        // Generate the statement
        StatementDownload statement = generateStatement(request);
        String customerName = account.getCustomer() != null ? account.getCustomer().getDisplayName() : "Customer";
        Long customerId = account.getCustomer() != null ? account.getCustomer().getId() : null;

        // Dispatch via NotificationService — EMAIL channel
        String subject = "Account Statement — " + account.getAccountNumber();
        String body = "Dear " + HtmlUtils.htmlEscape(customerName) + ",<br><br>"
                + "Please find your account statement for " + account.getAccountNumber() + " attached.<br><br>"
                + "This statement covers the period from "
                + (request.getFromDate() != null ? request.getFromDate().toString() : "account opening")
                + " to " + (request.getToDate() != null ? request.getToDate().toString() : "today") + ".<br><br>"
                + "Regards,<br>BellBank";

        notificationService.sendDirect(
                com.cbs.notification.entity.NotificationChannel.EMAIL,
                email, customerName, subject, body, customerId, "STATEMENT_DELIVERY"
        );

        // Also send an IN_APP notification
        if (customerId != null) {
            notificationService.sendDirect(
                    com.cbs.notification.entity.NotificationChannel.IN_APP,
                    customerId.toString(), customerName,
                    "Statement Sent",
                    "Your account statement for " + account.getAccountNumber() + " has been sent to " + email + ".",
                    customerId, "STATEMENT_DELIVERY"
            );
        }

        return TransactionWorkflowDto.StatementDelivery.builder()
                .status("SENT")
                .accountNumber(account.getAccountNumber())
                .emailAddress(email)
                .generatedAt(Instant.now())
                .message("Statement dispatched to " + email)
                .build();
    }

    private String renderHtml(Account account,
                              List<TransactionJournal> transactions,
                              LocalDate fromDate,
                              LocalDate toDate,
                              BigDecimal openingBalance,
                              BigDecimal closingBalance) {
        String rows = transactions.stream()
                .map(transaction -> """
                        <tr>
                          <td>%s</td>
                          <td>%s</td>
                          <td>%s</td>
                          <td class="money">%s</td>
                          <td class="money">%s</td>
                          <td class="money">%s</td>
                        </tr>
                        """.formatted(
                        HtmlUtils.htmlEscape(String.valueOf(transaction.getPostingDate())),
                        HtmlUtils.htmlEscape(transaction.getTransactionRef()),
                        HtmlUtils.htmlEscape(transaction.getNarration()),
                        isDebitLike(transaction) ? transaction.getAmount().toPlainString() : "—",
                        isDebitLike(transaction) ? "—" : transaction.getAmount().toPlainString(),
                        transaction.getRunningBalance().toPlainString()
                ))
                .reduce("", String::concat);

        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8" />
                  <title>BellBank Statement %s</title>
                  <style>
                    body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
                    .header { border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; gap: 24px; }
                    .brand { color: #1d4ed8; font-size: 28px; font-weight: 700; }
                    .subtitle { color: #6b7280; font-size: 13px; margin-top: 4px; }
                    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
                    .summary-card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 12px; }
                    .summary-card h3 { margin: 0 0 6px; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; }
                    .summary-card p { margin: 0; font-size: 18px; font-weight: 700; }
                    table { width: 100%%; border-collapse: collapse; }
                    th { background: #1d4ed8; color: white; text-align: left; padding: 8px; font-size: 11px; }
                    td { border-bottom: 1px solid #e5e7eb; padding: 8px; font-size: 11px; vertical-align: top; }
                    .money { text-align: right; font-family: 'Courier New', monospace; }
                    .footer { margin-top: 18px; color: #6b7280; font-size: 11px; text-align: center; }
                  </style>
                </head>
                <body>
                  <div class="header">
                    <div>
                      <div class="brand">BellBank</div>
                      <div class="subtitle">Account Statement</div>
                      <div class="subtitle">%s | %s</div>
                      <div class="subtitle">Period: %s to %s</div>
                    </div>
                    <div class="subtitle">Generated: %s</div>
                  </div>
                  <div class="summary">
                    <div class="summary-card"><h3>Opening Balance</h3><p>%s</p></div>
                    <div class="summary-card"><h3>Closing Balance</h3><p>%s</p></div>
                    <div class="summary-card"><h3>Transactions</h3><p>%s</p></div>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Reference</th>
                        <th>Narration</th>
                        <th class="money">Debit</th>
                        <th class="money">Credit</th>
                        <th class="money">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody>%s</tbody>
                  </table>
                  <div class="footer">BellBank CBS | Confidential statement</div>
                </body>
                </html>
                """.formatted(
                HtmlUtils.htmlEscape(account.getAccountNumber()),
                HtmlUtils.htmlEscape(account.getAccountName()),
                HtmlUtils.htmlEscape(account.getCurrencyCode()),
                HtmlUtils.htmlEscape(String.valueOf(fromDate)),
                HtmlUtils.htmlEscape(String.valueOf(toDate)),
                DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(Instant.now().atZone(ZoneId.systemDefault()).toOffsetDateTime()),
                openingBalance.toPlainString(),
                closingBalance.toPlainString(),
                transactions.size(),
                rows
        );
    }

    private boolean isDebitLike(TransactionJournal transaction) {
        return switch (transaction.getTransactionType()) {
            case DEBIT, FEE_DEBIT, TRANSFER_OUT, LIEN_PLACEMENT -> true;
            default -> false;
        };
    }

    private void enforcePortalOwnership(Account account) {
        if (!isPortalScopedPrincipal()) {
            return;
        }
        Long currentCustomerId = currentCustomerProvider.getCurrentCustomer().getId();
        if (!Objects.equals(account.getCustomer().getId(), currentCustomerId)) {
            throw new BusinessException("You do not have access to this account statement", "STATEMENT_ACCESS_DENIED");
        }
    }

    private boolean isPortalScopedPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }
        boolean portalUser = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_PORTAL_USER".equals(authority.getAuthority()));
        boolean staffUser = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_CBS_ADMIN".equals(authority.getAuthority())
                        || "ROLE_CBS_OFFICER".equals(authority.getAuthority()));
        return portalUser && !staffUser;
    }

    public record StatementDownload(byte[] content, String filename, String contentType) {
    }
}
