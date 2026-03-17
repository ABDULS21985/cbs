package com.cbs.gl.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.dto.CreateGlAccountRequest;
import com.cbs.gl.dto.JournalLineRequest;
import com.cbs.gl.dto.PostJournalRequest;
import com.cbs.gl.entity.ChartOfAccounts;
import com.cbs.gl.entity.GlBalance;
import com.cbs.gl.entity.GlCategory;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.entity.JournalLine;
import com.cbs.gl.entity.SubledgerReconRun;
import com.cbs.gl.repository.ChartOfAccountsRepository;
import com.cbs.gl.repository.GlBalanceRepository;
import com.cbs.gl.repository.JournalEntryRepository;
import com.cbs.gl.repository.SubledgerReconRunRepository;
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

    @Transactional
    public JournalEntry postJournal(PostJournalRequest request) {
        return postJournal(request, currentActorProvider.getCurrentActor());
    }

    private JournalEntry postJournal(PostJournalRequest request, String createdBy) {
        Long seq = journalRepository.getNextJournalSequence();
        String journalNumber = String.format("JN%013d", seq);

        JournalEntry journal = JournalEntry.builder()
                .journalNumber(journalNumber)
                .journalType(request.journalType())
                .description(request.description())
                .sourceModule(request.sourceModule())
                .sourceRef(request.sourceRef())
                .valueDate(request.valueDate() != null ? request.valueDate() : LocalDate.now())
                .postingDate(LocalDate.now())
                .createdBy(createdBy)
                .status("PENDING")
                .build();

        int lineNumber = 1;
        for (JournalLineRequest lineRequest : request.lines()) {
            ChartOfAccounts coa = coaRepository.findByGlCode(lineRequest.glCode())
                    .orElseThrow(() -> new BusinessException("GL code not found: " + lineRequest.glCode(), "INVALID_GL_CODE"));
            if (!Boolean.TRUE.equals(coa.getIsPostable())) {
                throw new BusinessException("GL code is not postable (header account): " + lineRequest.glCode(), "GL_NOT_POSTABLE");
            }

            BigDecimal fxRate = lineRequest.fxRate() != null ? lineRequest.fxRate() : BigDecimal.ONE;
            JournalLine line = JournalLine.builder()
                    .lineNumber(lineNumber++)
                    .glCode(lineRequest.glCode())
                    .debitAmount(lineRequest.debitAmount())
                    .creditAmount(lineRequest.creditAmount())
                    .currencyCode(lineRequest.currencyCode() != null ? lineRequest.currencyCode() : "USD")
                    .localDebit(lineRequest.debitAmount().multiply(fxRate))
                    .localCredit(lineRequest.creditAmount().multiply(fxRate))
                    .fxRate(fxRate)
                    .narration(lineRequest.narration())
                    .costCentre(lineRequest.costCentre())
                    .branchCode(lineRequest.branchCode() != null ? lineRequest.branchCode() : "HEAD")
                    .accountId(lineRequest.accountId())
                    .customerId(lineRequest.customerId())
                    .build();
            journal.addLine(line);
        }

        if (!journal.isBalanced()) {
            throw new BusinessException(String.format("Journal is not balanced: debit=%s, credit=%s",
                    journal.getTotalDebit(), journal.getTotalCredit()), "JOURNAL_NOT_BALANCED");
        }

        for (JournalLine line : journal.getLines()) {
            updateGlBalance(
                    line.getGlCode(),
                    line.getBranchCode() != null ? line.getBranchCode() : "HEAD",
                    line.getCurrencyCode(),
                    journal.getPostingDate(),
                    line.getLocalDebit(),
                    line.getLocalCredit());
        }

        journal.setStatus("POSTED");
        journal.setPostedAt(Instant.now());
        JournalEntry saved = journalRepository.save(journal);

        log.info("Journal posted: number={}, type={}, debit={}, credit={}, lines={}, source={}/{}",
                journalNumber, request.journalType(), journal.getTotalDebit(), journal.getTotalCredit(),
                journal.getLines().size(), request.sourceModule(), request.sourceRef());
        return saved;
    }

    @Transactional
    public JournalEntry reverseJournal(Long journalId) {
        JournalEntry original = journalRepository.findByIdWithLines(journalId)
                .orElseThrow(() -> new ResourceNotFoundException("JournalEntry", "id", journalId));

        if (!"POSTED".equals(original.getStatus())) {
            throw new BusinessException("Only POSTED journals can be reversed", "JOURNAL_NOT_POSTED");
        }

        List<JournalLineRequest> reversalLines = original.getLines().stream()
                .map(line -> new JournalLineRequest(
                        line.getGlCode(),
                        line.getCreditAmount(),
                        line.getDebitAmount(),
                        line.getCurrencyCode(),
                        line.getFxRate(),
                        "Reversal: " + line.getNarration(),
                        line.getCostCentre(),
                        line.getBranchCode(),
                        line.getAccountId(),
                        line.getCustomerId()))
                .toList();

        JournalEntry reversal = postJournal(
                new PostJournalRequest(
                        "REVERSAL",
                        "Reversal of " + original.getJournalNumber(),
                        original.getSourceModule(),
                        original.getSourceRef(),
                        LocalDate.now(),
                        reversalLines),
                currentActorProvider.getCurrentActor());

        original.setStatus("REVERSED");
        original.setReversedAt(Instant.now());
        original.setReversalJournalId(reversal.getId());
        journalRepository.save(original);

        log.info("Journal reversed: original={}, reversal={}", original.getJournalNumber(), reversal.getJournalNumber());
        return reversal;
    }

    private void updateGlBalance(String glCode, String branchCode, String currencyCode,
                                 LocalDate date, BigDecimal debit, BigDecimal credit) {
        GlBalance balance = balanceRepository
                .findByGlCodeAndBranchCodeAndCurrencyCodeAndBalanceDate(glCode, branchCode, currencyCode, date)
                .orElseGet(() -> {
                    BigDecimal opening = balanceRepository
                            .findByGlCodeAndBranchCodeAndCurrencyCodeAndBalanceDate(glCode, branchCode, currencyCode, date.minusDays(1))
                            .map(GlBalance::getClosingBalance)
                            .orElse(BigDecimal.ZERO);

                    return GlBalance.builder()
                            .glCode(glCode)
                            .branchCode(branchCode)
                            .currencyCode(currencyCode)
                            .balanceDate(date)
                            .openingBalance(opening)
                            .closingBalance(opening)
                            .build();
                });

        if (debit.compareTo(BigDecimal.ZERO) > 0) {
            balance.applyDebit(debit);
        }
        if (credit.compareTo(BigDecimal.ZERO) > 0) {
            balance.applyCredit(credit);
        }
        balanceRepository.save(balance);
    }

    public List<GlBalance> getTrialBalance(LocalDate date) {
        return balanceRepository.findByBalanceDateOrderByGlCodeAsc(date);
    }

    public List<GlBalance> getGlHistory(String glCode, LocalDate from, LocalDate to) {
        return balanceRepository.findByGlCodeAndBalanceDateBetweenOrderByBalanceDateAsc(glCode, from, to);
    }

    @Transactional
    public SubledgerReconRun runReconciliation(String subledgerType, String glCode,
                                               BigDecimal subledgerBalance, LocalDate reconDate) {
        GlBalance glBalance = balanceRepository
                .findByGlCodeAndBranchCodeAndCurrencyCodeAndBalanceDate(glCode, "HEAD", "USD", reconDate)
                .orElse(GlBalance.builder().closingBalance(BigDecimal.ZERO).build());

        BigDecimal difference = glBalance.getClosingBalance().subtract(subledgerBalance).abs();
        boolean balanced = difference.compareTo(new BigDecimal("0.01")) < 0;

        SubledgerReconRun recon = SubledgerReconRun.builder()
                .reconDate(reconDate)
                .subledgerType(subledgerType)
                .glCode(glCode)
                .glBalance(glBalance.getClosingBalance())
                .subledgerBalance(subledgerBalance)
                .difference(difference)
                .isBalanced(balanced)
                .status(balanced ? "COMPLETED" : "EXCEPTIONS")
                .build();

        SubledgerReconRun saved = reconRepository.save(recon);
        if (!balanced) {
            log.warn("Sub-ledger mismatch: type={}, gl={}, glBal={}, subBal={}, diff={}",
                    subledgerType, glCode, glBalance.getClosingBalance(), subledgerBalance, difference);
        }
        return saved;
    }

    public List<SubledgerReconRun> getReconResults(LocalDate date) {
        return reconRepository.findByReconDateOrderBySubledgerTypeAsc(date);
    }

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
                .isHeader(Boolean.TRUE.equals(request.isHeader()))
                .isPostable(request.isPostable() != null ? request.isPostable() : !Boolean.TRUE.equals(request.isHeader()))
                .currencyCode(request.currencyCode())
                .isMultiCurrency(Boolean.TRUE.equals(request.isMultiCurrency()))
                .branchCode(request.branchCode())
                .isInterBranch(Boolean.TRUE.equals(request.isInterBranch()))
                .normalBalance(request.normalBalance())
                .allowManualPosting(request.allowManualPosting() == null || request.allowManualPosting())
                .requiresCostCentre(Boolean.TRUE.equals(request.requiresCostCentre()))
                .isActive(request.isActive() == null || request.isActive())
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

    public JournalEntry getJournal(Long id) {
        return journalRepository.findByIdWithLines(id)
                .orElseThrow(() -> new ResourceNotFoundException("JournalEntry", "id", id));
    }

    public Page<JournalEntry> getJournalsByDate(LocalDate from, LocalDate to, Pageable pageable) {
        return journalRepository.findByPostingDateBetweenOrderByPostingDateDesc(from, to, pageable);
    }
}
