package com.cbs.account.service;

import com.cbs.account.dto.GlEntryDto;
import com.cbs.account.dto.TransactionResponse;
import com.cbs.account.dto.TransactionSearchCriteria;
import com.cbs.account.dto.TransactionSummary;
import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.entity.JournalLine;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransactionService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final DateTimeFormatter RECEIPT_DATE_TIME_FORMAT =
            DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm:ss 'UTC'");

    private final TransactionJournalRepository transactionJournalRepository;
    private final AccountRepository accountRepository;

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
        return toResponse(getTransactionEntity(id));
    }

    public TransactionJournal getTransactionEntity(Long id) {
        return transactionJournalRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Transaction not found: " + id));
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
                .build();
    }

    private Specification<TransactionJournal> buildSpecification(TransactionSearchCriteria criteria) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            Join<TransactionJournal, Account> accountJoin = root.join("account", JoinType.INNER);
            query.distinct(true);

            if (StringUtils.hasText(criteria.getSearch())) {
                String term = "%" + criteria.getSearch().trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(builder.or(
                        builder.like(builder.lower(root.get("narration")), term),
                        builder.like(builder.lower(root.get("transactionRef")), term)
                ));
            }

            if (StringUtils.hasText(criteria.getAccountNumber())) {
                predicates.add(builder.equal(accountJoin.get("accountNumber"), criteria.getAccountNumber().trim()));
            }

            if (StringUtils.hasText(criteria.getCustomerId())) {
                Optional<Long> customerId = parseLong(criteria.getCustomerId());
                if (customerId.isEmpty()) {
                    return builder.disjunction();
                }
                predicates.add(builder.equal(accountJoin.get("customer").get("id"), customerId.get()));
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
}
