package com.cbs.wadiah.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.hijri.dto.HijriDateResponse;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.wadiah.dto.UpdateWadiahStatementConfigRequest;
import com.cbs.wadiah.dto.WadiahStatement;
import com.cbs.wadiah.entity.WadiahAccount;
import com.cbs.wadiah.entity.WadiahDomainEnums;
import com.cbs.wadiah.entity.WadiahStatementConfig;
import com.cbs.wadiah.repository.WadiahAccountRepository;
import com.cbs.wadiah.repository.WadiahStatementConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class WadiahStatementService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("d MMM uuuu");
    private static final AtomicLong STATEMENT_SEQ = new AtomicLong(System.currentTimeMillis() % 100000);

    private final WadiahAccountRepository wadiahAccountRepository;
    private final WadiahStatementConfigRepository wadiahStatementConfigRepository;
    private final TransactionJournalRepository transactionJournalRepository;
    private final HijriCalendarService hijriCalendarService;
    private final WadiahAccountService wadiahAccountService;
    private final IslamicProductTemplateRepository islamicProductTemplateRepository;

    private final Map<String, WadiahStatement> statementStore = new ConcurrentHashMap<>();
    private final Map<Long, List<String>> statementIndexByAccount = new ConcurrentHashMap<>();

    public WadiahStatement generateWadiahStatement(Long accountId, LocalDate fromDate, LocalDate toDate, String language) {
        WadiahAccount wadiahAccount = getWadiahAccount(accountId);
        Account account = wadiahAccount.getAccount();
        WadiahStatementConfig config = resolveConfig(wadiahAccount);
        WadiahDomainEnums.PreferredLanguage preferredLanguage = resolveLanguage(language, config, wadiahAccount);
        LocalDate start = fromDate != null ? fromDate : LocalDate.now().withDayOfMonth(1);
        LocalDate end = toDate != null ? toDate : LocalDate.now();

        List<TransactionJournal> transactions = new ArrayList<>(
                transactionJournalRepository.findByAccountIdAndDateRange(accountId, start, end)
        );
        Collections.reverse(transactions);

        BigDecimal openingBalance = calculateOpeningBalance(transactions, account.getBookBalance());
        BigDecimal closingBalance = transactions.isEmpty()
                ? account.getBookBalance().setScale(2, RoundingMode.HALF_UP)
                : transactions.getLast().getRunningBalance().setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalDeposits = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalWithdrawals = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalHibah = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        List<WadiahStatement.WadiahStatementLine> lines = new ArrayList<>();

        for (TransactionJournal transaction : transactions) {
            TransactionView view = classifyTransaction(transaction);
            if (view.hibah()) {
                totalHibah = totalHibah.add(transaction.getAmount()).setScale(2, RoundingMode.HALF_UP);
            } else if (view.credit()) {
                totalDeposits = totalDeposits.add(transaction.getAmount()).setScale(2, RoundingMode.HALF_UP);
            } else if (view.debit()) {
                totalWithdrawals = totalWithdrawals.add(transaction.getAmount()).setScale(2, RoundingMode.HALF_UP);
            }

            lines.add(WadiahStatement.WadiahStatementLine.builder()
                    .date(formatDate(transaction.getPostingDate()))
                    .dateHijri(Boolean.TRUE.equals(config.getIncludeIslamicDates()) ? formatHijri(transaction.getPostingDate()) : null)
                    .description(resolveEnglishDescription(view))
                    .descriptionAr(resolveArabicDescription(view))
                    .reference(transaction.getTransactionRef())
                    .debit(view.debit() ? transaction.getAmount() : null)
                    .credit(view.credit() || view.hibah() ? transaction.getAmount() : null)
                    .balance(transaction.getRunningBalance())
                    .transactionType(view.label())
                    .build());
        }

        BigDecimal averageBalance = transactionJournalRepository.findAverageBalanceInPeriod(accountId, start, end);
        if (averageBalance == null || averageBalance.compareTo(BigDecimal.ZERO) <= 0) {
            averageBalance = account.getBookBalance();
        }

        String statementRef = generateStatementReference(accountId);
        WadiahStatement statement = WadiahStatement.builder()
                .statementRef(statementRef)
                .accountNumber(account.getAccountNumber())
                .accountName(account.getAccountName())
                .customerName(account.getCustomer() != null ? account.getCustomer().getDisplayName() : null)
                .customerNameAr(null)
                .branchName(account.getBranchCode())
                .statementPeriod(formatDate(start) + " - " + formatDate(end))
                .statementPeriodAr(formatArabicDate(start) + " - " + formatArabicDate(end))
                .statementPeriodHijri(formatHijri(start) + " - " + formatHijri(end))
                .contractType("Wadiah Yad Dhamanah")
                .contractTypeAr("الوديعة يد الضمانة")
                .productName(account.getProduct() != null ? account.getProduct().getName() : null)
                .productNameAr(islamicProductTemplateRepository.findById(wadiahAccount.getIslamicProductTemplateId())
                        .map(item -> item.getNameAr())
                        .orElse(account.getProduct() != null ? account.getProduct().getName() : null))
                .currencyCode(account.getCurrencyCode())
                .openingBalance(openingBalance)
                .closingBalance(closingBalance)
                .totalDeposits(totalDeposits)
                .totalWithdrawals(totalWithdrawals)
                .totalHibahReceived(totalHibah)
                .averageBalance(Boolean.TRUE.equals(config.getShowAverageBalance())
                        ? averageBalance.setScale(2, RoundingMode.HALF_UP)
                        : null)
                .transactionCount(lines.size())
                .transactions(lines)
                .zakatSummary(Boolean.TRUE.equals(config.getIncludeZakatSummary()) ? buildZakatSummary(accountId) : null)
                .hibahDisclaimer(Boolean.TRUE.equals(config.getIncludeHibahDisclaimer())
                        ? "Hibah (Gift) distributions are at the bank's sole discretion and are not guaranteed. Past distributions do not indicate future distributions."
                        : null)
                .hibahDisclaimerAr(Boolean.TRUE.equals(config.getIncludeHibahDisclaimer())
                        ? "توزيعات الهبة تكون وفقاً لتقدير البنك وحده ولا يضمنها. التوزيعات السابقة لا تشير إلى توزيعات مستقبلية."
                        : null)
                .bankName("CBS Islamic Banking")
                .bankNameAr("الخدمات المصرفية الإسلامية - سي بي إس")
                .shariahDisclosure("This account operates under Wadiah Yad Dhamanah principles and carries no contractual return.")
                .shariahDisclosureAr("يعمل هذا الحساب وفق مبادئ الوديعة يد الضمانة ولا يترتب عليه عائد تعاقدي.")
                .generatedDate(formatDate(LocalDate.now()))
                .generatedDateHijri(formatHijri(LocalDate.now()))
                .build();

        statementStore.put(statementRef, statement);
        statementIndexByAccount.computeIfAbsent(accountId, ignored -> new ArrayList<>()).add(0, statementRef);
        log.info("Wadiah statement generated: accountId={}, statementRef={}, language={}",
                accountId, statementRef, preferredLanguage);
        return statement;
    }

    @Transactional(readOnly = true)
    public List<WadiahStatement> listGeneratedStatements(Long accountId) {
        getWadiahAccount(accountId);
        return statementIndexByAccount.getOrDefault(accountId, List.of()).stream()
                .map(statementStore::get)
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    @Transactional(readOnly = true)
    public WadiahStatement getGeneratedStatement(String statementRef) {
        WadiahStatement statement = statementStore.get(statementRef);
        if (statement == null) {
            throw new ResourceNotFoundException("WadiahStatement", "statementRef", statementRef);
        }
        return statement;
    }

    @Transactional(readOnly = true)
    public WadiahStatementConfig getStatementConfig(Long accountId) {
        return resolveConfig(getWadiahAccount(accountId));
    }

    public WadiahStatementConfig updateStatementConfig(Long accountId, UpdateWadiahStatementConfigRequest request) {
        WadiahAccount wadiahAccount = getWadiahAccount(accountId);
        WadiahStatementConfig config = resolveConfig(wadiahAccount);

        if (request.getLanguage() != null) config.setLanguage(request.getLanguage());
        if (request.getIncludeHibahDisclaimer() != null) config.setIncludeHibahDisclaimer(request.getIncludeHibahDisclaimer());
        if (request.getIncludeZakatSummary() != null) config.setIncludeZakatSummary(request.getIncludeZakatSummary());
        if (request.getIncludeIslamicDates() != null) config.setIncludeIslamicDates(request.getIncludeIslamicDates());
        if (request.getShowAverageBalance() != null) config.setShowAverageBalance(request.getShowAverageBalance());
        if (request.getDeliveryMethod() != null) config.setDeliveryMethod(request.getDeliveryMethod());

        return wadiahStatementConfigRepository.save(config);
    }

    @Transactional(readOnly = true)
    public List<WadiahStatement.WadiahStatementLine> getMiniStatement(Long accountId, int limit) {
        WadiahAccount wadiahAccount = getWadiahAccount(accountId);
        WadiahStatementConfig config = resolveConfig(wadiahAccount);
        return transactionJournalRepository.findByAccountIdOrderByCreatedAtDesc(
                        accountId,
                        PageRequest.of(0, Math.min(Math.max(limit, 1), 20), Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent()
                .stream()
                .map(transaction -> {
                    TransactionView view = classifyTransaction(transaction);
                    return WadiahStatement.WadiahStatementLine.builder()
                            .date(formatDate(transaction.getPostingDate()))
                            .dateHijri(Boolean.TRUE.equals(config.getIncludeIslamicDates()) ? formatHijri(transaction.getPostingDate()) : null)
                            .description(resolveEnglishDescription(view))
                            .descriptionAr(resolveArabicDescription(view))
                            .reference(transaction.getTransactionRef())
                            .debit(view.debit() ? transaction.getAmount() : null)
                            .credit(view.credit() || view.hibah() ? transaction.getAmount() : null)
                            .balance(transaction.getRunningBalance())
                            .transactionType(view.label())
                            .build();
                })
                .toList();
    }

    public List<WadiahStatement> generateMonthlyStatements() {
        LocalDate start = LocalDate.now().minusMonths(1).withDayOfMonth(1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        return wadiahAccountRepository.findAll().stream()
                .filter(item -> item.getStatementFrequency() == WadiahDomainEnums.StatementFrequency.MONTHLY)
                .map(item -> generateWadiahStatement(item.getAccount().getId(), start, end, item.getPreferredLanguage().name()))
                .toList();
    }

    private WadiahAccount getWadiahAccount(Long accountId) {
        return wadiahAccountRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("WadiahAccount", "accountId", accountId));
    }

    private WadiahStatementConfig resolveConfig(WadiahAccount wadiahAccount) {
        return wadiahStatementConfigRepository.findByWadiahAccountId(wadiahAccount.getId())
                .orElseGet(() -> wadiahStatementConfigRepository.save(WadiahStatementConfig.builder()
                        .wadiahAccountId(wadiahAccount.getId())
                        .language(wadiahAccount.getPreferredLanguage())
                        .tenantId(wadiahAccount.getTenantId())
                        .build()));
    }

    private WadiahDomainEnums.PreferredLanguage resolveLanguage(String language, WadiahStatementConfig config, WadiahAccount account) {
        if (StringUtils.hasText(language)) {
            try {
                return WadiahDomainEnums.PreferredLanguage.valueOf(language.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ignored) {
                return config.getLanguage();
            }
        }
        return config.getLanguage() != null ? config.getLanguage() : account.getPreferredLanguage();
    }

    private BigDecimal calculateOpeningBalance(List<TransactionJournal> transactions, BigDecimal fallbackBalance) {
        if (transactions.isEmpty()) {
            return fallbackBalance.setScale(2, RoundingMode.HALF_UP);
        }
        TransactionJournal first = transactions.getFirst();
        BigDecimal delta = switch (first.getTransactionType()) {
            case CREDIT, TRANSFER_IN, OPENING_BALANCE, INTEREST_POSTING -> first.getAmount();
            default -> first.getAmount().negate();
        };
        return first.getRunningBalance().subtract(delta).setScale(2, RoundingMode.HALF_UP);
    }

    private WadiahStatement.ZakatSummary buildZakatSummary(Long accountId) {
        BigDecimal zakatableBalance = wadiahAccountService.calculateZakatableBalance(accountId, LocalDate.now());
        BigDecimal estimatedZakat = zakatableBalance.multiply(new BigDecimal("0.025")).setScale(2, RoundingMode.HALF_UP);
        return WadiahStatement.ZakatSummary.builder()
                .zakatableBalance(zakatableBalance)
                .estimatedZakat(estimatedZakat)
                .zakatDisclaimer("This is for informational purposes. Consult your Shariah advisor for Zakat obligations.")
                .zakatDisclaimerAr("هذه المعلومات لأغراض البيان فقط. يرجى الرجوع إلى مستشارك الشرعي بشأن التزامات الزكاة.")
                .build();
    }

    private TransactionView classifyTransaction(TransactionJournal transaction) {
        String narration = transaction.getNarration() != null ? transaction.getNarration().toLowerCase(Locale.ROOT) : "";
        if (narration.contains("hibah")) {
            return new TransactionView("HIBAH", false, false, true);
        }
        if (transaction.getTransactionType() == TransactionType.TRANSFER_IN) {
            return new TransactionView("TRANSFER_IN", true, false, false);
        }
        if (transaction.getTransactionType() == TransactionType.TRANSFER_OUT) {
            return new TransactionView("TRANSFER_OUT", false, true, false);
        }
        if (transaction.getTransactionType() == TransactionType.FEE_DEBIT) {
            return new TransactionView("FEE", false, true, false);
        }
        if (transaction.getTransactionType() == TransactionType.REVERSAL) {
            return new TransactionView("REVERSAL", false, false, false);
        }
        if (transaction.getTransactionType() == TransactionType.CREDIT
                || transaction.getTransactionType() == TransactionType.OPENING_BALANCE) {
            return new TransactionView("DEPOSIT", true, false, false);
        }
        return new TransactionView("WITHDRAWAL", false, true, false);
    }

    private String resolveEnglishDescription(TransactionView view) {
        return switch (view.label()) {
            case "HIBAH" -> "Hibah (Gift)";
            case "TRANSFER_IN" -> "Wadiah Deposit - Transfer";
            case "TRANSFER_OUT" -> "Wadiah Withdrawal - Transfer";
            case "FEE" -> "Service Fee";
            case "REVERSAL" -> "Transaction Reversal";
            case "DEPOSIT" -> "Wadiah Deposit - Cash";
            default -> "Wadiah Withdrawal - Cash";
        };
    }

    private String resolveArabicDescription(TransactionView view) {
        return switch (view.label()) {
            case "HIBAH" -> "هبة";
            case "TRANSFER_IN" -> "إيداع وديعة - تحويل";
            case "TRANSFER_OUT" -> "سحب وديعة - تحويل";
            case "FEE" -> "رسوم خدمة";
            case "REVERSAL" -> "عكس عملية";
            case "DEPOSIT" -> "إيداع وديعة - نقدي";
            default -> "سحب وديعة - نقدي";
        };
    }

    private String formatDate(LocalDate date) {
        return date != null ? date.format(DATE_FMT) : null;
    }

    private String formatArabicDate(LocalDate date) {
        return date != null ? date.toString() : null;
    }

    private String formatHijri(LocalDate date) {
        if (date == null) {
            return null;
        }
        HijriDateResponse hijri = hijriCalendarService.toHijri(date);
        if (hijri.getHijriDay() == null || hijri.getHijriMonthName() == null || hijri.getHijriYear() == null) {
            return null;
        }
        return hijri.getHijriDay() + " " + hijri.getHijriMonthName() + " " + hijri.getHijriYear();
    }

    private String generateStatementReference(Long accountId) {
        return "WAD-STMT-" + accountId + "-" + String.format("%06d", STATEMENT_SEQ.incrementAndGet());
    }

    private record TransactionView(String label, boolean credit, boolean debit, boolean hibah) {
    }
}
