package com.cbs.account.service;

import com.cbs.account.dto.*;
import com.cbs.account.entity.Account;
import com.cbs.account.entity.CurrencyWallet;
import com.cbs.account.entity.WalletTransaction;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.CurrencyWalletRepository;
import com.cbs.account.repository.WalletTransactionRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class WalletService {

    private final CurrencyWalletRepository walletRepository;
    private final WalletTransactionRepository walletTxnRepository;
    private final AccountRepository accountRepository;

    // ========================================================================
    // QUERIES
    // ========================================================================

    public List<WalletResponse> getWallets(Long accountId) {
        List<CurrencyWallet> wallets = walletRepository.findByAccountIdAndStatus(accountId, "ACTIVE");
        return wallets.stream().map(this::toResponse).toList();
    }

    public List<WalletTransactionResponse> getTransactions(Long walletId) {
        walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet", "id", walletId));
        return walletTxnRepository.findByWalletIdOrderByCreatedAtDesc(walletId)
                .stream().map(this::toTxnResponse).toList();
    }

    // ========================================================================
    // CREATE WALLET
    // ========================================================================

    @Transactional
    public WalletResponse addWallet(Long accountId, WalletCreateRequest request) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));

        walletRepository.findByAccountIdAndCurrencyCode(accountId, request.getCurrencyCode())
                .ifPresent(w -> {
                    throw new BusinessException(
                            "Wallet for currency " + request.getCurrencyCode() + " already exists on this account",
                            "WALLET_ALREADY_EXISTS");
                });

        boolean hasPrimary = !walletRepository.findByAccountIdAndStatus(accountId, "ACTIVE").isEmpty();

        CurrencyWallet wallet = CurrencyWallet.builder()
                .account(account)
                .currencyCode(request.getCurrencyCode().toUpperCase())
                .isPrimary(!hasPrimary)
                .status("ACTIVE")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        wallet = walletRepository.save(wallet);
        log.info("Wallet created: id={}, account={}, currency={}", wallet.getId(), accountId, request.getCurrencyCode());
        return toResponse(wallet);
    }

    // ========================================================================
    // CREDIT
    // ========================================================================

    @Transactional
    public WalletResponse credit(Long accountId, WalletCreditRequest request) {
        CurrencyWallet wallet = walletRepository.findById(request.getWalletId())
                .orElseThrow(() -> new ResourceNotFoundException("Wallet", "id", request.getWalletId()));

        if (!wallet.getAccount().getId().equals(accountId)) {
            throw new BusinessException("Wallet does not belong to account " + accountId, "WALLET_ACCOUNT_MISMATCH");
        }
        if (!"ACTIVE".equals(wallet.getStatus())) {
            throw new BusinessException("Wallet is not active", "WALLET_NOT_ACTIVE");
        }

        wallet.credit(request.getAmount());
        wallet.setUpdatedAt(Instant.now());
        wallet = walletRepository.save(wallet);

        String narration = request.getNarration() != null ? request.getNarration()
                : "Credit to " + wallet.getCurrencyCode() + " wallet";

        recordTransaction(wallet, "CREDIT", request.getAmount(), narration, null, null);

        log.info("Wallet credited: id={}, amount={}, currency={}", wallet.getId(), request.getAmount(), wallet.getCurrencyCode());
        return toResponse(wallet);
    }

    // ========================================================================
    // DEBIT
    // ========================================================================

    @Transactional
    public WalletResponse debit(Long accountId, WalletDebitRequest request) {
        CurrencyWallet wallet = walletRepository.findById(request.getWalletId())
                .orElseThrow(() -> new ResourceNotFoundException("Wallet", "id", request.getWalletId()));

        if (!wallet.getAccount().getId().equals(accountId)) {
            throw new BusinessException("Wallet does not belong to account " + accountId, "WALLET_ACCOUNT_MISMATCH");
        }
        if (!"ACTIVE".equals(wallet.getStatus())) {
            throw new BusinessException("Wallet is not active", "WALLET_NOT_ACTIVE");
        }
        if (wallet.getAvailableBalance().compareTo(request.getAmount()) < 0) {
            throw new BusinessException(
                    "Insufficient balance. Available: " + wallet.getAvailableBalance() + " " + wallet.getCurrencyCode(),
                    "INSUFFICIENT_BALANCE");
        }

        wallet.debit(request.getAmount());
        wallet.setUpdatedAt(Instant.now());
        wallet = walletRepository.save(wallet);

        String narration = request.getNarration() != null ? request.getNarration()
                : "Debit from " + wallet.getCurrencyCode() + " wallet";

        recordTransaction(wallet, "DEBIT", request.getAmount(), narration, null, null);

        log.info("Wallet debited: id={}, amount={}, currency={}", wallet.getId(), request.getAmount(), wallet.getCurrencyCode());
        return toResponse(wallet);
    }

    // ========================================================================
    // FX CONVERT
    // ========================================================================

    @Transactional
    public BigDecimal convert(Long accountId, WalletConvertRequest request) {
        CurrencyWallet source = walletRepository.findById(request.getSourceWalletId())
                .orElseThrow(() -> new ResourceNotFoundException("Wallet", "id", request.getSourceWalletId()));
        CurrencyWallet target = walletRepository.findById(request.getTargetWalletId())
                .orElseThrow(() -> new ResourceNotFoundException("Wallet", "id", request.getTargetWalletId()));

        if (!source.getAccount().getId().equals(accountId) || !target.getAccount().getId().equals(accountId)) {
            throw new BusinessException("Both wallets must belong to account " + accountId, "WALLET_ACCOUNT_MISMATCH");
        }
        if (source.getId().equals(target.getId())) {
            throw new BusinessException("Source and target wallets cannot be the same", "SAME_WALLET");
        }
        if (!"ACTIVE".equals(source.getStatus()) || !"ACTIVE".equals(target.getStatus())) {
            throw new BusinessException("Both wallets must be active", "WALLET_NOT_ACTIVE");
        }
        if (source.getAvailableBalance().compareTo(request.getAmount()) < 0) {
            throw new BusinessException(
                    "Insufficient balance in source wallet. Available: " + source.getAvailableBalance() + " " + source.getCurrencyCode(),
                    "INSUFFICIENT_BALANCE");
        }

        BigDecimal rate = request.getRate();
        BigDecimal convertedAmount = request.getAmount().multiply(rate).setScale(2, RoundingMode.HALF_UP);

        // Debit source
        source.debit(request.getAmount());
        source.setUpdatedAt(Instant.now());
        walletRepository.save(source);

        // Credit target
        target.credit(convertedAmount);
        target.setUpdatedAt(Instant.now());
        walletRepository.save(target);

        String sellNarration = String.format("FX Sell %s %s -> %s @ %s",
                request.getAmount(), source.getCurrencyCode(), target.getCurrencyCode(), rate);
        String buyNarration = String.format("FX Buy %s %s <- %s @ %s",
                convertedAmount, target.getCurrencyCode(), source.getCurrencyCode(), rate);

        recordTransaction(source, "FX_SELL", request.getAmount(), sellNarration, target, rate);
        recordTransaction(target, "FX_BUY", convertedAmount, buyNarration, source, rate);

        log.info("FX conversion: {} {} -> {} {} @ rate={}, account={}",
                request.getAmount(), source.getCurrencyCode(),
                convertedAmount, target.getCurrencyCode(),
                rate, accountId);

        return convertedAmount;
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private void recordTransaction(CurrencyWallet wallet, String type, BigDecimal amount,
                                     String narration, CurrencyWallet contraWallet, BigDecimal fxRate) {
        WalletTransaction txn = WalletTransaction.builder()
                .wallet(wallet)
                .transactionType(type)
                .amount(amount)
                .balanceAfter(wallet.getBookBalance())
                .narration(narration)
                .reference("WTX-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase())
                .contraWallet(contraWallet)
                .fxRate(fxRate)
                .createdAt(Instant.now())
                .build();
        walletTxnRepository.save(txn);
    }

    private WalletResponse toResponse(CurrencyWallet w) {
        return WalletResponse.builder()
                .id(w.getId())
                .accountId(w.getAccount().getId())
                .currencyCode(w.getCurrencyCode())
                .bookBalance(w.getBookBalance())
                .availableBalance(w.getAvailableBalance())
                .lienAmount(w.getLienAmount())
                .isPrimary(w.getIsPrimary())
                .status(w.getStatus())
                .createdAt(w.getCreatedAt())
                .updatedAt(w.getUpdatedAt())
                .version(w.getVersion())
                .build();
    }

    private WalletTransactionResponse toTxnResponse(WalletTransaction t) {
        return WalletTransactionResponse.builder()
                .id(t.getId())
                .walletId(t.getWallet().getId())
                .type(t.getTransactionType())
                .amount(t.getAmount())
                .balanceAfter(t.getBalanceAfter())
                .narration(t.getNarration())
                .reference(t.getReference())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
