package com.cbs.account.service;

import com.cbs.account.entity.CurrencyWallet;
import com.cbs.account.dto.WalletConvertRequest;
import com.cbs.account.dto.WalletCreateRequest;
import com.cbs.account.dto.WalletCreditRequest;
import com.cbs.account.dto.WalletDebitRequest;
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
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MultiCurrencyService {

    private final CurrencyWalletRepository walletRepository;
    private final FxRateRepository fxRateRepository;
    private final WalletService walletService;

    @Transactional
    public CurrencyWallet addWallet(Long accountId, String currencyCode) {
        walletService.addWallet(accountId, WalletCreateRequest.builder().currencyCode(currencyCode).build());
        return walletRepository.findByAccountIdAndCurrencyCode(accountId, currencyCode)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet", "currencyCode", currencyCode));
    }

    public List<CurrencyWallet> getWallets(Long accountId) {
        return walletRepository.findByAccountIdAndStatus(accountId, "ACTIVE");
    }

    @Transactional
    public CurrencyWallet creditWallet(Long accountId, String currencyCode, BigDecimal amount) {
        CurrencyWallet wallet = getOrCreateWallet(accountId, currencyCode);
        walletService.credit(accountId, WalletCreditRequest.builder()
                .walletId(wallet.getId())
                .amount(amount)
                .narration("Credit to " + wallet.getCurrencyCode() + " wallet")
                .build());
        return walletRepository.findById(wallet.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Wallet", "id", wallet.getId()));
    }

    @Transactional
    public CurrencyWallet debitWallet(Long accountId, String currencyCode, BigDecimal amount) {
        CurrencyWallet wallet = walletRepository.findByAccountIdAndCurrencyCode(accountId, currencyCode)
                .orElseThrow(() -> new BusinessException("No wallet for currency: " + currencyCode, "NO_WALLET"));
        walletService.debit(accountId, WalletDebitRequest.builder()
                .walletId(wallet.getId())
                .amount(amount)
                .narration("Debit from " + wallet.getCurrencyCode() + " wallet")
                .build());
        return walletRepository.findById(wallet.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Wallet", "id", wallet.getId()));
    }

    @Transactional
    public BigDecimal convertBetweenWallets(Long accountId, String fromCurrency, String toCurrency, BigDecimal amount) {
        CurrencyWallet fromWallet = walletRepository.findByAccountIdAndCurrencyCode(accountId, fromCurrency)
                .orElseThrow(() -> new BusinessException("No wallet for: " + fromCurrency, "NO_WALLET"));

        FxRate rate = fxRateRepository.findLatestRate(fromCurrency, toCurrency).stream().findFirst()
                .orElseThrow(() -> new BusinessException("No FX rate for " + fromCurrency + "/" + toCurrency, "NO_FX_RATE"));
        CurrencyWallet toWallet = getOrCreateWallet(accountId, toCurrency);
        BigDecimal converted = walletService.convert(accountId, WalletConvertRequest.builder()
                .sourceWalletId(fromWallet.getId())
                .targetWalletId(toWallet.getId())
                .amount(amount)
                .rate(rate.getSellRate())
                .build());

        log.info("Wallet conversion: account={}, {} {} → {} {}, rate={}",
                accountId, amount, fromCurrency, converted, toCurrency, rate.getSellRate());
        return converted;
    }

    private CurrencyWallet getOrCreateWallet(Long accountId, String currencyCode) {
        return walletRepository.findByAccountIdAndCurrencyCode(accountId, currencyCode)
                .orElseGet(() -> addWallet(accountId, currencyCode));
    }
}
