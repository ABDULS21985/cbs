package com.cbs.account.service;

import com.cbs.account.dto.TransactionSearchCriteria;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.aml.entity.AmlAlert;
import com.cbs.aml.repository.AmlAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransactionComplianceReportService {

    private static final BigDecimal DEFAULT_THRESHOLD = new BigDecimal("5000000");

    private final TransactionService transactionService;
    private final AmlAlertRepository amlAlertRepository;

    public ReportFile generateCtrReport(LocalDate fromDate, LocalDate toDate, BigDecimal threshold, String channel) {
        BigDecimal effectiveThreshold = threshold != null ? threshold : DEFAULT_THRESHOLD;
        List<TransactionJournal> transactions = findTransactions(fromDate, toDate, channel).stream()
                .filter(transaction -> transaction.getAmount() != null && transaction.getAmount().compareTo(effectiveThreshold) >= 0)
                .toList();
        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] {"Report Type", "Transaction Ref", "Posting Date", "Account Number", "Customer Name", "Amount", "Currency", "Channel", "Narration", "Status"});
        transactions.forEach(transaction -> rows.add(new String[] {
                "CTR",
                transaction.getTransactionRef(),
                String.valueOf(transaction.getPostingDate()),
                transaction.getAccount().getAccountNumber(),
                transaction.getAccount().getCustomer().getDisplayName(),
                transaction.getAmount().toPlainString(),
                transaction.getCurrencyCode(),
                transaction.getChannel() != null ? transaction.getChannel().name() : "SYSTEM",
                defaultString(transaction.getNarration()),
                defaultString(transaction.getStatus())
        }));
        return csv(rows, "ctr-report-" + stamp(fromDate, toDate) + ".csv");
    }

    public ReportFile generateStrReport(LocalDate fromDate, LocalDate toDate, String channel) {
        List<TransactionJournal> transactions = findTransactions(fromDate, toDate, channel);
        Map<String, AmlAlert> alertByRef = amlAlertRepository.findAllFlaggedAlerts().stream()
                .flatMap(alert -> alert.getTriggerTransactions().stream().map(ref -> Map.entry(ref, alert)))
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (left, right) ->
                        left.getCreatedAt().isAfter(right.getCreatedAt()) ? left : right));

        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] {"Report Type", "Alert Ref", "Transaction Ref", "Posting Date", "Account Number", "Customer Name", "Amount", "Channel", "Severity", "Description"});
        transactions.stream()
                .filter(transaction -> alertByRef.containsKey(transaction.getTransactionRef()))
                .forEach(transaction -> {
                    AmlAlert alert = alertByRef.get(transaction.getTransactionRef());
                    rows.add(new String[] {
                            "STR",
                            alert.getAlertRef(),
                            transaction.getTransactionRef(),
                            String.valueOf(transaction.getPostingDate()),
                            transaction.getAccount().getAccountNumber(),
                            transaction.getAccount().getCustomer().getDisplayName(),
                            transaction.getAmount().toPlainString(),
                            transaction.getChannel() != null ? transaction.getChannel().name() : "SYSTEM",
                            defaultString(alert.getSeverity()),
                            defaultString(alert.getDescription())
                    });
                });
        return csv(rows, "str-report-" + stamp(fromDate, toDate) + ".csv");
    }

    public ReportFile generateNipReport(LocalDate fromDate, LocalDate toDate, String channel) {
        List<TransactionJournal> transactions = findTransactions(fromDate, toDate, channel);
        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] {"Network", "Transaction Ref", "Posting Date", "Account Number", "Contra Account", "Amount", "Currency", "Channel", "Status", "Narration"});
        transactions.forEach(transaction -> rows.add(new String[] {
                "NIP",
                transaction.getTransactionRef(),
                String.valueOf(transaction.getPostingDate()),
                transaction.getAccount().getAccountNumber(),
                defaultString(transaction.getContraAccountNumber()),
                transaction.getAmount().toPlainString(),
                transaction.getCurrencyCode(),
                transaction.getChannel() != null ? transaction.getChannel().name() : "SYSTEM",
                defaultString(transaction.getStatus()),
                defaultString(transaction.getNarration())
        }));
        return csv(rows, "nip-report-" + stamp(fromDate, toDate) + ".csv");
    }

    public ReportFile generateFirsExport(LocalDate month) {
        LocalDate effectiveMonth = month != null ? month.withDayOfMonth(1) : LocalDate.now().withDayOfMonth(1);
        LocalDate fromDate = effectiveMonth;
        LocalDate toDate = effectiveMonth.withDayOfMonth(effectiveMonth.lengthOfMonth());
        List<TransactionJournal> taxTransactions = findTransactions(fromDate, toDate, null).stream()
                .filter(this::isTaxTransaction)
                .toList();

        List<String[]> rows = new ArrayList<>();
        rows.add(new String[] {"Month", "TIN", "Customer Name", "Account Number", "Transaction Ref", "Transaction Amount", "Tax Amount", "Narration"});
        taxTransactions.forEach(transaction -> rows.add(new String[] {
                effectiveMonth.format(DateTimeFormatter.ofPattern("MMM yyyy")),
                defaultString(transaction.getAccount().getCustomer().getTaxId()),
                transaction.getAccount().getCustomer().getDisplayName(),
                transaction.getAccount().getAccountNumber(),
                transaction.getTransactionRef(),
                transaction.getAmount().toPlainString(),
                transaction.getAmount().toPlainString(),
                defaultString(transaction.getNarration())
        }));
        return csv(rows, "firs-export-" + effectiveMonth.format(DateTimeFormatter.ofPattern("yyyy-MM")) + ".csv");
    }

    public ReportFile generateLargeValueReport(LocalDate fromDate, LocalDate toDate, BigDecimal threshold) {
        BigDecimal effectiveThreshold = threshold != null ? threshold : DEFAULT_THRESHOLD;
        List<TransactionJournal> transactions = findTransactions(fromDate, toDate, null).stream()
                .filter(transaction -> transaction.getAmount() != null && transaction.getAmount().compareTo(effectiveThreshold) >= 0)
                .sorted(Comparator.comparing(TransactionJournal::getPostingDate).thenComparing(TransactionJournal::getCreatedAt))
                .toList();

        StringBuilder builder = new StringBuilder();
        builder.append("Large Value Transaction Report\tGenerated\t").append(LocalDate.now()).append('\n');
        builder.append("Threshold\t").append(effectiveThreshold.toPlainString()).append('\n');
        builder.append("Posting Date\tTransaction Ref\tAccount Number\tCustomer Name\tAmount\tCurrency\tChannel\tStatus\tNarration\n");
        transactions.forEach(transaction -> builder.append(String.join("\t",
                String.valueOf(transaction.getPostingDate()),
                transaction.getTransactionRef(),
                transaction.getAccount().getAccountNumber(),
                transaction.getAccount().getCustomer().getDisplayName(),
                transaction.getAmount().toPlainString(),
                transaction.getCurrencyCode(),
                transaction.getChannel() != null ? transaction.getChannel().name() : "SYSTEM",
                defaultString(transaction.getStatus()),
                sanitizeCell(defaultString(transaction.getNarration()))
        )).append('\n'));
        return new ReportFile(builder.toString().getBytes(StandardCharsets.UTF_8),
                "large-value-report-" + stamp(fromDate, toDate) + ".xls",
                "application/vnd.ms-excel");
    }

    private List<TransactionJournal> findTransactions(LocalDate fromDate, LocalDate toDate, String channel) {
        TransactionSearchCriteria criteria = TransactionSearchCriteria.builder()
                .dateFrom(fromDate != null ? fromDate : LocalDate.now().minusDays(30))
                .dateTo(toDate != null ? toDate : LocalDate.now())
                .channel(channel)
                .build();
        return transactionService.findTransactions(criteria);
    }

    private boolean isTaxTransaction(TransactionJournal transaction) {
        String narration = defaultString(transaction.getNarration()).toLowerCase(Locale.ROOT);
        return narration.contains("withholding tax")
                || narration.contains("wht")
                || narration.contains("tax");
    }

    private ReportFile csv(List<String[]> rows, String filename) {
        String body = rows.stream()
                .map(row -> java.util.Arrays.stream(row)
                        .map(this::quote)
                        .collect(Collectors.joining(",")))
                .collect(Collectors.joining("\n"));
        return new ReportFile(body.getBytes(StandardCharsets.UTF_8), filename, "text/csv");
    }

    private String quote(String value) {
        return "\"" + sanitizeCell(value).replace("\"", "\"\"") + "\"";
    }

    private String sanitizeCell(String value) {
        return value == null ? "" : value.replace('\n', ' ').replace('\r', ' ');
    }

    private String defaultString(String value) {
        return value == null ? "" : value;
    }

    private String stamp(LocalDate fromDate, LocalDate toDate) {
        return String.valueOf(fromDate != null ? fromDate : LocalDate.now().minusDays(30))
                + "_to_" + String.valueOf(toDate != null ? toDate : LocalDate.now());
    }

    public record ReportFile(byte[] content, String filename, String contentType) {
    }
}
