package com.cbs.gl.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.dto.CreateGlAccountRequest;
import com.cbs.gl.dto.JournalLineRequest;
import com.cbs.gl.dto.PostJournalRequest;
import com.cbs.gl.entity.*;
import com.cbs.gl.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class GeneralLedgerService {

    private final ChartOfAccountsRepository coaRepository;
    private final JournalEntryRepository journalRepository;
    private final GlBalanceRepository balanceRepository;
    private final SubledgerReconRunRepository reconRepository;
    private final CurrentActorProvider currentActorProvider;

    // ========================================================================
    // JOURNAL POSTING (Core of Cap 68)
    // ========================================================================

    /**
     * Creates and posts a journal entry atomically.
     * Validates: all GL codes exist and are postable, double-entry balances,
     * then updates GL balances for each line.
     */
    @Transactional
    public JournalEntry postJournal(PostJournalRequest request) {
        Long seq = journalRepository.getNextJournalSequence();
        String journalNumber = String.format("JN%013d", seq);
        String createdBy = currentActorProvider.getCurrentActor();

        JournalEntry journal = JournalEntry.builder()
                .journalNumber(journalNumber).journalType(request.journalType())
                .description(request.description()).sourceModule(request.sourceModule()).sourceRef(request.sourceRef())
                .valueDate(request.valueDate() != null ? request.valueDate() : LocalDate.now())
                .postingDate(LocalDate.now()).createdBy(createdBy)
                .status("PENDING").build();

        int lineNum = 1;
        for (JournalLineRequest req : request.lines()) {
            ChartOfAccounts coa = coaRepository.findByGlCode(req.glCode())
                    .orElseThrow(() -> new BusinessException("GL code not found: " + req.glCode(), "INVALID_GL_CODE"));
            if (!Boolean.TRUE.equals(coa.getIsPostable())) {
                throw new BusinessException("GL code is not postable (header account): " + req.glCode(), "GL_NOT_POSTABLE");
            }

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
                    line.getCurrencyCode(), journal.getPostingDate(), line.getLocalDebit(), line.getLocalCredit());
        }

        journal.setStatus("POSTED");
        journal.setPostedAt(Instant.now());
        JournalEntry saved = journalRepository.save(journal);

        log.info("Journal posted: number={}, type={}, debit={}, credit={}, lines={}, source={}/{}",
                journalNumber, request.journalType(), journal.getTotalDebit(), journal.getTotalCredit(),
                journal.getLines().size(), request.sourceModule(), request.sourceRef());
        return saved;
    }

    /**
     * Reverses a posted journal by creating a mirror journal with debits/credits swapped.
     */
    @Transactional
    public JournalEntry reverseJournal(Long journalId) {
        JournalEntry original = journalRepository.findByIdWithLines(journalId)
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

        JournalEntry reversal = postJournal(new PostJournalRequest(
                "REVERSAL",
                "Reversal of " + original.getJournalNumber(),
                original.getSourceModule(),
                original.getSourceRef(),
                LocalDate.now(),
                reversalLines));

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
                                   LocalDate date, BigDecimal debit, BigDecimal credit) {
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

        if (debit.compareTo(BigDecimal.ZERO) > 0) balance.applyDebit(debit);
        if (credit.compareTo(BigDecimal.ZERO) > 0) balance.applyCredit(credit);
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
                                                 BigDecimal subledgerBalance, LocalDate reconDate) {
        GlBalance glBal = balanceRepository
                .findByGlCodeAndBranchCodeAndCurrencyCodeAndBalanceDate(glCode, "HEAD", "USD", reconDate)
                .orElse(GlBalance.builder().closingBalance(BigDecimal.ZERO).build());

        BigDecimal difference = glBal.getClosingBalance().subtract(subledgerBalance).abs();
        boolean isBalanced = difference.compareTo(new BigDecimal("0.01")) < 0;

        SubledgerReconRun recon = SubledgerReconRun.builder()
                .reconDate(reconDate).subledgerType(subledgerType).glCode(glCode)
                .glBalance(glBal.getClosingBalance()).subledgerBalance(subledgerBalance)
                .difference(difference).isBalanced(isBalanced)
                .status(isBalanced ? "COMPLETED" : "EXCEPTIONS").build();

        SubledgerReconRun saved = reconRepository.save(recon);
        if (!isBalanced) {
            log.warn("Sub-ledger mismatch: type={}, gl={}, glBal={}, subBal={}, diff={}",
                    subledgerType, glCode, glBal.getClosingBalance(), subledgerBalance, difference);
        }
        return saved;
    }

    public List<SubledgerReconRun> getReconResults(LocalDate date) {
        return reconRepository.findByReconDateOrderBySubledgerTypeAsc(date);
    }

    // ========================================================================
    // CHART OF ACCOUNTS
    // ========================================================================

    @Transactional
    public ChartOfAccounts createGlAccount(CreateGlAccountRequest request) {
        coaRepository.findByGlCode(request.glCode()).ifPresent(existing -> {
            throw new BusinessException("GL code already exists: " + request.glCode(), "DUPLICATE_GL");
        });
        ChartOfAccounts coa = ChartOfAccounts.builder()
                .glCode(request.glCode())
                .glName(request.glName())
                .glCategory(request.glCategory())
                .glSubCategory(request.glSubCategory())
                .parentGlCode(request.parentGlCode())
                .levelNumber(request.levelNumber() != null ? request.levelNumber() : 1)
                .isHeader(request.isHeader() != null ? request.isHeader() : false)
                .isPostable(request.isPostable() != null ? request.isPostable() : true)
                .currencyCode(request.currencyCode())
                .isMultiCurrency(request.isMultiCurrency() != null ? request.isMultiCurrency() : false)
                .branchCode(request.branchCode())
                .isInterBranch(request.isInterBranch() != null ? request.isInterBranch() : false)
                .normalBalance(request.normalBalance())
                .allowManualPosting(request.allowManualPosting() != null ? request.allowManualPosting() : true)
                .requiresCostCentre(request.requiresCostCentre() != null ? request.requiresCostCentre() : false)
                .isActive(request.isActive() != null ? request.isActive() : true)
                .createdBy(currentActorProvider.getCurrentActor())
                .build();
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
        return journalRepository.findByIdWithLines(id)
                .orElseThrow(() -> new ResourceNotFoundException("JournalEntry", "id", id));
    }

    public Page<JournalEntry> getJournalsByDate(LocalDate from, LocalDate to, Pageable pageable) {
        return journalRepository.findByPostingDateBetweenOrderByPostingDateDesc(from, to, pageable);
    }

}
