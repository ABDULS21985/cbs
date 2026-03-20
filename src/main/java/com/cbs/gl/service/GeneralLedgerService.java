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

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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
        coaRepository.findByGlCode(coa.getGlCode()).ifPresent(existing -> {
            throw new BusinessException("GL code already exists: " + coa.getGlCode(), "DUPLICATE_GL");
        });
        return coaRepository.save(coa);
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

    /** DTO for journal line creation */
    public record JournalLineRequest(String glCode, BigDecimal debitAmount, BigDecimal creditAmount,
                                       String currencyCode, BigDecimal fxRate, String narration,
                                       String costCentre, String branchCode, Long accountId, Long customerId) {}
}
