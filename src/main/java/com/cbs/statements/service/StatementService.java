package com.cbs.statements.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.notification.entity.NotificationChannel;
import com.cbs.notification.service.NotificationService;
import com.cbs.statements.entity.StatementSubscription;
import com.cbs.statements.repository.StatementSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class StatementService {

    private final AccountRepository accountRepository;
    private final TransactionJournalRepository transactionJournalRepository;
    private final StatementSubscriptionRepository subscriptionRepository;
    private final NotificationService notificationService;

    // ── Statement Generation ────────────────────────────────────────────────────

    public Map<String, Object> generateStatement(Long accountId, LocalDate fromDate, LocalDate toDate) {
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

            if (isCreditType(txn.getTransactionType().name())) {
                totalCredits = totalCredits.add(txn.getAmount());
            } else {
                totalDebits = totalDebits.add(txn.getAmount());
            }
        }

        // Transactions are sorted DESC by createdAt from the repository query.
        // transactions.get(0) = newest, transactions.get(size-1) = oldest
        if (!transactions.isEmpty()) {
            closingBalance = transactions.get(0).getRunningBalance();
            TransactionJournal oldest = transactions.get(transactions.size() - 1);
            openingBalance = oldest.getRunningBalance().subtract(
                    isCreditType(oldest.getTransactionType().name())
                            ? oldest.getAmount()
                            : oldest.getAmount().negate()
            );
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

        return statement;
    }

    public Map<String, Object> downloadStatement(Long accountId, LocalDate fromDate, LocalDate toDate, String format) {
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

        return downloadData;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> emailStatement(Long accountId, LocalDate fromDate, LocalDate toDate, String emailAddress) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));

        String customerName = account.getAccountName();
        Long customerId = account.getCustomer() != null ? account.getCustomer().getId() : null;

        // Generate statement data for the email body
        Map<String, Object> statement = generateStatement(accountId, fromDate, toDate);
        String htmlBody = buildStatementEmailHtml(account, statement, fromDate, toDate);
        String subject = String.format("Account Statement — %s (%s to %s)",
                account.getAccountNumber(), fromDate, toDate);

        String status = "SENT";
        String message = "Statement dispatched to " + emailAddress;
        try {
            notificationService.sendDirect(
                    NotificationChannel.EMAIL,
                    emailAddress, customerName, subject, htmlBody, customerId, "STATEMENT_DELIVERY"
            );

            // Also send an IN_APP notification
            if (customerId != null) {
                notificationService.sendDirect(
                        NotificationChannel.IN_APP,
                        customerId.toString(), customerName,
                        "Statement Sent",
                        "Your account statement for " + account.getAccountNumber()
                                + " (" + fromDate + " to " + toDate + ") has been sent to " + emailAddress + ".",
                        customerId, "STATEMENT_DELIVERY"
                );
            }

            log.info("Statement email dispatched: account={}, recipient={}, period={} to {}",
                    account.getAccountNumber(), emailAddress, fromDate, toDate);
        } catch (Exception e) {
            log.error("Failed to dispatch statement email for account {} to {}: {}",
                    account.getAccountNumber(), emailAddress, e.getMessage());
            status = "FAILED";
            message = "Failed to send statement: " + e.getMessage();
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("accountId", accountId);
        result.put("accountNumber", account.getAccountNumber());
        result.put("emailAddress", emailAddress);
        result.put("fromDate", fromDate.toString());
        result.put("toDate", toDate.toString());
        result.put("status", status);
        result.put("message", message);
        result.put("timestamp", Instant.now().toString());
        return result;
    }

    /**
     * Build an HTML email body with statement summary and transaction details.
     */
    @SuppressWarnings("unchecked")
    private String buildStatementEmailHtml(Account account, Map<String, Object> statement,
                                            LocalDate fromDate, LocalDate toDate) {
        BigDecimal openingBalance = toBigDecimal(statement.get("openingBalance"));
        BigDecimal closingBalance = toBigDecimal(statement.get("closingBalance"));
        BigDecimal totalCredits = toBigDecimal(statement.get("totalCredits"));
        BigDecimal totalDebits = toBigDecimal(statement.get("totalDebits"));
        int txnCount = statement.get("transactionCount") instanceof Number n ? n.intValue() : 0;

        StringBuilder html = new StringBuilder();
        html.append("<html><body style='font-family:Arial,sans-serif;font-size:14px;color:#333;'>");
        html.append("<h2 style='color:#1a56db;margin-bottom:4px;'>Account Statement</h2>");
        html.append("<p style='color:#6b7280;margin-top:0;'>").append(fromDate).append(" to ").append(toDate).append("</p>");

        // Summary table
        html.append("<table style='border-collapse:collapse;width:100%;max-width:600px;margin-bottom:20px;'>");
        html.append(emailRow("Account", HtmlUtils.htmlEscape(account.getAccountNumber()) + " — " + HtmlUtils.htmlEscape(account.getAccountName())));
        html.append(emailRow("Currency", account.getCurrencyCode()));
        html.append(emailRow("Opening Balance", openingBalance.toPlainString()));
        html.append(emailRow("Closing Balance", closingBalance.toPlainString()));
        html.append(emailRow("Total Credits", totalCredits.toPlainString()));
        html.append(emailRow("Total Debits", totalDebits.toPlainString()));
        html.append(emailRow("Transactions", String.valueOf(txnCount)));
        html.append("</table>");

        // Transaction detail table
        List<Map<String, Object>> txns = (List<Map<String, Object>>) statement.getOrDefault("transactions", List.of());
        if (!txns.isEmpty()) {
            html.append("<h3 style='margin-top:20px;color:#1f2937;'>Transaction Details</h3>");
            html.append("<table style='border-collapse:collapse;width:100%;font-size:12px;'>");
            html.append("<tr style='background:#f3f4f6;'>");
            html.append("<th style='padding:8px;border:1px solid #e5e7eb;text-align:left;'>Date</th>");
            html.append("<th style='padding:8px;border:1px solid #e5e7eb;text-align:left;'>Reference</th>");
            html.append("<th style='padding:8px;border:1px solid #e5e7eb;text-align:left;'>Narration</th>");
            html.append("<th style='padding:8px;border:1px solid #e5e7eb;text-align:right;'>Amount</th>");
            html.append("<th style='padding:8px;border:1px solid #e5e7eb;text-align:right;'>Balance</th>");
            html.append("</tr>");
            for (Map<String, Object> txn : txns) {
                html.append("<tr>");
                html.append(emailTd(String.valueOf(txn.getOrDefault("date", "")), false));
                html.append(emailTd(String.valueOf(txn.getOrDefault("transactionRef", "")), false));
                html.append(emailTd(HtmlUtils.htmlEscape(String.valueOf(txn.getOrDefault("narration", ""))), false));
                html.append(emailTd(String.valueOf(txn.getOrDefault("amount", "")), true));
                html.append(emailTd(String.valueOf(txn.getOrDefault("runningBalance", "")), true));
                html.append("</tr>");
            }
            html.append("</table>");
        }

        html.append("<p style='margin-top:24px;color:#6b7280;font-size:11px;'>");
        html.append("This statement was generated on ").append(LocalDate.now()).append(". ");
        html.append("If you did not request this statement, please contact your branch.</p>");
        html.append("</body></html>");
        return html.toString();
    }

    private static String emailRow(String label, String value) {
        return "<tr><td style='padding:6px 12px;font-weight:bold;border-bottom:1px solid #e5e7eb;width:40%;'>"
                + label + "</td><td style='padding:6px 12px;border-bottom:1px solid #e5e7eb;'>"
                + value + "</td></tr>";
    }

    private static String emailTd(String value, boolean alignRight) {
        return "<td style='padding:6px 8px;border:1px solid #e5e7eb;"
                + (alignRight ? "text-align:right;font-family:monospace;" : "") + "'>"
                + value + "</td>";
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val instanceof BigDecimal bd) return bd;
        if (val instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return BigDecimal.ZERO;
    }

    // ── Certificate / Confirmation ──────────────────────────────────────────────

    public Map<String, Object> getCertificateOfBalance(Long accountId) {
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

        return certificate;
    }

    public Map<String, Object> getAccountConfirmation(Long accountId) {
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

        return confirmation;
    }

    // ── Subscriptions (persisted) ───────────────────────────────────────────────

    public List<StatementSubscription> getSubscriptions(Long customerId) {
        if (customerId == null) return List.of();
        return subscriptionRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    public List<StatementSubscription> getSubscriptionsByAccount(Long accountId) {
        return subscriptionRepository.findByAccountIdOrderByCreatedAtDesc(accountId);
    }

    @Transactional
    public StatementSubscription createSubscription(Map<String, Object> data) {
        Long accountId = toLong(data.get("accountId"));

        Account account = null;
        if (accountId != null) {
            account = accountRepository.findById(accountId).orElse(null);
        }

        StatementSubscription sub = StatementSubscription.builder()
                .accountId(accountId != null ? accountId : 0L)
                .customerId(account != null && account.getCustomer() != null ? account.getCustomer().getId() : null)
                .accountNumber(account != null ? account.getAccountNumber() : null)
                .frequency(stringVal(data, "frequency", "MONTHLY"))
                .delivery(stringVal(data, "delivery", "EMAIL"))
                .format(stringVal(data, "format", "PDF"))
                .email(stringVal(data, "email", null))
                .active(true)
                .nextDelivery(calculateNextDelivery(stringVal(data, "frequency", "MONTHLY")))
                .build();

        return subscriptionRepository.save(sub);
    }

    @Transactional
    public StatementSubscription updateSubscription(Long id, Map<String, Object> data) {
        StatementSubscription sub = subscriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("StatementSubscription", "id", id));

        if (data.containsKey("frequency")) {
            sub.setFrequency(data.get("frequency").toString());
            sub.setNextDelivery(calculateNextDelivery(sub.getFrequency()));
        }
        if (data.containsKey("delivery")) sub.setDelivery(data.get("delivery").toString());
        if (data.containsKey("format")) sub.setFormat(data.get("format").toString());
        if (data.containsKey("email")) sub.setEmail(data.get("email") != null ? data.get("email").toString() : null);

        return subscriptionRepository.save(sub);
    }

    @Transactional
    public void deleteSubscription(Long id) {
        StatementSubscription sub = subscriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("StatementSubscription", "id", id));
        sub.setActive(false);
        subscriptionRepository.save(sub);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private boolean isCreditType(String type) {
        return type.contains("CREDIT") || type.contains("DEPOSIT");
    }

    private LocalDate calculateNextDelivery(String frequency) {
        LocalDate now = LocalDate.now();
        return switch (frequency) {
            case "WEEKLY" -> now.plusWeeks(1);
            case "QUARTERLY" -> now.plusMonths(3);
            default -> now.plusMonths(1); // MONTHLY
        };
    }

    private Long toLong(Object val) {
        if (val == null) return null;
        if (val instanceof Number n) return n.longValue();
        try { return Long.parseLong(val.toString()); } catch (NumberFormatException e) { return null; }
    }

    private String stringVal(Map<String, Object> map, String key, String defaultVal) {
        Object v = map.get(key);
        return v != null ? v.toString() : defaultVal;
    }
}
