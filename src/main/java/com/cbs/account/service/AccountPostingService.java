package com.cbs.account.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.account.validation.AccountValidator;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.provider.numbering.AccountNumberGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountPostingService {

    private static final DateTimeFormatter TXN_DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final AccountRepository accountRepository;
    private final TransactionJournalRepository transactionRepository;
    private final AccountValidator accountValidator;
    private final AccountNumberGenerator numberGenerator;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public TransactionJournal postDebit(Account account, TransactionType type, BigDecimal amount,
                                        String narration, TransactionChannel channel, String externalRef) {
        validateAmount(amount);
        accountValidator.validateDebit(account, amount);
        account.debit(amount);
        accountRepository.save(account);
        return saveTransaction(account, type, amount, narration, channel, externalRef);
    }

    @Transactional
    public TransactionJournal postCredit(Account account, TransactionType type, BigDecimal amount,
                                         String narration, TransactionChannel channel, String externalRef) {
        validateAmount(amount);
        accountValidator.validateCredit(account, amount);
        account.credit(amount);
        accountRepository.save(account);
        return saveTransaction(account, type, amount, narration, channel, externalRef);
    }

    @Transactional
    public TransferPosting postTransfer(Account debitAccount, Account creditAccount,
                                        BigDecimal debitAmount, BigDecimal creditAmount,
                                        String debitNarration, String creditNarration,
                                        TransactionChannel channel, String externalRefBase) {
        if (debitAccount.getId() != null && debitAccount.getId().equals(creditAccount.getId())) {
            throw new BusinessException("Cannot transfer to the same account", "SAME_ACCOUNT");
        }

        TransactionJournal debitTxn = postDebit(
                debitAccount,
                TransactionType.TRANSFER_OUT,
                debitAmount,
                debitNarration,
                channel,
                externalRef(externalRefBase, "DR"));

        TransactionJournal creditTxn = postCredit(
                creditAccount,
                TransactionType.TRANSFER_IN,
                creditAmount,
                creditNarration,
                channel,
                externalRef(externalRefBase, "CR"));

        debitTxn.setContraAccount(creditAccount);
        debitTxn.setContraAccountNumber(creditAccount.getAccountNumber());
        creditTxn.setContraAccount(debitAccount);
        creditTxn.setContraAccountNumber(debitAccount.getAccountNumber());

        transactionRepository.save(debitTxn);
        transactionRepository.save(creditTxn);

        return new TransferPosting(debitTxn, creditTxn);
    }

    private TransactionJournal saveTransaction(Account account, TransactionType type, BigDecimal amount,
                                               String narration, TransactionChannel channel, String externalRef) {
        if (StringUtils.hasText(externalRef) && transactionRepository.existsByExternalRef(externalRef)) {
            throw new BusinessException("Duplicate transaction reference: " + externalRef, "DUPLICATE_TXN_REF");
        }

        Long seq = transactionRepository.getNextTransactionRefSequence();
        String txnRef = numberGenerator.generateTxnRef(seq, LocalDate.now().format(TXN_DATE_FMT));

        TransactionJournal txn = TransactionJournal.builder()
                .transactionRef(txnRef)
                .account(account)
                .transactionType(type)
                .amount(amount)
                .currencyCode(account.getCurrencyCode())
                .runningBalance(account.getBookBalance())
                .narration(StringUtils.hasText(narration) ? narration : type.name())
                .valueDate(LocalDate.now())
                .postingDate(LocalDate.now())
                .channel(channel != null ? channel : TransactionChannel.SYSTEM)
                .externalRef(externalRef)
                .status("POSTED")
                .createdBy(currentActorProvider.getCurrentActor())
                .build();

        TransactionJournal saved = transactionRepository.save(txn);
        log.debug("Account posted: txnRef={}, account={}, type={}, amount={}, balance={}",
                saved.getTransactionRef(), account.getAccountNumber(), type, amount, account.getBookBalance());
        return saved;
    }

    private String externalRef(String base, String suffix) {
        if (!StringUtils.hasText(base)) {
            return null;
        }
        String value = base + ":" + suffix;
        return value.length() <= 50 ? value : value.substring(0, 50);
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Transaction amount must be greater than zero", "INVALID_TRANSACTION_AMOUNT");
        }
    }

    public record TransferPosting(TransactionJournal debitTransaction, TransactionJournal creditTransaction) {}
}
