package com.cbs.account.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.CurrencyWallet;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.CurrencyWalletRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.payments.entity.FxRate;
import com.cbs.payments.repository.FxRateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MultiCurrencyService {

    private final CurrencyWalletRepository walletRepository;
    private final AccountRepository accountRepository;
    private final FxRateRepository fxRateRepository;

    @Transactional
    public CurrencyWallet addWallet(Long accountId, String currencyCode) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));

        walletRepository.findByAccountIdAndCurrencyCode(accountId, currencyCode)
                .ifPresent(w -> { throw new BusinessException("Wallet already exists for currency: " + currencyCode, "WALLET_EXISTS"); });

        boolean isFirst = walletRepository.findByAccountIdAndStatus(accountId, "ACTIVE").isEmpty();

        CurrencyWallet wallet = CurrencyWallet.builder()
                .account(account).currencyCode(currencyCode)
                .isPrimary(isFirst).status("ACTIVE").build();

        CurrencyWallet saved = walletRepository.save(wallet);
        log.info("Currency wallet added: account={}, currency={}", account.getAccountNumber(), currencyCode);
        return saved;
    }

    public List<CurrencyWallet> getWallets(Long accountId) {
        return walletRepository.findByAccountIdAndStatus(accountId, "ACTIVE");
    }

    @Transactional
    public CurrencyWallet creditWallet(Long accountId, String currencyCode, BigDecimal amount) {
        CurrencyWallet wallet = getOrCreateWallet(accountId, currencyCode);
        wallet.credit(amount);
        return walletRepository.save(wallet);
    }

    @Transactional
    public CurrencyWallet debitWallet(Long accountId, String currencyCode, BigDecimal amount) {
        CurrencyWallet wallet = walletRepository.findByAccountIdAndCurrencyCode(accountId, currencyCode)
                .orElseThrow(() -> new BusinessException("No wallet for currency: " + currencyCode, "NO_WALLET"));

        if (wallet.getAvailableBalance().compareTo(amount) < 0) {
            throw new BusinessException("Insufficient wallet balance", "INSUFFICIENT_WALLET_BALANCE");
        }
        wallet.debit(amount);
        return walletRepository.save(wallet);
    }

    @Transactional
    public BigDecimal convertBetweenWallets(Long accountId, String fromCurrency, String toCurrency, BigDecimal amount) {
        CurrencyWallet fromWallet = walletRepository.findByAccountIdAndCurrencyCode(accountId, fromCurrency)
                .orElseThrow(() -> new BusinessException("No wallet for: " + fromCurrency, "NO_WALLET"));

        if (fromWallet.getAvailableBalance().compareTo(amount) < 0) {
            throw new BusinessException("Insufficient balance in " + fromCurrency + " wallet", "INSUFFICIENT_WALLET_BALANCE");
        }

        FxRate rate = fxRateRepository.findLatestRate(fromCurrency, toCurrency).stream().findFirst()
                .orElseThrow(() -> new BusinessException("No FX rate for " + fromCurrency + "/" + toCurrency, "NO_FX_RATE"));

        BigDecimal converted = amount.multiply(rate.getSellRate()).setScale(2, RoundingMode.HALF_UP);

        fromWallet.debit(amount);
        walletRepository.save(fromWallet);

        CurrencyWallet toWallet = getOrCreateWallet(accountId, toCurrency);
        toWallet.credit(converted);
        walletRepository.save(toWallet);

        log.info("Wallet conversion: account={}, {} {} → {} {}, rate={}",
                accountId, amount, fromCurrency, converted, toCurrency, rate.getSellRate());
        return converted;
    }

    private CurrencyWallet getOrCreateWallet(Long accountId, String currencyCode) {
        return walletRepository.findByAccountIdAndCurrencyCode(accountId, currencyCode)
                .orElseGet(() -> addWallet(accountId, currencyCode));
    }
}
