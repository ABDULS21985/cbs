package com.cbs.cheque.service;

import com.cbs.account.entity.Account;
import com.cbs.account.repository.AccountRepository;
import com.cbs.cheque.entity.*;
import com.cbs.cheque.repository.*;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
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
public class ChequeService {

    private final ChequeBookRepository bookRepository;
    private final ChequeLeafRepository leafRepository;
    private final AccountRepository accountRepository;

    @Transactional
    public ChequeBook issueBook(Long accountId, String seriesPrefix, int startNumber, int totalLeaves) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));

        ChequeBook book = ChequeBook.builder()
                .account(account).customer(account.getCustomer())
                .seriesPrefix(seriesPrefix).startNumber(startNumber)
                .endNumber(startNumber + totalLeaves - 1).totalLeaves(totalLeaves)
                .status("ACTIVE").build();

        ChequeBook saved = bookRepository.save(book);

        // Generate individual leaves
        for (int i = 0; i < totalLeaves; i++) {
            String chequeNumber = seriesPrefix + String.format("%06d", startNumber + i);
            ChequeLeaf leaf = ChequeLeaf.builder()
                    .chequeBook(saved).chequeNumber(chequeNumber)
                    .account(account).currencyCode(account.getCurrencyCode())
                    .status(ChequeStatus.UNUSED).build();
            leafRepository.save(leaf);
        }

        log.info("Cheque book issued: account={}, prefix={}, leaves={}", account.getAccountNumber(), seriesPrefix, totalLeaves);
        return saved;
    }

    @Transactional
    public ChequeLeaf presentCheque(Long accountId, String chequeNumber, BigDecimal amount,
                                      String payeeName, String presentingBankCode) {
        ChequeLeaf leaf = leafRepository.findByAccountIdAndChequeNumber(accountId, chequeNumber)
                .orElseThrow(() -> new ResourceNotFoundException("ChequeLeaf", "chequeNumber", chequeNumber));

        if (leaf.getStatus() == ChequeStatus.STOPPED) {
            throw new BusinessException("Cheque has been stopped: " + leaf.getStopReason(), "CHEQUE_STOPPED");
        }
        if (leaf.getStatus() != ChequeStatus.UNUSED && leaf.getStatus() != ChequeStatus.ISSUED) {
            throw new BusinessException("Cheque is not in a presentable state: " + leaf.getStatus(), "CHEQUE_NOT_PRESENTABLE");
        }
        if (leaf.isStale()) {
            leaf.setStatus(ChequeStatus.STALE);
            leafRepository.save(leaf);
            throw new BusinessException("Cheque is stale (>6 months old)", "CHEQUE_STALE");
        }

        Account account = leaf.getAccount();
        if (account.getAvailableBalance().compareTo(amount) < 0) {
            leaf.setStatus(ChequeStatus.RETURNED);
            leaf.setReturnReason("Insufficient funds");
            leaf.setPresentedDate(LocalDate.now());
            leafRepository.save(leaf);

            ChequeBook book = leaf.getChequeBook();
            book.setUsedLeaves(book.getUsedLeaves() + 1);
            bookRepository.save(book);

            throw new BusinessException("Insufficient funds for cheque clearing", "INSUFFICIENT_FUNDS");
        }

        leaf.setAmount(amount);
        leaf.setPayeeName(payeeName);
        leaf.setPresentedDate(LocalDate.now());
        leaf.setPresentingBankCode(presentingBankCode);
        leaf.setStatus(ChequeStatus.CLEARING);
        leafRepository.save(leaf);

        log.info("Cheque presented: number={}, amount={}, payee={}", chequeNumber, amount, payeeName);
        return leaf;
    }

    @Transactional
    public ChequeLeaf clearCheque(Long leafId) {
        ChequeLeaf leaf = leafRepository.findById(leafId)
                .orElseThrow(() -> new ResourceNotFoundException("ChequeLeaf", "id", leafId));

        if (leaf.getStatus() != ChequeStatus.CLEARING) {
            throw new BusinessException("Cheque is not in clearing", "NOT_IN_CLEARING");
        }

        Account account = leaf.getAccount();
        accountPostingService.postDebit(
                account,
                TransactionType.DEBIT,
                leaf.getAmount(),
                "Cheque clearing " + leaf.getChequeNumber(),
                TransactionChannel.CHEQUE,
                "CHQ:" + leaf.getChequeNumber());

        leaf.setStatus(ChequeStatus.CLEARED);
        leaf.setClearingDate(LocalDate.now());

        ChequeBook book = leaf.getChequeBook();
        book.setUsedLeaves(book.getUsedLeaves() + 1);
        if (book.remainingLeaves() <= 0) book.setStatus("EXHAUSTED");
        bookRepository.save(book);

        log.info("Cheque cleared: number={}, amount={}", leaf.getChequeNumber(), leaf.getAmount());
        return leafRepository.save(leaf);
    }

    @Transactional
    public ChequeLeaf stopCheque(Long accountId, String chequeNumber, String reason, String stoppedBy) {
        ChequeLeaf leaf = leafRepository.findByAccountIdAndChequeNumber(accountId, chequeNumber)
                .orElseThrow(() -> new ResourceNotFoundException("ChequeLeaf", "chequeNumber", chequeNumber));

        if (leaf.getStatus() == ChequeStatus.CLEARED || leaf.getStatus() == ChequeStatus.RETURNED) {
            throw new BusinessException("Cannot stop a cheque that is already " + leaf.getStatus(), "CANNOT_STOP");
        }

        leaf.setStatus(ChequeStatus.STOPPED);
        leaf.setStopReason(reason);
        leaf.setStoppedBy(stoppedBy);
        leaf.setStoppedAt(Instant.now());
        log.info("Cheque stopped: number={}, reason={}", chequeNumber, reason);
        return leafRepository.save(leaf);
    }

    public Page<ChequeLeaf> getAccountCheques(Long accountId, Pageable pageable) {
        return leafRepository.findByAccountIdOrderByChequeNumberAsc(accountId, pageable);
    }

    public List<ChequeBook> getActiveBooks(Long accountId) {
        return bookRepository.findByAccountIdAndStatus(accountId, "ACTIVE");
    }
}
