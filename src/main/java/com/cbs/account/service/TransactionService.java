package com.cbs.account.service;

import com.cbs.account.dto.GlEntryDto;
import com.cbs.account.dto.TransactionAnalyticsDto;
import com.cbs.account.dto.TransactionResponse;
import com.cbs.account.dto.TransactionSearchCriteria;
import com.cbs.account.dto.TransactionSummary;
import com.cbs.account.dto.TransactionWorkflowDto;
import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.TransactionDisputeRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.common.audit.CurrentCustomerProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.aml.entity.AmlAlert;
import com.cbs.aml.repository.AmlAlertRepository;
import com.cbs.customer.entity.Customer;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.entity.JournalLine;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.time.temporal.TemporalAdjusters;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransactionService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final DateTimeFormatter RECEIPT_DATE_TIME_FORMAT =
            DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm:ss 'UTC'");

    private final TransactionJournalRepository transactionJournalRepository;
    private final AccountRepository accountRepository;
    private final AmlAlertRepository amlAlertRepository;
    private final TransactionDisputeRepository transactionDisputeRepository;
    private final TransactionAuditService transactionAuditService;
    private final CurrentCustomerProvider currentCustomerProvider;

    public Page<TransactionResponse> search(TransactionSearchCriteria criteria, Pageable pageable) {
        return transactionJournalRepository.findAll(buildSpecification(criteria), pageable)
                .map(this::toResponse);
    }

    public TransactionSummary calculateSummary(TransactionSearchCriteria criteria) {
        List<TransactionJournal> transactions = transactionJournalRepository.findAll(buildSpecification(criteria));
        BigDecimal totalDebit = transactions.stream()
                .filter(this::isDebitLike)
                .map(TransactionJournal::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCredit = transactions.stream()
                .filter(this::isCreditLike)
                .map(TransactionJournal::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return TransactionSummary.builder()
                .totalResults(transactions.size())
                .totalDebit(totalDebit)
                .totalCredit(totalCredit)
                .netAmount(totalCredit.subtract(totalDebit))
                .build();
    }

    public TransactionResponse getTransaction(Long id) {
        TransactionJournal transaction = getTransactionEntity(id);
        transactionAuditService.recordEvent(
                transaction,
                "VIEWED",
                "Transaction viewed",
                transaction.getChannel() != null ? transaction.getChannel().name() : null,
                Map.of("transactionRef", transaction.getTransactionRef())
        );
        return toDetailedResponse(transaction);
    }

    public TransactionJournal getTransactionEntity(Long id) {
        return transactionJournalRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Transaction not found: " + id));
    }

    public TransactionJournal getReceiptTransaction(Long id) {
        TransactionJournal transaction = getTransactionEntity(id);
        enforcePortalOwnership(transaction);
        return transaction;
    }

    public List<TransactionJournal> findTransactions(TransactionSearchCriteria criteria) {
        return transactionJournalRepository.findAll(
                buildSpecification(criteria),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
    }

    public TransactionAnalyticsDto.Summary getAnalyticsSummary(LocalDate fromDate, LocalDate toDate) {
        AnalyticsWindow window = resolveAnalyticsWindow(fromDate, toDate);
        Object[] aggregates = transactionJournalRepository.aggregateAnalyticsSummary(window.from(), window.to());

        long totalTransactions = toLong(aggregates, 0);
        BigDecimal totalValue = toBigDecimal(aggregates, 1);
        BigDecimal averageValue = toBigDecimal(aggregates, 2);
        long failedCount = toLong(aggregates, 3);
        long reversedCount = toLong(aggregates, 4);

        TransactionAnalyticsDto.LargestTransaction largestTransaction = transactionJournalRepository
                .findTopByPostingDateBetweenAndTransactionTypeNotOrderByAmountDescCreatedAtDesc(
                        window.from(),
                        window.to(),
                        TransactionType.REVERSAL
                )
                .map(transaction -> new TransactionAnalyticsDto.LargestTransaction(
                        transaction.getId(),
                        transaction.getTransactionRef(),
                        transaction.getAmount()
                ))
                .orElse(null);

        List<TransactionAnalyticsDto.ChannelMetric> channelMetrics = loadChannelMetrics(window.from(), window.to());
        TransactionAnalyticsDto.ChannelShare mostUsedChannel = channelMetrics.isEmpty()
                ? null
                : buildChannelShare(channelMetrics.get(0), totalTransactions);

        return new TransactionAnalyticsDto.Summary(
                totalTransactions,
                totalValue,
                averageValue,
                largestTransaction,
                mostUsedChannel,
                percentage(failedCount, totalTransactions),
                percentage(reversedCount, totalTransactions)
        );
    }

    public List<TransactionAnalyticsDto.VolumeTrendPoint> getVolumeTrend(LocalDate fromDate, LocalDate toDate, String granularity) {
        AnalyticsWindow window = resolveAnalyticsWindow(fromDate, toDate);
        List<DailyVolumeAggregate> dailyPoints = transactionJournalRepository.aggregateVolumeTrend(window.from(), window.to())
                .stream()
                .map(this::toDailyVolumeAggregate)
                .toList();

        return switch (normalizeGranularity(granularity)) {
            case "week" -> groupVolumeTrendByWeek(dailyPoints, window.to());
            case "month" -> groupVolumeTrendByMonth(dailyPoints, window.to());
            default -> dailyPoints.stream()
                    .map(point -> new TransactionAnalyticsDto.VolumeTrendPoint(
                            point.date(),
                            point.date(),
                            point.date().format(DateTimeFormatter.ofPattern("dd MMM")),
                            point.creditCount(),
                            point.debitCount(),
                            point.creditValue(),
                            point.debitValue(),
                            point.creditValue().add(point.debitValue())
                    ))
                    .toList();
        };
    }

    public TransactionAnalyticsDto.CategoryAnalytics getCategoryAnalytics(LocalDate fromDate, LocalDate toDate) {
        AnalyticsWindow window = resolveAnalyticsWindow(fromDate, toDate);
        List<Object[]> rows = transactionJournalRepository.aggregateSpendCategories(window.from(), window.to());
        BigDecimal totalSpend = rows.stream()
                .map(row -> toBigDecimal(row, 1))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<TransactionAnalyticsDto.CategoryBreakdown> categories = rows.stream()
                .map(row -> new TransactionAnalyticsDto.CategoryBreakdown(
                        String.valueOf(row[0]),
                        toBigDecimal(row, 1),
                        toLong(row, 2),
                        toBigDecimal(row, 3),
                        percentage(toBigDecimal(row, 1), totalSpend)
                ))
                .toList();

        LocalDate trendFrom = window.to().minusMonths(5).withDayOfMonth(1);
        List<TransactionAnalyticsDto.CategoryTrendPoint> trend = transactionJournalRepository
                .aggregateSpendCategoryTrend(trendFrom, window.to())
                .stream()
                .map(row -> {
                    LocalDate periodStart = toLocalDate(row, 0);
                    return new TransactionAnalyticsDto.CategoryTrendPoint(
                            periodStart.format(DateTimeFormatter.ofPattern("MMM yyyy")),
                            periodStart,
                            String.valueOf(row[1]),
                            toBigDecimal(row, 2)
                    );
                })
                .toList();

        return new TransactionAnalyticsDto.CategoryAnalytics(totalSpend, categories, trend);
    }

    public TransactionAnalyticsDto.ChannelAnalytics getChannelAnalytics(LocalDate fromDate, LocalDate toDate) {
        AnalyticsWindow window = resolveAnalyticsWindow(fromDate, toDate);
        List<TransactionAnalyticsDto.ChannelMetric> channels = loadChannelMetrics(window.from(), window.to());
        LocalDate trendFrom = window.to().minusMonths(11).withDayOfMonth(1);
        List<TransactionAnalyticsDto.ChannelTrendPoint> successRateTrend = transactionJournalRepository
                .aggregateChannelSuccessTrend(trendFrom, window.to())
                .stream()
                .map(row -> {
                    LocalDate periodStart = toLocalDate(row, 0);
                    String channel = normalizeChannelLabel((String) row[1]);
                    long count = toLong(row, 2);
                    long successCount = toLong(row, 3);
                    return new TransactionAnalyticsDto.ChannelTrendPoint(
                            periodStart.format(DateTimeFormatter.ofPattern("MMM yy")),
                            periodStart,
                            channel,
                            percentage(successCount, count)
                    );
                })
                .toList();

        return new TransactionAnalyticsDto.ChannelAnalytics(channels, successRateTrend);
    }

    public List<TransactionAnalyticsDto.TopAccount> getTopAccounts(LocalDate fromDate, LocalDate toDate, Integer requestedLimit) {
        AnalyticsWindow window = resolveAnalyticsWindow(fromDate, toDate);
        int limit = Math.max(10, Math.min(requestedLimit == null ? 50 : requestedLimit, 200));
        return transactionJournalRepository.aggregateTopAccounts(window.from(), window.to(), limit)
                .stream()
                .map(row -> {
                    BigDecimal totalDebit = toBigDecimal(row, 4);
                    BigDecimal totalCredit = toBigDecimal(row, 5);
                    return new TransactionAnalyticsDto.TopAccount(
                            String.valueOf(row[1]),
                            String.valueOf(row[2]),
                            toLong(row, 3),
                            totalDebit,
                            totalCredit,
                            totalCredit.subtract(totalDebit),
                            toLocalDate(row, 6)
                    );
                })
                .toList();
    }

    public TransactionAnalyticsDto.FailureAnalysis getFailureAnalysis(LocalDate fromDate, LocalDate toDate) {
        AnalyticsWindow window = resolveAnalyticsWindow(fromDate, toDate);

        List<TransactionAnalyticsDto.FailureTrendPoint> trend = transactionJournalRepository.aggregateFailureTrend(window.from(), window.to())
                .stream()
                .map(row -> {
                    long failureCount = toLong(row, 1);
                    long totalCount = toLong(row, 2);
                    return new TransactionAnalyticsDto.FailureTrendPoint(
                            toLocalDate(row, 0),
                            failureCount,
                            totalCount,
                            percentage(failureCount, totalCount)
                    );
                })
                .toList();

        long totalFailures = trend.stream().mapToLong(TransactionAnalyticsDto.FailureTrendPoint::failureCount).sum();
        long totalTransactions = trend.stream().mapToLong(TransactionAnalyticsDto.FailureTrendPoint::totalCount).sum();

        List<TransactionAnalyticsDto.FailureReason> reasons = transactionJournalRepository.aggregateFailureReasons(window.from(), window.to())
                .stream()
                .map(row -> new TransactionAnalyticsDto.FailureReason(
                        String.valueOf(row[0]),
                        toLong(row, 1),
                        percentage(toLong(row, 1), totalFailures)
                ))
                .toList();

        List<TransactionAnalyticsDto.FailureHotspot> hotspots = transactionJournalRepository.aggregateFailureHotspots(window.from(), window.to())
                .stream()
                .map(row -> new TransactionAnalyticsDto.FailureHotspot(
                        toInt(row, 0),
                        toLong(row, 1)
                ))
                .toList();

        List<TransactionAnalyticsDto.FailingAccount> topFailingAccounts = transactionJournalRepository
                .aggregateTopFailingAccounts(window.from(), window.to(), 10)
                .stream()
                .map(row -> {
                    Long accountId = toLongObject(row, 0);
                    TransactionJournal latestFailure = accountId == null
                            ? null
                            : transactionJournalRepository.findTopByAccountIdAndStatusAndPostingDateBetweenOrderByCreatedAtDesc(
                                    accountId,
                                    "FAILED",
                                    window.from(),
                                    window.to()
                            ).orElse(null);
                    return new TransactionAnalyticsDto.FailingAccount(
                            String.valueOf(row[1]),
                            String.valueOf(row[2]),
                            toLong(row, 3),
                            latestFailure != null ? classifyFailureReason(latestFailure) : "Other",
                            toLocalDate(row, 4)
                    );
                })
                .toList();

        BigDecimal failureRate = percentage(totalFailures, totalTransactions);
        return new TransactionAnalyticsDto.FailureAnalysis(
                failureRate,
                failureRate.compareTo(new BigDecimal("5")) > 0,
                trend,
                reasons,
                hotspots,
                topFailingAccounts
        );
    }

    public TransactionAnalyticsDto.Heatmap getHourlyHeatmap(LocalDate fromDate, LocalDate toDate) {
        AnalyticsWindow window = resolveAnalyticsWindow(fromDate, toDate);
        Map<String, Long> counts = new HashMap<>();
        List<Long> populatedCounts = new ArrayList<>();

        transactionJournalRepository.aggregateHourlyHeatmap(window.from(), window.to())
                .forEach(row -> {
                    int dayOfWeek = toInt(row, 0);
                    int hour = toInt(row, 1);
                    long count = toLong(row, 2);
                    counts.put(dayOfWeek + ":" + hour, count);
                    populatedCounts.add(count);
                });

        BigDecimal average = populatedCounts.isEmpty()
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(populatedCounts.stream().mapToLong(Long::longValue).average().orElse(0));
        BigDecimal standardDeviation = calculateStandardDeviation(populatedCounts, average);
        BigDecimal anomalyThreshold = average.add(standardDeviation.multiply(BigDecimal.valueOf(2)));

        List<TransactionAnalyticsDto.HeatmapCell> cells = IntStream.rangeClosed(1, 7)
                .boxed()
                .flatMap(dayOfWeek -> IntStream.range(0, 24).mapToObj(hour -> {
                    long count = counts.getOrDefault(dayOfWeek + ":" + hour, 0L);
                    boolean anomaly = BigDecimal.valueOf(count).compareTo(anomalyThreshold) > 0 && count > 0;
                    return new TransactionAnalyticsDto.HeatmapCell(
                            dayOfWeek,
                            dayLabel(dayOfWeek),
                            hour,
                            count,
                            anomaly
                    );
                }))
                .toList();

        List<TransactionAnalyticsDto.Anomaly> anomalies = cells.stream()
                .filter(TransactionAnalyticsDto.HeatmapCell::anomaly)
                .map(cell -> new TransactionAnalyticsDto.Anomaly(
                        cell.dayLabel(),
                        cell.hour(),
                        cell.count(),
                        average.setScale(2, RoundingMode.HALF_UP),
                        standardDeviation.setScale(2, RoundingMode.HALF_UP)
                ))
                .toList();

        return new TransactionAnalyticsDto.Heatmap(cells, anomalies, anomalies.size());
    }

    public byte[] renderReceiptHtml(TransactionJournal transaction) {
        TransactionResponse response = toResponse(transaction);
        String html = """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8" />
                  <title>Receipt %s</title>
                  <style>
                    body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
                    .card { max-width: 720px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; }
                    .header { display: flex; justify-content: space-between; align-items: start; gap: 16px; }
                    .brand { font-size: 24px; font-weight: 700; color: #1d4ed8; }
                    .muted { color: #6b7280; font-size: 12px; }
                    .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; background: #eff6ff; color: #1d4ed8; }
                    table { width: 100%%; border-collapse: collapse; margin-top: 20px; }
                    td { padding: 8px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
                    td:first-child { color: #6b7280; width: 32%%; }
                    .amount { font-size: 28px; font-weight: 700; margin-top: 20px; }
                    .section-title { margin-top: 24px; margin-bottom: 8px; font-size: 14px; font-weight: 700; }
                    .gl-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f3f4f6; padding: 8px 0; font-size: 13px; }
                    .footer { margin-top: 24px; font-size: 12px; color: #6b7280; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <div class="header">
                      <div>
                        <div class="brand">CBS Bank</div>
                        <div class="muted">Transaction receipt</div>
                      </div>
                      <div style="text-align:right;">
                        <div class="pill">%s</div>
                        <div class="muted" style="margin-top:8px;">Receipt Ref: RCT-%s</div>
                      </div>
                    </div>

                    <div class="amount">%s</div>

                    <table>
                      <tr><td>Reference</td><td>%s</td></tr>
                      <tr><td>Type</td><td>%s</td></tr>
                      <tr><td>Channel</td><td>%s</td></tr>
                      <tr><td>Date &amp; Time</td><td>%s</td></tr>
                      <tr><td>Value Date</td><td>%s</td></tr>
                      <tr><td>Posting Date</td><td>%s</td></tr>
                      <tr><td>From</td><td>%s</td></tr>
                      <tr><td>To</td><td>%s</td></tr>
                      <tr><td>Narration</td><td>%s</td></tr>
                    </table>

                    %s

                    <div class="footer">
                      Generated by CBS core banking on %s. This receipt is computer generated.
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(
                escape(transaction.getTransactionRef()),
                escape(response.getStatus()),
                escape(transaction.getTransactionRef()),
                escape(formatReceiptAmount(response)),
                escape(response.getReference()),
                escape(response.getType()),
                escape(response.getChannel()),
                escape(response.getDateTime()),
                escape(String.valueOf(response.getValueDate())),
                escape(String.valueOf(response.getPostingDate())),
                escape(formatAccountLine(response.getFromAccount(), response.getFromAccountName())),
                escape(formatAccountLine(response.getToAccount(), response.getToAccountName())),
                escape(response.getNarration()),
                renderGlEntries(response.getGlEntries()),
                escape(RECEIPT_DATE_TIME_FORMAT.format(java.time.Instant.now().atOffset(ZoneOffset.UTC)))
        );
        return html.getBytes(StandardCharsets.UTF_8);
    }

    public TransactionResponse toResponse(TransactionJournal transaction) {
        Account primaryAccount = transaction.getAccount();
        Account contraAccount = resolveContraAccount(transaction);
        boolean outgoing = isOutgoing(transaction);
        TransactionWorkflowDto.AmlFlag amlFlag = resolveAmlFlag(transaction);

        String fromAccount = outgoing
                ? primaryAccount.getAccountNumber()
                : contraAccount != null ? contraAccount.getAccountNumber() : transaction.getContraAccountNumber();
        String fromAccountName = outgoing
                ? primaryAccount.getAccountName()
                : contraAccount != null ? contraAccount.getAccountName() : null;
        String toAccount = outgoing
                ? contraAccount != null ? contraAccount.getAccountNumber() : transaction.getContraAccountNumber()
                : primaryAccount.getAccountNumber();
        String toAccountName = outgoing
                ? contraAccount != null ? contraAccount.getAccountName() : null
                : primaryAccount.getAccountName();

        return TransactionResponse.builder()
                .id(transaction.getId())
                .transactionRef(transaction.getTransactionRef())
                .reference(transaction.getTransactionRef())
                .accountNumber(primaryAccount.getAccountNumber())
                .transactionType(transaction.getTransactionType())
                .type(mapTransactionType(transaction.getTransactionType()))
                .amount(transaction.getAmount())
                .currencyCode(transaction.getCurrencyCode())
                .runningBalance(transaction.getRunningBalance())
                .narration(transaction.getNarration())
                .description(transaction.getNarration())
                .valueDate(transaction.getValueDate())
                .postingDate(transaction.getPostingDate())
                .dateTime(transaction.getCreatedAt() != null ? transaction.getCreatedAt().toString() : null)
                .contraAccountNumber(transaction.getContraAccountNumber())
                .channel(mapChannel(transaction.getChannel()))
                .externalRef(transaction.getExternalRef())
                .status(mapStatus(transaction))
                .isReversed(transaction.getIsReversed())
                .createdAt(transaction.getCreatedAt())
                .createdBy(transaction.getCreatedBy())
                .fromAccount(fromAccount)
                .fromAccountName(fromAccountName)
                .toAccount(toAccount)
                .toAccountName(toAccountName)
                .debitAmount(isDebitLike(transaction) ? transaction.getAmount() : null)
                .creditAmount(isCreditLike(transaction) ? transaction.getAmount() : null)
                .fee(BigDecimal.ZERO)
                .glEntries(mapGlEntries(transaction.getJournal()))
                .amlFlagged(amlFlag != null)
                .amlFlag(amlFlag)
                .latestDispute(resolveLatestDispute(transaction.getId()))
                .customerEmail(primaryAccount.getCustomer() != null ? primaryAccount.getCustomer().getEmail() : null)
                .customerPhone(primaryAccount.getCustomer() != null ? primaryAccount.getCustomer().getPhonePrimary() : null)
                .build();
    }

    private TransactionResponse toDetailedResponse(TransactionJournal transaction) {
        TransactionResponse response = toResponse(transaction);
        response.setAuditTrail(transactionAuditService.getAuditTrail(transaction));
        return response;
    }

    private Specification<TransactionJournal> buildSpecification(TransactionSearchCriteria criteria) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            Join<TransactionJournal, Account> accountJoin = root.join("account", JoinType.INNER);
            Join<Account, Customer> customerJoin = accountJoin.join("customer", JoinType.LEFT);
            Join<TransactionJournal, Account> contraAccountJoin = root.join("contraAccount", JoinType.LEFT);
            query.distinct(true);

            if (StringUtils.hasText(criteria.getSearch())) {
                String term = "%" + criteria.getSearch().trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(builder.or(
                        builder.like(builder.lower(root.get("narration")), term),
                        builder.like(builder.lower(root.get("transactionRef")), term),
                        builder.like(builder.lower(builder.coalesce(root.get("externalRef"), "")), term),
                        builder.like(builder.lower(accountJoin.get("accountNumber")), term),
                        builder.like(builder.lower(builder.coalesce(accountJoin.get("accountName"), "")), term),
                        builder.like(builder.lower(builder.coalesce(root.get("contraAccountNumber"), "")), term),
                        builder.like(builder.lower(builder.coalesce(contraAccountJoin.get("accountName"), "")), term),
                        builder.like(builder.lower(builder.coalesce(customerJoin.get("cifNumber"), "")), term),
                        builder.like(builder.lower(builder.coalesce(customerJoin.get("firstName"), "")), term),
                        builder.like(builder.lower(builder.coalesce(customerJoin.get("lastName"), "")), term),
                        builder.like(builder.lower(builder.coalesce(customerJoin.get("registeredName"), "")), term),
                        builder.like(builder.lower(builder.coalesce(customerJoin.get("tradingName"), "")), term)
                ));
            }

            if (StringUtils.hasText(criteria.getAccountNumber())) {
                predicates.add(builder.equal(accountJoin.get("accountNumber"), criteria.getAccountNumber().trim()));
            }

            if (StringUtils.hasText(criteria.getCustomerId())) {
                String customerTerm = criteria.getCustomerId().trim();
                String loweredCustomerTerm = "%" + customerTerm.toLowerCase(Locale.ROOT) + "%";
                List<Predicate> customerPredicates = new ArrayList<>();
                parseLong(customerTerm)
                        .ifPresent(customerId -> customerPredicates.add(builder.equal(customerJoin.get("id"), customerId)));
                customerPredicates.add(builder.equal(builder.upper(customerJoin.get("cifNumber")), customerTerm.toUpperCase(Locale.ROOT)));
                customerPredicates.add(builder.like(builder.lower(builder.coalesce(customerJoin.get("firstName"), "")), loweredCustomerTerm));
                customerPredicates.add(builder.like(builder.lower(builder.coalesce(customerJoin.get("lastName"), "")), loweredCustomerTerm));
                customerPredicates.add(builder.like(builder.lower(builder.coalesce(customerJoin.get("registeredName"), "")), loweredCustomerTerm));
                customerPredicates.add(builder.like(builder.lower(builder.coalesce(customerJoin.get("tradingName"), "")), loweredCustomerTerm));
                predicates.add(builder.or(customerPredicates.toArray(Predicate[]::new)));
            }

            if (criteria.getDateFrom() != null) {
                predicates.add(builder.greaterThanOrEqualTo(root.get("postingDate"), criteria.getDateFrom()));
            }
            if (criteria.getDateTo() != null) {
                predicates.add(builder.lessThanOrEqualTo(root.get("postingDate"), criteria.getDateTo()));
            }
            if (criteria.getAmountFrom() != null) {
                predicates.add(builder.greaterThanOrEqualTo(root.get("amount"), criteria.getAmountFrom()));
            }
            if (criteria.getAmountTo() != null) {
                predicates.add(builder.lessThanOrEqualTo(root.get("amount"), criteria.getAmountTo()));
            }

            Set<TransactionType> transactionTypes = resolveTransactionTypes(criteria.getType());
            if (!transactionTypes.isEmpty()) {
                predicates.add(root.get("transactionType").in(transactionTypes));
            }

            TransactionChannel channel = resolveChannel(criteria.getChannel());
            if (channel != null) {
                predicates.add(builder.equal(root.get("channel"), channel));
            }

            Predicate statusPredicate = buildStatusPredicate(criteria.getStatus(), root, builder);
            if (statusPredicate != null) {
                predicates.add(statusPredicate);
            }

            if (Boolean.TRUE.equals(criteria.getFlaggedOnly())) {
                List<String> flaggedRefs = amlAlertRepository.findAllFlaggedAlerts().stream()
                        .flatMap(alert -> alert.getTriggerTransactions().stream())
                        .distinct()
                        .toList();
                if (flaggedRefs.isEmpty()) {
                    return builder.disjunction();
                }
                predicates.add(root.get("transactionRef").in(flaggedRefs));
            }

            return builder.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Predicate buildStatusPredicate(String status, jakarta.persistence.criteria.Root<TransactionJournal> root,
                                           jakarta.persistence.criteria.CriteriaBuilder builder) {
        if (!StringUtils.hasText(status) || "ALL".equalsIgnoreCase(status)) {
            return null;
        }
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "COMPLETED" -> builder.and(
                    builder.equal(root.get("status"), "POSTED"),
                    builder.isFalse(root.get("isReversed")),
                    builder.notEqual(root.get("transactionType"), TransactionType.REVERSAL)
            );
            case "PENDING" -> builder.equal(root.get("status"), "PENDING");
            case "FAILED" -> builder.equal(root.get("status"), "FAILED");
            case "REVERSED" -> builder.or(
                    builder.isTrue(root.get("isReversed")),
                    builder.equal(root.get("transactionType"), TransactionType.REVERSAL),
                    builder.equal(root.get("status"), "REVERSED")
            );
            default -> builder.equal(builder.upper(root.get("status")), normalized);
        };
    }

    private Set<TransactionType> resolveTransactionTypes(String rawType) {
        if (!StringUtils.hasText(rawType) || "ALL".equalsIgnoreCase(rawType)) {
            return java.util.Collections.emptySet();
        }
        return switch (rawType.trim().toUpperCase(Locale.ROOT)) {
            case "CREDIT" -> EnumSet.of(TransactionType.CREDIT);
            case "DEBIT", "PAYMENT" -> EnumSet.of(TransactionType.DEBIT);
            case "TRANSFER" -> EnumSet.of(TransactionType.TRANSFER_IN, TransactionType.TRANSFER_OUT);
            case "FEE" -> EnumSet.of(TransactionType.FEE_DEBIT);
            case "INTEREST" -> EnumSet.of(TransactionType.INTEREST_POSTING);
            case "REVERSAL" -> EnumSet.of(TransactionType.REVERSAL);
            default -> {
                try {
                    yield EnumSet.of(TransactionType.valueOf(rawType.trim().toUpperCase(Locale.ROOT)));
                } catch (IllegalArgumentException ex) {
                    yield java.util.Collections.emptySet();
                }
            }
        };
    }

    private TransactionChannel resolveChannel(String rawChannel) {
        if (!StringUtils.hasText(rawChannel) || "ALL".equalsIgnoreCase(rawChannel)) {
            return null;
        }
        String normalized = rawChannel.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "WEB" -> TransactionChannel.INTERNET;
            default -> {
                try {
                    yield TransactionChannel.valueOf(normalized);
                } catch (IllegalArgumentException ex) {
                    yield null;
                }
            }
        };
    }

    private String mapTransactionType(TransactionType type) {
        return switch (type) {
            case TRANSFER_IN, TRANSFER_OUT -> "TRANSFER";
            case FEE_DEBIT -> "FEE";
            case INTEREST_POSTING -> "INTEREST";
            default -> type.name();
        };
    }

    private String mapChannel(TransactionChannel channel) {
        if (channel == null) {
            return null;
        }
        return channel == TransactionChannel.INTERNET ? "WEB" : channel.name();
    }

    private String mapStatus(TransactionJournal transaction) {
        if (transaction.getTransactionType() == TransactionType.REVERSAL || Boolean.TRUE.equals(transaction.getIsReversed())) {
            return "REVERSED";
        }
        return switch (transaction.getStatus() == null ? "" : transaction.getStatus().toUpperCase(Locale.ROOT)) {
            case "POSTED" -> "COMPLETED";
            case "PENDING" -> "PENDING";
            case "FAILED" -> "FAILED";
            case "REVERSED" -> "REVERSED";
            default -> transaction.getStatus();
        };
    }

    private boolean isOutgoing(TransactionJournal transaction) {
        TransactionType effectiveType = effectiveTransactionType(transaction);
        return switch (effectiveType) {
            case DEBIT, FEE_DEBIT, TRANSFER_OUT, LIEN_PLACEMENT -> true;
            default -> false;
        };
    }

    private boolean isDebitLike(TransactionJournal transaction) {
        TransactionType effectiveType = effectiveTransactionType(transaction);
        return switch (effectiveType) {
            case DEBIT, FEE_DEBIT, TRANSFER_OUT, LIEN_PLACEMENT -> true;
            default -> false;
        };
    }

    private boolean isCreditLike(TransactionJournal transaction) {
        TransactionType effectiveType = effectiveTransactionType(transaction);
        return switch (effectiveType) {
            case CREDIT, TRANSFER_IN, INTEREST_POSTING, OPENING_BALANCE, LIEN_RELEASE -> true;
            default -> false;
        };
    }

    private TransactionType effectiveTransactionType(TransactionJournal transaction) {
        if (transaction.getTransactionType() == TransactionType.REVERSAL && transaction.getReversedTransaction() != null) {
            return transaction.getReversedTransaction().getTransactionType();
        }
        return transaction.getTransactionType();
    }

    private Account resolveContraAccount(TransactionJournal transaction) {
        if (transaction.getContraAccount() != null) {
            return transaction.getContraAccount();
        }
        if (!StringUtils.hasText(transaction.getContraAccountNumber())) {
            return null;
        }
        return accountRepository.findByAccountNumber(transaction.getContraAccountNumber()).orElse(null);
    }

    private List<GlEntryDto> mapGlEntries(JournalEntry journal) {
        if (journal == null || journal.getLines() == null || journal.getLines().isEmpty()) {
            return List.of();
        }
        return journal.getLines().stream()
                .map(this::toGlEntry)
                .toList();
    }

    private GlEntryDto toGlEntry(JournalLine line) {
        boolean debit = line.getLocalDebit() != null && line.getLocalDebit().compareTo(BigDecimal.ZERO) > 0;
        BigDecimal amount = debit ? line.getLocalDebit() : line.getLocalCredit();
        return GlEntryDto.builder()
                .type(debit ? "DR" : "CR")
                .account(line.getGlCode())
                .amount(amount != null ? amount : BigDecimal.ZERO)
                .description(line.getNarration())
                .build();
    }

    private Optional<Long> parseLong(String value) {
        try {
            return Optional.of(Long.parseLong(value.trim()));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    private String formatReceiptAmount(TransactionResponse response) {
        BigDecimal amount = response.getDebitAmount() != null
                ? response.getDebitAmount()
                : response.getCreditAmount() != null ? response.getCreditAmount() : response.getAmount();
        return amount == null ? "0.00" : amount.toPlainString() + " " + response.getCurrencyCode();
    }

    private String formatAccountLine(String accountNumber, String accountName) {
        if (!StringUtils.hasText(accountNumber)) {
            return "N/A";
        }
        return StringUtils.hasText(accountName) ? accountNumber + " - " + accountName : accountNumber;
    }

    private String renderGlEntries(List<GlEntryDto> glEntries) {
        if (glEntries == null || glEntries.isEmpty()) {
            return "";
        }
        StringBuilder builder = new StringBuilder("<div class=\"section-title\">GL Entries</div>");
        for (GlEntryDto entry : glEntries) {
            builder.append("<div class=\"gl-row\"><span>")
                    .append(escape(entry.getType()))
                    .append(" · ")
                    .append(escape(entry.getAccount()))
                    .append("</span><span>")
                    .append(escape(entry.getAmount() != null ? entry.getAmount().toPlainString() : "0.00"))
                    .append("</span></div>");
        }
        return builder.toString();
    }

    private String escape(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value);
    }

    private TransactionWorkflowDto.AmlFlag resolveAmlFlag(TransactionJournal transaction) {
        if (!StringUtils.hasText(transaction.getTransactionRef())) {
            return null;
        }
        return amlAlertRepository.findLatestByTransactionRef(transaction.getTransactionRef())
                .map(this::toAmlFlag)
                .orElse(null);
    }

    private TransactionWorkflowDto.AmlFlag toAmlFlag(AmlAlert alert) {
        return TransactionWorkflowDto.AmlFlag.builder()
                .alertRef(alert.getAlertRef())
                .caseRef(alert.getSarReference() != null ? alert.getSarReference() : alert.getAlertRef())
                .description(alert.getDescription())
                .score(deriveAmlScore(alert))
                .flaggedAt(alert.getCreatedAt())
                .build();
    }

    private Integer deriveAmlScore(AmlAlert alert) {
        int base = switch ((alert.getSeverity() == null ? "" : alert.getSeverity().toUpperCase(Locale.ROOT))) {
            case "HIGH" -> 82;
            case "MEDIUM" -> 71;
            default -> 58;
        };
        if ("HIGH".equalsIgnoreCase(alert.getPriority())) {
            base += 8;
        } else if ("LOW".equalsIgnoreCase(alert.getPriority())) {
            base -= 6;
        }
        return Math.max(0, Math.min(base, 100));
    }

    private TransactionWorkflowDto.DisputeSummary resolveLatestDispute(Long transactionId) {
        return transactionDisputeRepository.findTopByTransactionIdOrderByFiledAtDesc(transactionId)
                .map(dispute -> TransactionWorkflowDto.DisputeSummary.builder()
                        .id(dispute.getId())
                        .disputeRef(dispute.getDisputeRef())
                        .reasonCode(dispute.getReasonCode())
                        .status(dispute.getStatus())
                        .filedAt(dispute.getFiledAt())
                        .lastUpdatedAt(dispute.getLastUpdatedAt())
                        .build())
                .orElse(null);
    }

    private List<TransactionAnalyticsDto.ChannelMetric> loadChannelMetrics(LocalDate fromDate, LocalDate toDate) {
        return transactionJournalRepository.aggregateChannelMetrics(fromDate, toDate)
                .stream()
                .map(row -> {
                    long count = toLong(row, 1);
                    BigDecimal value = toBigDecimal(row, 2);
                    long successCount = toLong(row, 3);
                    return new TransactionAnalyticsDto.ChannelMetric(
                            normalizeChannelLabel((String) row[0]),
                            count,
                            value,
                            percentage(successCount, count),
                            count == 0 ? BigDecimal.ZERO : value.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP)
                    );
                })
                .toList();
    }

    private TransactionAnalyticsDto.ChannelShare buildChannelShare(TransactionAnalyticsDto.ChannelMetric metric, long totalTransactions) {
        return new TransactionAnalyticsDto.ChannelShare(
                metric.channel(),
                percentage(metric.volume(), totalTransactions),
                metric.volume(),
                metric.value(),
                metric.successRate(),
                metric.averageValue()
        );
    }

    private DailyVolumeAggregate toDailyVolumeAggregate(Object[] row) {
        return new DailyVolumeAggregate(
                toLocalDate(row, 0),
                toLong(row, 1),
                toBigDecimal(row, 2),
                toLong(row, 3),
                toBigDecimal(row, 4)
        );
    }

    private List<TransactionAnalyticsDto.VolumeTrendPoint> groupVolumeTrendByWeek(List<DailyVolumeAggregate> dailyPoints, LocalDate reportEnd) {
        Map<LocalDate, TrendAccumulator> grouped = new LinkedHashMap<>();
        for (DailyVolumeAggregate point : dailyPoints) {
            LocalDate weekStart = point.date().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            LocalDate weekEnd = point.date().with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
            TrendAccumulator bucket = grouped.computeIfAbsent(weekStart, start -> new TrendAccumulator(start, weekEnd.isAfter(reportEnd) ? reportEnd : weekEnd));
            bucket.add(point);
        }
        return grouped.values().stream().map(TrendAccumulator::toWeekPoint).toList();
    }

    private List<TransactionAnalyticsDto.VolumeTrendPoint> groupVolumeTrendByMonth(List<DailyVolumeAggregate> dailyPoints, LocalDate reportEnd) {
        Map<LocalDate, TrendAccumulator> grouped = new LinkedHashMap<>();
        for (DailyVolumeAggregate point : dailyPoints) {
            LocalDate monthStart = point.date().withDayOfMonth(1);
            LocalDate monthEnd = point.date().with(TemporalAdjusters.lastDayOfMonth());
            TrendAccumulator bucket = grouped.computeIfAbsent(monthStart, start -> new TrendAccumulator(start, monthEnd.isAfter(reportEnd) ? reportEnd : monthEnd));
            bucket.add(point);
        }
        return grouped.values().stream().map(TrendAccumulator::toMonthPoint).toList();
    }

    private String normalizeGranularity(String granularity) {
        if (!StringUtils.hasText(granularity)) {
            return "day";
        }
        String normalized = granularity.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "week", "month" -> normalized;
            default -> "day";
        };
    }

    private String normalizeChannelLabel(String rawChannel) {
        if (!StringUtils.hasText(rawChannel)) {
            return "SYSTEM";
        }
        return "INTERNET".equalsIgnoreCase(rawChannel) ? "WEB" : rawChannel.toUpperCase(Locale.ROOT);
    }

    private String classifyFailureReason(TransactionJournal transaction) {
        String content = ((transaction.getNarration() == null ? "" : transaction.getNarration()) + " " +
                (transaction.getExternalRef() == null ? "" : transaction.getExternalRef())).toLowerCase(Locale.ROOT);
        if (content.contains("insufficient")) {
            return "Insufficient Funds";
        }
        if (content.contains("limit")) {
            return "Limit Exceeded";
        }
        if (content.contains("invalid") || content.contains("account not found")) {
            return "Invalid Account";
        }
        if (content.contains("system") || content.contains("timeout") || content.contains("network") || content.contains("switch")) {
            return "System Error";
        }
        return "Other";
    }

    private AnalyticsWindow resolveAnalyticsWindow(LocalDate fromDate, LocalDate toDate) {
        LocalDate resolvedTo = toDate != null ? toDate : LocalDate.now();
        LocalDate resolvedFrom = fromDate != null ? fromDate : resolvedTo.minusDays(29);
        if (resolvedFrom.isAfter(resolvedTo)) {
            return new AnalyticsWindow(resolvedTo, resolvedFrom);
        }
        return new AnalyticsWindow(resolvedFrom, resolvedTo);
    }

    private BigDecimal percentage(long numerator, long denominator) {
        if (denominator <= 0) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(numerator)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal percentage(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.compareTo(BigDecimal.ZERO) == 0 || numerator == null) {
            return BigDecimal.ZERO;
        }
        return numerator.multiply(BigDecimal.valueOf(100))
                .divide(denominator, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateStandardDeviation(List<Long> values, BigDecimal average) {
        if (values.isEmpty()) {
            return BigDecimal.ZERO;
        }
        double avg = average.doubleValue();
        double variance = values.stream()
                .mapToDouble(value -> Math.pow(value - avg, 2))
                .average()
                .orElse(0);
        return BigDecimal.valueOf(Math.sqrt(variance));
    }

    private long toLong(Object[] row, int index) {
        return row != null && row.length > index ? toLong(row[index]) : 0L;
    }

    private Long toLongObject(Object[] row, int index) {
        return row != null && row.length > index ? toLongObject(row[index]) : null;
    }

    private BigDecimal toBigDecimal(Object[] row, int index) {
        return row != null && row.length > index ? toBigDecimal(row[index]) : BigDecimal.ZERO;
    }

    private LocalDate toLocalDate(Object[] row, int index) {
        if (row == null || row.length <= index) {
            return null;
        }
        return toLocalDate(row[index]);
    }

    private int toInt(Object[] row, int index) {
        return row != null && row.length > index ? toInt(row[index]) : 0;
    }

    private long toLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return value == null ? 0L : Long.parseLong(value.toString());
    }

    private Long toLongObject(Object value) {
        return value == null ? null : toLong(value);
    }

    private int toInt(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        return value == null ? 0 : Integer.parseInt(value.toString());
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue()).setScale(2, RoundingMode.HALF_UP);
        }
        return value == null ? BigDecimal.ZERO : new BigDecimal(value.toString());
    }

    private LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        if (value instanceof java.sql.Date sqlDate) {
            return sqlDate.toLocalDate();
        }
        if (value instanceof java.sql.Timestamp timestamp) {
            return timestamp.toLocalDateTime().toLocalDate();
        }
        return value == null ? null : LocalDate.parse(value.toString());
    }

    private String dayLabel(int dayOfWeek) {
        return switch (dayOfWeek) {
            case 1 -> "Mon";
            case 2 -> "Tue";
            case 3 -> "Wed";
            case 4 -> "Thu";
            case 5 -> "Fri";
            case 6 -> "Sat";
            case 7 -> "Sun";
            default -> "Day";
        };
    }

    private void enforcePortalOwnership(TransactionJournal transaction) {
        if (!isPortalScopedPrincipal()) {
            return;
        }
        Long currentCustomerId = currentCustomerProvider.getCurrentCustomer().getId();
        if (!Objects.equals(transaction.getAccount().getCustomer().getId(), currentCustomerId)) {
            throw new BusinessException("You do not have access to this transaction", "TRANSACTION_ACCESS_DENIED");
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
                        || "ROLE_CBS_OFFICER".equals(authority.getAuthority())
                        || "ROLE_CBS_VIEWER".equals(authority.getAuthority()));
        return portalUser && !staffUser;
    }

    private record AnalyticsWindow(LocalDate from, LocalDate to) {
    }

    private record DailyVolumeAggregate(
            LocalDate date,
            long creditCount,
            BigDecimal creditValue,
            long debitCount,
            BigDecimal debitValue
    ) {
    }

    private static final class TrendAccumulator {
        private final LocalDate periodStart;
        private final LocalDate periodEnd;
        private long creditCount;
        private long debitCount;
        private BigDecimal creditValue = BigDecimal.ZERO;
        private BigDecimal debitValue = BigDecimal.ZERO;

        private TrendAccumulator(LocalDate periodStart, LocalDate periodEnd) {
            this.periodStart = periodStart;
            this.periodEnd = periodEnd;
        }

        private void add(DailyVolumeAggregate point) {
            creditCount += point.creditCount();
            debitCount += point.debitCount();
            creditValue = creditValue.add(point.creditValue());
            debitValue = debitValue.add(point.debitValue());
        }

        private TransactionAnalyticsDto.VolumeTrendPoint toWeekPoint() {
            return new TransactionAnalyticsDto.VolumeTrendPoint(
                    periodStart,
                    periodEnd,
                    periodStart.format(DateTimeFormatter.ofPattern("dd MMM")) + " - " +
                            periodEnd.format(DateTimeFormatter.ofPattern("dd MMM")),
                    creditCount,
                    debitCount,
                    creditValue,
                    debitValue,
                    creditValue.add(debitValue)
            );
        }

        private TransactionAnalyticsDto.VolumeTrendPoint toMonthPoint() {
            return new TransactionAnalyticsDto.VolumeTrendPoint(
                    periodStart,
                    periodEnd,
                    periodStart.format(DateTimeFormatter.ofPattern("MMM yyyy")),
                    creditCount,
                    debitCount,
                    creditValue,
                    debitValue,
                    creditValue.add(debitValue)
            );
        }
    }
}
