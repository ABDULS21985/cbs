package com.cbs.gl.service;

import com.cbs.account.repository.AccountRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.deposit.repository.FixedDepositRepository;
import com.cbs.deposit.repository.RecurringDepositRepository;
import com.cbs.gl.entity.*;
import com.cbs.gl.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class GeneralLedgerService {

    private final ChartOfAccountsRepository coaRepository;
    private final JournalEntryRepository journalRepository;
    private final GlBalanceRepository balanceRepository;
    private final SubledgerReconRunRepository reconRepository;
    private final AccountRepository accountRepository;
    private final FixedDepositRepository fixedDepositRepository;
    private final RecurringDepositRepository recurringDepositRepository;
    private final CurrentActorProvider currentActorProvider;
    private final CbsProperties cbsProperties;

    // ========================================================================
    // JOURNAL POSTING (Core of Cap 68)
    // ========================================================================

    /**
     * Creates and posts a journal entry atomically.
     * Validates: all GL codes exist and are postable, double-entry balances,
     * then updates GL balances for each line.
     */
    @Transactional
    public JournalEntry postJournal(String journalType, String description, String sourceModule,
                                      String sourceRef, LocalDate valueDate,
                                      List<JournalLineRequest> lineRequests) {
        return postJournal(journalType, description, sourceModule, sourceRef, valueDate,
                currentActorProvider.getCurrentActor(), lineRequests);
    }

    @Transactional
    public JournalEntry postJournal(String journalType, String description, String sourceModule,
                                      String sourceRef, LocalDate valueDate, String createdBy,
                                      List<JournalLineRequest> lineRequests) {
        Long seq = journalRepository.getNextJournalSequence();
        String journalNumber = String.format("JN%013d", seq);
        Map<String, NormalBalance> normalBalanceByGlCode = new LinkedHashMap<>();

        JournalEntry journal = JournalEntry.builder()
                .journalNumber(journalNumber).journalType(journalType)
                .description(description).sourceModule(sourceModule).sourceRef(sourceRef)
                .valueDate(valueDate != null ? valueDate : LocalDate.now())
                .postingDate(LocalDate.now()).createdBy(StringUtils.hasText(createdBy) ? createdBy : currentActorProvider.getCurrentActor())
                .status("PENDING").build();

        int lineNum = 1;
        for (JournalLineRequest req : lineRequests) {
            ChartOfAccounts coa = coaRepository.findByGlCode(req.glCode())
                    .orElseThrow(() -> new BusinessException("GL code not found: " + req.glCode(), "INVALID_GL_CODE"));
            if (!Boolean.TRUE.equals(coa.getIsPostable())) {
                throw new BusinessException("GL code is not postable (header account): " + req.glCode(), "GL_NOT_POSTABLE");
            }
            if (coa.getNormalBalance() == null) {
                throw new BusinessException("GL normal balance is required for " + req.glCode(), "MISSING_GL_NORMAL_BALANCE");
            }
            normalBalanceByGlCode.put(req.glCode(), coa.getNormalBalance());

            BigDecimal localDebit = req.debitAmount().multiply(req.fxRate() != null ? req.fxRate() : BigDecimal.ONE);
            BigDecimal localCredit = req.creditAmount().multiply(req.fxRate() != null ? req.fxRate() : BigDecimal.ONE);

            JournalLine line = JournalLine.builder()
                    .lineNumber(lineNum++).glCode(req.glCode())
                    .debitAmount(req.debitAmount()).creditAmount(req.creditAmount())
                    .currencyCode(req.currencyCode() != null ? req.currencyCode() : "USD")
                    .localDebit(localDebit).localCredit(localCredit)
                    .fxRate(req.fxRate() != null ? req.fxRate() : BigDecimal.ONE)
                    .narration(req.narration()).costCentre(req.costCentre())
                    .branchCode(req.branchCode() != null ? req.branchCode() : "HEAD")
                    .accountId(req.accountId()).customerId(req.customerId()).build();

            journal.addLine(line);
        }

        // Double-entry validation
        if (!journal.isBalanced()) {
            throw new BusinessException(String.format("Journal is not balanced: debit=%s, credit=%s",
                    journal.getTotalDebit(), journal.getTotalCredit()), "JOURNAL_NOT_BALANCED");
        }

        // Post to GL balances
        for (JournalLine line : journal.getLines()) {
            updateGlBalance(line.getGlCode(), line.getBranchCode() != null ? line.getBranchCode() : "HEAD",
                    line.getCurrencyCode(), journal.getPostingDate(), line.getLocalDebit(), line.getLocalCredit(),
                    normalBalanceByGlCode.get(line.getGlCode()));
        }

        journal.setStatus("POSTED");
        journal.setPostedAt(Instant.now());
        JournalEntry saved = journalRepository.save(journal);

        log.info("Journal posted: number={}, type={}, debit={}, credit={}, lines={}, source={}/{}",
                journalNumber, journalType, journal.getTotalDebit(), journal.getTotalCredit(),
                journal.getLines().size(), sourceModule, sourceRef);
        return saved;
    }

    /**
     * Reverses a posted journal by creating a mirror journal with debits/credits swapped.
     */
    @Transactional
    public JournalEntry reverseJournal(Long journalId) {
        return reverseJournal(journalId, currentActorProvider.getCurrentActor());
    }

    @Transactional
    public JournalEntry reverseJournal(Long journalId, String reversedBy) {
        JournalEntry original = journalRepository.findById(journalId)
                .orElseThrow(() -> new ResourceNotFoundException("JournalEntry", "id", journalId));

        if (!"POSTED".equals(original.getStatus())) {
            throw new BusinessException("Only POSTED journals can be reversed", "JOURNAL_NOT_POSTED");
        }

        List<JournalLineRequest> reversalLines = original.getLines().stream()
                .map(line -> new JournalLineRequest(line.getGlCode(),
                        line.getCreditAmount(), line.getDebitAmount(), // swapped
                        line.getCurrencyCode(), line.getFxRate(), "Reversal: " + line.getNarration(),
                        line.getCostCentre(), line.getBranchCode(), line.getAccountId(), line.getCustomerId()))
                .toList();

        JournalEntry reversal = postJournal("REVERSAL", "Reversal of " + original.getJournalNumber(),
                original.getSourceModule(), original.getSourceRef(), LocalDate.now(), reversedBy, reversalLines);

        original.setStatus("REVERSED");
        original.setReversedAt(Instant.now());
        original.setReversalJournalId(reversal.getId());
        journalRepository.save(original);

        log.info("Journal reversed: original={}, reversal={}", original.getJournalNumber(), reversal.getJournalNumber());
        return reversal;
    }

    // ========================================================================
    // GL BALANCE MANAGEMENT
    // ========================================================================

    private void updateGlBalance(String glCode, String branchCode, String currencyCode,
                                   LocalDate date, BigDecimal debit, BigDecimal credit,
                                   NormalBalance normalBalance) {
        GlBalance balance = balanceRepository
                .findByGlCodeAndBranchCodeAndCurrencyCodeAndBalanceDate(glCode, branchCode, currencyCode, date)
                .orElseGet(() -> {
                    // Carry forward previous day's closing as today's opening
                    BigDecimal opening = balanceRepository
                            .findByGlCodeAndBranchCodeAndCurrencyCodeAndBalanceDate(glCode, branchCode, currencyCode, date.minusDays(1))
                            .map(GlBalance::getClosingBalance).orElse(BigDecimal.ZERO);

                    return GlBalance.builder()
                            .glCode(glCode).branchCode(branchCode).currencyCode(currencyCode)
                            .balanceDate(date).openingBalance(opening).closingBalance(opening).build();
                });

        if (debit.compareTo(BigDecimal.ZERO) > 0) balance.applyDebit(debit, normalBalance);
        if (credit.compareTo(BigDecimal.ZERO) > 0) balance.applyCredit(credit, normalBalance);
        balanceRepository.save(balance);
    }

    /**
     * Trial balance: returns all GL balances for a given date.
     */
    public List<GlBalance> getTrialBalance(LocalDate date) {
        return balanceRepository.findByBalanceDateOrderByGlCodeAsc(date);
    }

    public List<GlBalance> getGlHistory(String glCode, LocalDate from, LocalDate to) {
        return balanceRepository.findByGlCodeAndBalanceDateBetweenOrderByBalanceDateAsc(glCode, from, to);
    }

    // ========================================================================
    // CAPABILITY 69: SUB-LEDGER RECONCILIATION
    // ========================================================================

    @Transactional
    public SubledgerReconRun runReconciliation(String subledgerType, String glCode,
                                               LocalDate reconDate, String branchCode, String currencyCode) {
        String resolvedBranch = StringUtils.hasText(branchCode)
                ? branchCode
                : cbsProperties.getLedger().getDefaultBranchCode();
        String resolvedCurrency = StringUtils.hasText(currencyCode)
                ? currencyCode
                : cbsProperties.getDeployment().getDefaultCurrency();
        BigDecimal glBalance = balanceRepository.findByGlCodeAndBalanceDate(glCode, reconDate).stream()
                .filter(balance -> resolvedCurrency.equals(balance.getCurrencyCode()))
                .filter(balance -> resolvedBranch.equals(balance.getBranchCode()))
                .map(GlBalance::getClosingBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal subledgerBalance = deriveSubledgerBalance(subledgerType, glCode, resolvedBranch, resolvedCurrency);
        BigDecimal difference = glBalance.subtract(subledgerBalance).abs();
        boolean isBalanced = difference.compareTo(new BigDecimal("0.01")) < 0;

        SubledgerReconRun recon = SubledgerReconRun.builder()
                .reconDate(reconDate).subledgerType(subledgerType).glCode(glCode)
                .branchCode(resolvedBranch).currencyCode(resolvedCurrency)
                .glBalance(glBalance).subledgerBalance(subledgerBalance)
                .difference(difference).isBalanced(isBalanced)
                .status(isBalanced ? "COMPLETED" : "EXCEPTIONS").build();

        SubledgerReconRun saved = reconRepository.save(recon);
        if (!isBalanced) {
            log.warn("Sub-ledger mismatch: type={}, gl={}, glBal={}, subBal={}, diff={}",
                    subledgerType, glCode, glBalance, subledgerBalance, difference);
        }
        return saved;
    }

    private BigDecimal deriveSubledgerBalance(String subledgerType, String glCode, String branchCode, String currencyCode) {
        BigDecimal accountBalances = accountRepository.sumBookBalanceByProductGlCode(glCode, currencyCode, branchCode);
        BigDecimal fixedDeposits = fixedDepositRepository.sumCurrentValueByProductGlCode(glCode, currencyCode, branchCode);
        BigDecimal recurringDeposits = recurringDepositRepository.sumCurrentValueByProductGlCode(glCode, currencyCode, branchCode);
        return switch (subledgerType.toUpperCase()) {
            case "ACCOUNTS" -> accountBalances;
            case "FIXED_DEPOSITS" -> fixedDeposits;
            case "RECURRING_DEPOSITS" -> recurringDeposits;
            case "DEPOSITS" -> accountBalances.add(fixedDeposits).add(recurringDeposits);
            default -> throw new BusinessException("Unsupported reconciliation type: " + subledgerType,
                    "UNSUPPORTED_RECONCILIATION_TYPE");
        };
    }

    public List<SubledgerReconRun> getReconResults(LocalDate date) {
        return reconRepository.findByReconDateOrderBySubledgerTypeAsc(date);
    }

    // ========================================================================
    // CHART OF ACCOUNTS
    // ========================================================================

    @Transactional
    public ChartOfAccounts createGlAccount(ChartOfAccounts coa) {
        normalizeGlAccount(coa);
        coaRepository.findByGlCode(coa.getGlCode()).ifPresent(existing -> {
            throw new BusinessException("GL code already exists: " + coa.getGlCode(), "DUPLICATE_GL");
        });
        coa.setCreatedBy(currentActorProvider.getCurrentActor());
        return coaRepository.save(coa);
    }

    @Transactional
    public List<ChartOfAccounts> importGlAccounts(InputStream inputStream) {
        List<ChartOfAccounts> imported = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            int lineNumber = 0;
            while ((line = reader.readLine()) != null) {
                lineNumber++;
                if (!StringUtils.hasText(line)) {
                    continue;
                }

                List<String> columns = parseCsvLine(line);
                if (lineNumber == 1 && !columns.isEmpty() && "glCode".equalsIgnoreCase(columns.get(0))) {
                    continue;
                }
                if (columns.size() < 2) {
                    throw new BusinessException("Invalid GL import row at line " + lineNumber, "INVALID_GL_IMPORT_ROW");
                }

                ChartOfAccounts account = upsertGlAccount(columns);
                imported.add(account);
            }
        } catch (IOException ex) {
            throw new BusinessException("Unable to read chart of accounts import file", "GL_IMPORT_READ_ERROR");
        }
        return imported;
    }

    public List<ChartOfAccounts> getPostableAccounts() {
        return coaRepository.findByIsPostableTrueAndIsActiveTrueOrderByGlCodeAsc();
    }

    public List<ChartOfAccounts> getByCategory(GlCategory category) {
        return coaRepository.findByGlCategoryAndIsActiveTrue(category);
    }

    // ========================================================================
    // QUERY
    // ========================================================================

    public JournalEntry getJournal(Long id) {
        return journalRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("JournalEntry", "id", id));
    }

    public Page<JournalEntry> getJournalsByDate(LocalDate from, LocalDate to, Pageable pageable) {
        return journalRepository.findByPostingDateBetweenOrderByPostingDateDesc(from, to, pageable);
    }

    private ChartOfAccounts upsertGlAccount(List<String> columns) {
        String glCode = requiredCsv(columns, 0, "glCode");
        ChartOfAccounts account = coaRepository.findByGlCode(glCode).orElseGet(ChartOfAccounts::new);
        account.setGlCode(glCode);
        account.setGlName(requiredCsv(columns, 1, "glName"));
        account.setGlCategory(parseEnum(columns, 2, GlCategory.class, inferCategory(glCode)));
        account.setParentGlCode(optionalCsv(columns, 3));
        account.setLevelNumber(parseInteger(columns, 4, null));
        account.setIsHeader(parseBoolean(columns, 5, Boolean.FALSE));
        account.setIsPostable(parseBoolean(columns, 6, !Boolean.TRUE.equals(account.getIsHeader())));
        account.setCurrencyCode(optionalCsv(columns, 7));
        account.setNormalBalance(parseEnum(columns, 8, NormalBalance.class, inferNormalBalance(account.getGlCategory())));
        account.setIsActive(parseBoolean(columns, 9, Boolean.TRUE));
        account.setCreatedBy(StringUtils.hasText(account.getCreatedBy()) ? account.getCreatedBy() : currentActorProvider.getCurrentActor());
        normalizeGlAccount(account);
        return coaRepository.save(account);
    }

    private void normalizeGlAccount(ChartOfAccounts coa) {
        if (!StringUtils.hasText(coa.getGlCode())) {
            throw new BusinessException("GL code is required", "MISSING_GL_CODE");
        }
        if (!StringUtils.hasText(coa.getGlName())) {
            throw new BusinessException("GL name is required", "MISSING_GL_NAME");
        }
        if (coa.getGlCategory() == null) {
            coa.setGlCategory(inferCategory(coa.getGlCode()));
        }
        if (coa.getNormalBalance() == null) {
            coa.setNormalBalance(inferNormalBalance(coa.getGlCategory()));
        }
        if (coa.getIsHeader() == null) {
            coa.setIsHeader(Boolean.FALSE);
        }
        if (coa.getIsPostable() == null) {
            coa.setIsPostable(!Boolean.TRUE.equals(coa.getIsHeader()));
        }
        if (Boolean.TRUE.equals(coa.getIsHeader())) {
            coa.setIsPostable(Boolean.FALSE);
        }
        if (coa.getIsActive() == null) {
            coa.setIsActive(Boolean.TRUE);
        }
        if (coa.getAllowManualPosting() == null) {
            coa.setAllowManualPosting(Boolean.TRUE);
        }
        if (coa.getRequiresCostCentre() == null) {
            coa.setRequiresCostCentre(Boolean.FALSE);
        }
        if (coa.getIsInterBranch() == null) {
            coa.setIsInterBranch(Boolean.FALSE);
        }
        if (coa.getIsMultiCurrency() == null) {
            coa.setIsMultiCurrency(Boolean.FALSE);
        }
        coa.setGlCode(coa.getGlCode().trim().toUpperCase());
        coa.setGlName(coa.getGlName().trim());
        coa.setCurrencyCode(StringUtils.hasText(coa.getCurrencyCode()) ? coa.getCurrencyCode().trim().toUpperCase() : null);
        coa.setParentGlCode(StringUtils.hasText(coa.getParentGlCode()) ? coa.getParentGlCode().trim().toUpperCase() : null);
        coa.setUpdatedAt(Instant.now());

        if (StringUtils.hasText(coa.getParentGlCode())) {
            ChartOfAccounts parent = coaRepository.findByGlCode(coa.getParentGlCode())
                    .orElseThrow(() -> new BusinessException("Parent GL code not found: " + coa.getParentGlCode(), "INVALID_PARENT_GL"));
            coa.setLevelNumber(parent.getLevelNumber() + 1);
            if (parent.getGlCategory() != coa.getGlCategory()) {
                coa.setGlCategory(parent.getGlCategory());
            }
            coa.setNormalBalance(parent.getNormalBalance());
        } else if (coa.getLevelNumber() == null || coa.getLevelNumber() < 1) {
            coa.setLevelNumber(1);
        }
    }

    private List<String> parseCsvLine(String line) {
        List<String> columns = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }
            if (ch == ',' && !inQuotes) {
                columns.add(current.toString().trim());
                current.setLength(0);
                continue;
            }
            current.append(ch);
        }
        columns.add(current.toString().trim());
        return columns;
    }

    private String requiredCsv(List<String> columns, int index, String field) {
        String value = optionalCsv(columns, index);
        if (!StringUtils.hasText(value)) {
            throw new BusinessException("Missing required field '" + field + "' in GL import", "INVALID_GL_IMPORT_ROW");
        }
        return value;
    }

    private String optionalCsv(List<String> columns, int index) {
        if (index >= columns.size()) {
            return null;
        }
        String value = columns.get(index);
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private Integer parseInteger(List<String> columns, int index, Integer defaultValue) {
        String value = optionalCsv(columns, index);
        return StringUtils.hasText(value) ? Integer.valueOf(value) : defaultValue;
    }

    private Boolean parseBoolean(List<String> columns, int index, Boolean defaultValue) {
        String value = optionalCsv(columns, index);
        return StringUtils.hasText(value) ? Boolean.valueOf(value) : defaultValue;
    }

    private <E extends Enum<E>> E parseEnum(List<String> columns, int index, Class<E> type, E defaultValue) {
        String value = optionalCsv(columns, index);
        return StringUtils.hasText(value) ? Enum.valueOf(type, value.toUpperCase()) : defaultValue;
    }

    private GlCategory inferCategory(String glCode) {
        if (!StringUtils.hasText(glCode)) {
            return GlCategory.ASSET;
        }
        return switch (glCode.trim().charAt(0)) {
            case '1' -> GlCategory.ASSET;
            case '2' -> GlCategory.LIABILITY;
            case '3' -> GlCategory.EQUITY;
            case '4' -> GlCategory.INCOME;
            case '5' -> GlCategory.EXPENSE;
            default -> GlCategory.ASSET;
        };
    }

    private NormalBalance inferNormalBalance(GlCategory category) {
        return switch (category) {
            case LIABILITY, EQUITY, INCOME -> NormalBalance.CREDIT;
            default -> NormalBalance.DEBIT;
        };
    }

    /** DTO for journal line creation */
    public record JournalLineRequest(String glCode, BigDecimal debitAmount, BigDecimal creditAmount,
                                       String currencyCode, BigDecimal fxRate, String narration,
                                       String costCentre, String branchCode, Long accountId, Long customerId) {}
}
