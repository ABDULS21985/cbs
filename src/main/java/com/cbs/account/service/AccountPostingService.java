package com.cbs.account.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.CurrencyWallet;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.CurrencyWalletRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.account.validation.AccountValidator;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.gl.entity.ChartOfAccounts;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.entity.NormalBalance;
import com.cbs.gl.repository.ChartOfAccountsRepository;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.provider.numbering.AccountNumberGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountPostingService {

    private static final DateTimeFormatter TXN_DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final AccountRepository accountRepository;
    private final CurrencyWalletRepository walletRepository;
    private final TransactionJournalRepository transactionRepository;
    private final AccountValidator accountValidator;
    private final AccountNumberGenerator numberGenerator;
    private final CurrentActorProvider currentActorProvider;
    private final GeneralLedgerService generalLedgerService;
    private final ChartOfAccountsRepository chartOfAccountsRepository;
    private final CbsProperties cbsProperties;

    @Transactional
    public TransactionJournal postDebitAgainstGl(Account account, TransactionType type, BigDecimal amount,
                                                 String narration, TransactionChannel channel, String externalRef,
                                                 String contraGlCode, String sourceModule, String sourceRef) {
        return postSingleAccountMovement(
                account,
                PostingDirection.DEBIT,
                type,
                amount,
                narration,
                channel,
                externalRef,
                List.of(balanceLeg(contraGlCode, EntrySide.CREDIT, amount, account.getCurrencyCode(),
                        BigDecimal.ONE, narration, null, null)),
                sourceModule,
                sourceRef,
                null
        );
    }

    @Transactional
    public TransactionJournal postDebitAgainstGl(Account account, TransactionType type, BigDecimal amount,
                                                 String narration, TransactionChannel channel, String externalRef,
                                                 List<GlPostingLeg> counterpartyLegs,
                                                 String sourceModule, String sourceRef) {
        return postSingleAccountMovement(
                account,
                PostingDirection.DEBIT,
                type,
                amount,
                narration,
                channel,
                externalRef,
                counterpartyLegs,
                sourceModule,
                sourceRef,
                null
        );
    }

    @Transactional
    public TransactionJournal postCreditAgainstGl(Account account, TransactionType type, BigDecimal amount,
                                                  String narration, TransactionChannel channel, String externalRef,
                                                  String contraGlCode, String sourceModule, String sourceRef) {
        return postSingleAccountMovement(
                account,
                PostingDirection.CREDIT,
                type,
                amount,
                narration,
                channel,
                externalRef,
                List.of(balanceLeg(contraGlCode, EntrySide.DEBIT, amount, account.getCurrencyCode(),
                        BigDecimal.ONE, narration, null, null)),
                sourceModule,
                sourceRef,
                null
        );
    }

    @Transactional
    public TransactionJournal postCreditAgainstGl(Account account, TransactionType type, BigDecimal amount,
                                                  String narration, TransactionChannel channel, String externalRef,
                                                  List<GlPostingLeg> counterpartyLegs,
                                                  String sourceModule, String sourceRef) {
        return postSingleAccountMovement(
                account,
                PostingDirection.CREDIT,
                type,
                amount,
                narration,
                channel,
                externalRef,
                counterpartyLegs,
                sourceModule,
                sourceRef,
                null
        );
    }

    @Transactional
    public TransferPosting postTransfer(Account debitAccount, Account creditAccount,
                                        BigDecimal debitAmount, BigDecimal creditAmount,
                                        String debitNarration, String creditNarration,
                                        TransactionChannel channel, String externalRefBase,
                                        String sourceModule, String sourceRef) {
        return postTransfer(
                debitAccount,
                creditAccount,
                debitAmount,
                creditAmount,
                debitNarration,
                creditNarration,
                channel,
                externalRefBase,
                BigDecimal.ONE,
                BigDecimal.ONE,
                sourceModule,
                sourceRef
        );
    }

    @Transactional
    public TransferPosting postTransfer(Account debitAccount, Account creditAccount,
                                        BigDecimal debitAmount, BigDecimal creditAmount,
                                        String debitNarration, String creditNarration,
                                        TransactionChannel channel, String externalRefBase,
                                        BigDecimal debitFxRate, BigDecimal creditFxRate,
                                        String sourceModule, String sourceRef) {
        validateAmount(debitAmount);
        validateAmount(creditAmount);
        if (debitAccount.getId() != null && debitAccount.getId().equals(creditAccount.getId())) {
            throw new BusinessException("Cannot transfer to the same account", "SAME_ACCOUNT");
        }

        accountValidator.validateDebit(debitAccount, debitAmount);
        accountValidator.validateCredit(creditAccount, creditAmount);

        String groupRef = generatePostingGroupRef();
        String resolvedSourceRef = resolveSourceRef(sourceRef, externalRefBase, groupRef);
        TransactionChannel resolvedChannel = channel != null ? channel : TransactionChannel.SYSTEM;

        debitAccount.debit(debitAmount);
        creditAccount.credit(creditAmount);
        accountRepository.save(debitAccount);
        accountRepository.save(creditAccount);

        List<GeneralLedgerService.JournalLineRequest> journalLines = List.of(
                accountControlLine(debitAccount, PostingDirection.DEBIT, debitAmount, debitFxRate,
                        nonBlank(debitNarration, TransactionType.TRANSFER_OUT.name())),
                accountControlLine(creditAccount, PostingDirection.CREDIT, creditAmount, creditFxRate,
                        nonBlank(creditNarration, TransactionType.TRANSFER_IN.name()))
        );
        validateBalanced(journalLines);

        JournalEntry journal = generalLedgerService.postJournal(
                "SYSTEM",
                nonBlank(debitNarration, "Account transfer"),
                sourceModule,
                resolvedSourceRef,
                LocalDate.now(),
                currentActorProvider.getCurrentActor(),
                journalLines
        );

        TransactionJournal debitTxn = saveTransaction(
                debitAccount,
                TransactionType.TRANSFER_OUT,
                debitAmount,
                nonBlank(debitNarration, TransactionType.TRANSFER_OUT.name()),
                resolvedChannel,
                externalRef(externalRefBase, "DR"),
                groupRef,
                journal,
                creditAccount,
                creditAccount.getAccountNumber(),
                null
        );
        TransactionJournal creditTxn = saveTransaction(
                creditAccount,
                TransactionType.TRANSFER_IN,
                creditAmount,
                nonBlank(creditNarration, TransactionType.TRANSFER_IN.name()),
                resolvedChannel,
                externalRef(externalRefBase, "CR"),
                groupRef,
                journal,
                debitAccount,
                debitAccount.getAccountNumber(),
                null
        );

        log.info("Account transfer posted: groupRef={}, debitAccount={}, creditAccount={}, debitAmount={}, creditAmount={}",
                groupRef, debitAccount.getAccountNumber(), creditAccount.getAccountNumber(), debitAmount, creditAmount);
        return new TransferPosting(debitTxn, creditTxn, journal);
    }

    @Transactional
    public WalletPostingResult postWalletDebitAgainstGl(CurrencyWallet wallet, BigDecimal amount,
                                                        String narration, String externalRef,
                                                        String contraGlCode, String sourceModule, String sourceRef) {
        return postSingleWalletMovement(
                wallet,
                PostingDirection.DEBIT,
                amount,
                narration,
                externalRef,
                List.of(new GlPostingLeg(
                        contraGlCode,
                        EntrySide.CREDIT,
                        amount,
                        wallet.getCurrencyCode(),
                        BigDecimal.ONE,
                        narration,
                        walletAccountId(wallet),
                        walletCustomerId(wallet),
                        walletBranchCode(wallet))),
                sourceModule,
                sourceRef
        );
    }

    @Transactional
    public WalletPostingResult postWalletCreditAgainstGl(CurrencyWallet wallet, BigDecimal amount,
                                                         String narration, String externalRef,
                                                         String contraGlCode, String sourceModule, String sourceRef) {
        return postSingleWalletMovement(
                wallet,
                PostingDirection.CREDIT,
                amount,
                narration,
                externalRef,
                List.of(new GlPostingLeg(
                        contraGlCode,
                        EntrySide.DEBIT,
                        amount,
                        wallet.getCurrencyCode(),
                        BigDecimal.ONE,
                        narration,
                        walletAccountId(wallet),
                        walletCustomerId(wallet),
                        walletBranchCode(wallet))),
                sourceModule,
                sourceRef
        );
    }

    @Transactional
    public WalletTransferPosting postWalletTransfer(CurrencyWallet debitWallet, CurrencyWallet creditWallet,
                                                    BigDecimal debitAmount, BigDecimal creditAmount,
                                                    String debitNarration, String creditNarration,
                                                    String externalRefBase,
                                                    BigDecimal debitFxRate, BigDecimal creditFxRate,
                                                    String sourceModule, String sourceRef) {
        validateAmount(debitAmount);
        validateAmount(creditAmount);
        if (debitWallet.getId() != null && debitWallet.getId().equals(creditWallet.getId())) {
            throw new BusinessException("Cannot transfer to the same wallet", "SAME_WALLET");
        }
        if (debitWallet.getAvailableBalance().compareTo(debitAmount) < 0) {
            throw new BusinessException("Insufficient wallet balance", "INSUFFICIENT_WALLET_BALANCE");
        }

        String groupRef = generatePostingGroupRef();
        String resolvedSourceRef = resolveSourceRef(sourceRef, externalRefBase, groupRef);

        debitWallet.debit(debitAmount);
        debitWallet.setUpdatedAt(Instant.now());
        creditWallet.credit(creditAmount);
        creditWallet.setUpdatedAt(Instant.now());
        walletRepository.save(debitWallet);
        walletRepository.save(creditWallet);

        List<GeneralLedgerService.JournalLineRequest> journalLines = List.of(
                walletControlLine(debitWallet, PostingDirection.DEBIT, debitAmount, debitFxRate,
                        nonBlank(debitNarration, "Wallet transfer out")),
                walletControlLine(creditWallet, PostingDirection.CREDIT, creditAmount, creditFxRate,
                        nonBlank(creditNarration, "Wallet transfer in"))
        );
        validateBalanced(journalLines);

        JournalEntry journal = generalLedgerService.postJournal(
                "SYSTEM",
                nonBlank(debitNarration, "Wallet transfer"),
                sourceModule,
                resolvedSourceRef,
                LocalDate.now(),
                currentActorProvider.getCurrentActor(),
                journalLines
        );

        log.info("Wallet transfer posted: groupRef={}, debitWallet={}, creditWallet={}, debitAmount={}, creditAmount={}",
                groupRef, debitWallet.getId(), creditWallet.getId(), debitAmount, creditAmount);
        return new WalletTransferPosting(groupRef, journal, debitWallet.getBookBalance(), creditWallet.getBookBalance());
    }

    @Transactional
    public ReversalResult reverseTransaction(Long transactionId, String reason) {
        TransactionJournal target = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new BusinessException("Transaction not found: " + transactionId, "TRANSACTION_NOT_FOUND"));

        if (target.getReversedTransaction() != null) {
            throw new BusinessException("Reversal entries cannot be reversed from this endpoint", "INVALID_REVERSAL_TARGET");
        }
        if (Boolean.TRUE.equals(target.getIsReversed())) {
            throw new BusinessException("Transaction already reversed", "TRANSACTION_ALREADY_REVERSED");
        }

        String originalGroupRef = StringUtils.hasText(target.getPostingGroupRef())
                ? target.getPostingGroupRef()
                : target.getTransactionRef();
        List<TransactionJournal> originals = transactionRepository.findByPostingGroupRefOrderByCreatedAtAsc(originalGroupRef);
        if (originals.isEmpty()) {
            originals = List.of(target);
        }
        for (TransactionJournal original : originals) {
            if (Boolean.TRUE.equals(original.getIsReversed())) {
                throw new BusinessException("Posting group already reversed", "POSTING_GROUP_ALREADY_REVERSED");
            }
            if (original.getReversedTransaction() != null) {
                throw new BusinessException("Reversal entries cannot be reversed from this endpoint", "INVALID_REVERSAL_TARGET");
            }
        }

        String reversalGroupRef = generatePostingGroupRef();
        Map<Long, JournalEntry> reversedJournals = new LinkedHashMap<>();
        for (TransactionJournal original : originals) {
            JournalEntry originalJournal = original.getJournal();
            if (originalJournal != null && !reversedJournals.containsKey(originalJournal.getId())) {
                JournalEntry reversalJournal = generalLedgerService.reverseJournal(
                        originalJournal.getId(),
                        currentActorProvider.getCurrentActor()
                );
                reversedJournals.put(originalJournal.getId(), reversalJournal);
            }
        }

        List<TransactionJournal> reversalEntries = new ArrayList<>();
        for (TransactionJournal original : originals) {
            Account account = original.getAccount();
            PostingDirection reversalDirection = reversalDirection(original);
            if (reversalDirection == PostingDirection.DEBIT) {
                accountValidator.validateDebit(account, original.getAmount());
                account.debit(original.getAmount());
            } else {
                accountValidator.validateCredit(account, original.getAmount());
                account.credit(original.getAmount());
            }
            accountRepository.save(account);

            original.setIsReversed(true);
            original.setReversalRef(reversalGroupRef);
            transactionRepository.save(original);

            TransactionJournal reversalEntry = saveTransaction(
                    account,
                    TransactionType.REVERSAL,
                    original.getAmount(),
                    buildReversalNarration(original, reason),
                    original.getChannel(),
                    externalRef(original.getTransactionRef(), "REV"),
                    reversalGroupRef,
                    original.getJournal() != null ? reversedJournals.get(original.getJournal().getId()) : null,
                    original.getContraAccount(),
                    original.getContraAccountNumber(),
                    original
            );
            reversalEntries.add(reversalEntry);
        }

        log.info("Transaction group reversed: originalGroupRef={}, reversalGroupRef={}, count={}",
                originalGroupRef, reversalGroupRef, reversalEntries.size());
        return new ReversalResult(reversalGroupRef, reversalEntries);
    }

    public GlPostingLeg balanceLeg(String glCode, EntrySide side, BigDecimal amount, String currencyCode,
                                   BigDecimal fxRate, String narration, Long accountId, Long customerId) {
        if (!StringUtils.hasText(glCode)) {
            throw new BusinessException("Required contra GL code is not configured", "MISSING_CONTRA_GL");
        }
        validateAmount(amount);
        return new GlPostingLeg(glCode, side, amount, currencyCode, defaultFxRate(fxRate),
                narration, accountId, customerId, defaultBranchCode());
    }

    private TransactionJournal postSingleAccountMovement(Account account, PostingDirection direction,
                                                         TransactionType type, BigDecimal amount, String narration,
                                                         TransactionChannel channel, String externalRef,
                                                         List<GlPostingLeg> counterpartyLegs,
                                                         String sourceModule, String sourceRef,
                                                         Account contraAccount) {
        validateAmount(amount);
        if (direction == PostingDirection.DEBIT) {
            accountValidator.validateDebit(account, amount);
            account.debit(amount);
        } else {
            accountValidator.validateCredit(account, amount);
            account.credit(amount);
        }
        accountRepository.save(account);

        String groupRef = generatePostingGroupRef();
        String resolvedSourceRef = resolveSourceRef(sourceRef, externalRef, groupRef);
        TransactionChannel resolvedChannel = channel != null ? channel : TransactionChannel.SYSTEM;

        List<GeneralLedgerService.JournalLineRequest> journalLines = new ArrayList<>();
        journalLines.add(accountControlLine(account, direction, amount, BigDecimal.ONE, nonBlank(narration, type.name())));
        for (GlPostingLeg leg : counterpartyLegs) {
            journalLines.add(toJournalLine(leg));
        }
        validateBalanced(journalLines);

        JournalEntry journal = generalLedgerService.postJournal(
                "SYSTEM",
                nonBlank(narration, type.name()),
                sourceModule,
                resolvedSourceRef,
                LocalDate.now(),
                currentActorProvider.getCurrentActor(),
                journalLines
        );

        return saveTransaction(
                account,
                type,
                amount,
                nonBlank(narration, type.name()),
                resolvedChannel,
                externalRef,
                groupRef,
                journal,
                contraAccount,
                contraAccount != null ? contraAccount.getAccountNumber() : null,
                null
        );
    }

    private WalletPostingResult postSingleWalletMovement(CurrencyWallet wallet, PostingDirection direction,
                                                         BigDecimal amount, String narration, String externalRef,
                                                         List<GlPostingLeg> counterpartyLegs,
                                                         String sourceModule, String sourceRef) {
        validateAmount(amount);
        if (direction == PostingDirection.DEBIT && wallet.getAvailableBalance().compareTo(amount) < 0) {
            throw new BusinessException("Insufficient wallet balance", "INSUFFICIENT_WALLET_BALANCE");
        }

        if (direction == PostingDirection.DEBIT) {
            wallet.debit(amount);
        } else {
            wallet.credit(amount);
        }
        wallet.setUpdatedAt(Instant.now());
        walletRepository.save(wallet);

        String groupRef = generatePostingGroupRef();
        String resolvedSourceRef = resolveSourceRef(sourceRef, externalRef, groupRef);

        List<GeneralLedgerService.JournalLineRequest> journalLines = new ArrayList<>();
        journalLines.add(walletControlLine(wallet, direction, amount, BigDecimal.ONE, nonBlank(narration, "Wallet posting")));
        for (GlPostingLeg leg : counterpartyLegs) {
            journalLines.add(toJournalLine(leg));
        }
        validateBalanced(journalLines);

        JournalEntry journal = generalLedgerService.postJournal(
                "SYSTEM",
                nonBlank(narration, "Wallet posting"),
                sourceModule,
                resolvedSourceRef,
                LocalDate.now(),
                currentActorProvider.getCurrentActor(),
                journalLines
        );

        log.info("Wallet posting posted: groupRef={}, walletId={}, direction={}, amount={}",
                groupRef, wallet.getId(), direction, amount);
        return new WalletPostingResult(groupRef, journal, wallet.getBookBalance());
    }

    private GeneralLedgerService.JournalLineRequest accountControlLine(Account account, PostingDirection direction,
                                                                       BigDecimal amount, BigDecimal fxRate,
                                                                       String narration) {
        String glCode = resolveProductGl(account);
        ChartOfAccounts controlGl = chartOfAccountsRepository.findByGlCode(glCode)
                .orElseThrow(() -> new BusinessException("GL code not found: " + glCode, "INVALID_GL_CODE"));

        BigDecimal debitAmount = BigDecimal.ZERO;
        BigDecimal creditAmount = BigDecimal.ZERO;
        if (postsToDebit(controlGl.getNormalBalance(), direction == PostingDirection.CREDIT)) {
            debitAmount = amount;
        } else {
            creditAmount = amount;
        }

        return new GeneralLedgerService.JournalLineRequest(
                glCode,
                debitAmount,
                creditAmount,
                account.getCurrencyCode(),
                defaultFxRate(fxRate),
                narration,
                null,
                resolveBranchCode(account.getBranchCode()),
                account.getId(),
                account.getCustomer() != null ? account.getCustomer().getId() : null
        );
    }

    private GeneralLedgerService.JournalLineRequest walletControlLine(CurrencyWallet wallet, PostingDirection direction,
                                                                      BigDecimal amount, BigDecimal fxRate,
                                                                      String narration) {
        String glCode = resolveProductGl(wallet.getAccount());
        ChartOfAccounts controlGl = chartOfAccountsRepository.findByGlCode(glCode)
                .orElseThrow(() -> new BusinessException("GL code not found: " + glCode, "INVALID_GL_CODE"));

        BigDecimal debitAmount = BigDecimal.ZERO;
        BigDecimal creditAmount = BigDecimal.ZERO;
        if (postsToDebit(controlGl.getNormalBalance(), direction == PostingDirection.CREDIT)) {
            debitAmount = amount;
        } else {
            creditAmount = amount;
        }

        return new GeneralLedgerService.JournalLineRequest(
                glCode,
                debitAmount,
                creditAmount,
                wallet.getCurrencyCode(),
                defaultFxRate(fxRate),
                narration,
                null,
                walletBranchCode(wallet),
                walletAccountId(wallet),
                walletCustomerId(wallet)
        );
    }

    private GeneralLedgerService.JournalLineRequest toJournalLine(GlPostingLeg leg) {
        return new GeneralLedgerService.JournalLineRequest(
                leg.glCode(),
                leg.side() == EntrySide.DEBIT ? leg.amount() : BigDecimal.ZERO,
                leg.side() == EntrySide.CREDIT ? leg.amount() : BigDecimal.ZERO,
                leg.currencyCode(),
                leg.fxRate(),
                leg.narration(),
                null,
                resolveBranchCode(leg.branchCode()),
                leg.accountId(),
                leg.customerId()
        );
    }

    private void validateBalanced(List<GeneralLedgerService.JournalLineRequest> journalLines) {
        BigDecimal totalDebit = BigDecimal.ZERO;
        BigDecimal totalCredit = BigDecimal.ZERO;
        for (GeneralLedgerService.JournalLineRequest line : journalLines) {
            BigDecimal fxRate = defaultFxRate(line.fxRate());
            totalDebit = totalDebit.add(line.debitAmount().multiply(fxRate));
            totalCredit = totalCredit.add(line.creditAmount().multiply(fxRate));
        }
        if (totalDebit.setScale(2, RoundingMode.HALF_UP)
                .compareTo(totalCredit.setScale(2, RoundingMode.HALF_UP)) != 0) {
            throw new BusinessException("Subledger posting is not GL-balanced", "POSTING_NOT_BALANCED");
        }
    }

    private TransactionJournal saveTransaction(Account account, TransactionType type, BigDecimal amount,
                                               String narration, TransactionChannel channel, String externalRef,
                                               String postingGroupRef, JournalEntry journal,
                                               Account contraAccount, String contraAccountNumber,
                                               TransactionJournal reversedTransaction) {
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
                .narration(narration)
                .valueDate(LocalDate.now())
                .postingDate(LocalDate.now())
                .contraAccount(contraAccount)
                .contraAccountNumber(contraAccountNumber)
                .channel(channel != null ? channel : TransactionChannel.SYSTEM)
                .externalRef(externalRef)
                .status("POSTED")
                .createdBy(currentActorProvider.getCurrentActor())
                .postingGroupRef(postingGroupRef)
                .journal(journal)
                .reversedTransaction(reversedTransaction)
                .build();

        TransactionJournal saved = transactionRepository.save(txn);
        log.debug("Account posting saved: txnRef={}, groupRef={}, account={}, type={}, amount={}, balance={}",
                saved.getTransactionRef(), postingGroupRef, account.getAccountNumber(), type, amount, account.getBookBalance());
        return saved;
    }

    private String resolveProductGl(Account account) {
        if (account.getProduct() == null || !StringUtils.hasText(account.getProduct().getGlAccountCode())) {
            throw new BusinessException("Product GL account code is required for account " + account.getAccountNumber(),
                    "MISSING_PRODUCT_GL");
        }
        return account.getProduct().getGlAccountCode();
    }

    private Long walletAccountId(CurrencyWallet wallet) {
        return wallet.getAccount() != null ? wallet.getAccount().getId() : null;
    }

    private Long walletCustomerId(CurrencyWallet wallet) {
        return wallet.getAccount() != null && wallet.getAccount().getCustomer() != null
                ? wallet.getAccount().getCustomer().getId()
                : null;
    }

    private String walletBranchCode(CurrencyWallet wallet) {
        return wallet.getAccount() != null ? resolveBranchCode(wallet.getAccount().getBranchCode()) : defaultBranchCode();
    }

    private boolean postsToDebit(NormalBalance normalBalance, boolean increase) {
        return increase ? normalBalance == NormalBalance.DEBIT : normalBalance == NormalBalance.CREDIT;
    }

    private PostingDirection reversalDirection(TransactionJournal original) {
        return switch (original.getTransactionType()) {
            case CREDIT, TRANSFER_IN, OPENING_BALANCE, INTEREST_POSTING -> PostingDirection.DEBIT;
            case DEBIT, FEE_DEBIT, TRANSFER_OUT, REVERSAL, ADJUSTMENT, LIEN_PLACEMENT, LIEN_RELEASE -> PostingDirection.CREDIT;
        };
    }

    private String buildReversalNarration(TransactionJournal original, String reason) {
        String suffix = StringUtils.hasText(reason) ? reason : original.getNarration();
        return "REVERSAL: " + suffix;
    }

    private String resolveSourceRef(String sourceRef, String externalRef, String groupRef) {
        if (StringUtils.hasText(sourceRef)) {
            return sourceRef;
        }
        if (StringUtils.hasText(externalRef)) {
            return externalRef;
        }
        return groupRef;
    }

    private String generatePostingGroupRef() {
        return "PG-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    private String externalRef(String base, String suffix) {
        if (!StringUtils.hasText(base)) {
            return null;
        }
        String value = base + ":" + suffix;
        return value.length() <= 50 ? value : value.substring(0, 50);
    }

    private String resolveBranchCode(String branchCode) {
        return StringUtils.hasText(branchCode) ? branchCode : defaultBranchCode();
    }

    private String defaultBranchCode() {
        return StringUtils.hasText(cbsProperties.getLedger().getDefaultBranchCode())
                ? cbsProperties.getLedger().getDefaultBranchCode()
                : "HEAD";
    }

    private BigDecimal defaultFxRate(BigDecimal fxRate) {
        return fxRate != null ? fxRate : BigDecimal.ONE;
    }

    private String nonBlank(String value, String fallback) {
        return StringUtils.hasText(value) ? value : fallback;
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Transaction amount must be greater than zero", "INVALID_TRANSACTION_AMOUNT");
        }
    }

    private enum PostingDirection {
        DEBIT,
        CREDIT
    }

    public enum EntrySide {
        DEBIT,
        CREDIT
    }

    public record GlPostingLeg(String glCode, EntrySide side, BigDecimal amount, String currencyCode,
                               BigDecimal fxRate, String narration, Long accountId, Long customerId,
                               String branchCode) {
    }

    public record TransferPosting(TransactionJournal debitTransaction, TransactionJournal creditTransaction,
                                  JournalEntry journalEntry) {
    }

    public record WalletPostingResult(String postingGroupRef, JournalEntry journalEntry, BigDecimal balanceAfter) {
    }

    public record WalletTransferPosting(String postingGroupRef, JournalEntry journalEntry,
                                        BigDecimal debitBalanceAfter, BigDecimal creditBalanceAfter) {
    }

    public record ReversalResult(String reversalGroupRef, List<TransactionJournal> reversalTransactions) {
    }
}
