package com.cbs.card.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.card.entity.*;
import com.cbs.card.issuer.CardPanIssueCommand;
import com.cbs.card.issuer.CardPanIssueResult;
import com.cbs.card.issuer.CardPanIssuer;
import com.cbs.card.repository.*;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.payments.entity.FxRate;
import com.cbs.payments.repository.FxRateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CardService {

    private final CardRepository cardRepository;
    private final CardTransactionRepository txnRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;
    private final CbsProperties cbsProperties;
    private final IslamicCardAuthorizationService islamicCardAuthorizationService;
    private final FxRateRepository fxRateRepository;
    private final CardPanIssuer cardPanIssuer;

    @org.springframework.beans.factory.annotation.Value("${card.pan.hmac-key:ch4ng3-th1s-d3f4ult-k3y-in-pr0duct10n}")
    private String panHmacKey;

    @Transactional
    public Card issueCard(Long accountId, CardType cardType, CardScheme cardScheme,
                  String cardTier, String cardholderName, LocalDate expiryDate,
                  BigDecimal dailyPosLimit, BigDecimal dailyAtmLimit,
                  BigDecimal dailyOnlineLimit, BigDecimal singleTxnLimit,
                  BigDecimal creditLimit) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));
        return issueCard(account, cardType, cardScheme, cardTier, cardholderName, expiryDate,
                dailyPosLimit, dailyAtmLimit, dailyOnlineLimit, singleTxnLimit,
                creditLimit, null, CardStatus.ACTIVE);
    }

    @Transactional
    public Card issueCard(Long accountId, CardType cardType, CardScheme cardScheme,
                  String cardTier, String cardholderName, LocalDate expiryDate,
                  BigDecimal dailyPosLimit, BigDecimal dailyAtmLimit,
                  BigDecimal dailyOnlineLimit, BigDecimal singleTxnLimit,
                  BigDecimal creditLimit, String branchCode, CardStatus initialStatus) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));
        return issueCard(account, cardType, cardScheme, cardTier, cardholderName, expiryDate,
                dailyPosLimit, dailyAtmLimit, dailyOnlineLimit, singleTxnLimit,
                creditLimit, branchCode, initialStatus);
    }

    @Transactional
    public Card issueCard(Account account, CardType cardType, CardScheme cardScheme,
                  String cardTier, String cardholderName, LocalDate expiryDate,
                  BigDecimal dailyPosLimit, BigDecimal dailyAtmLimit,
                  BigDecimal dailyOnlineLimit, BigDecimal singleTxnLimit,
                  BigDecimal creditLimit, String branchCode, CardStatus initialStatus) {
        String cardRef = "CRD-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
        LocalDate resolvedExpiryDate = expiryDate != null ? expiryDate : LocalDate.now().plusYears(3);
        CardPanIssueResult issuedPan = cardPanIssuer.issuePan(new CardPanIssueCommand(
            cardRef,
            account.getId(),
            account.getCustomer() != null ? account.getCustomer().getId() : null,
            cardType,
            cardScheme,
            cardTier != null ? cardTier : "CLASSIC",
            cardholderName,
            StringUtils.hasText(branchCode) ? branchCode : account.getBranchCode(),
            account.getCurrencyCode(),
            resolvedExpiryDate
        ));
        String pan = issuedPan.pan();
        String masked = maskPan(pan);
        String hash = hashPan(pan);

        Card card = Card.builder()
                .cardNumberHash(hash).cardNumberMasked(masked).cardReference(cardRef)
                .account(account).customer(account.getCustomer())
                .cardType(cardType).cardScheme(cardScheme)
                .cardTier(cardTier != null ? cardTier : "CLASSIC")
                .cardholderName(cardholderName)
                .expiryDate(resolvedExpiryDate)
                .dailyPosLimit(dailyPosLimit).dailyAtmLimit(dailyAtmLimit)
                .dailyOnlineLimit(dailyOnlineLimit).singleTxnLimit(singleTxnLimit)
                .currencyCode(account.getCurrencyCode())
                .branchCode(StringUtils.hasText(branchCode) ? branchCode : account.getBranchCode())
                .status(initialStatus != null ? initialStatus : CardStatus.ACTIVE).build();

        if (cardType == CardType.CREDIT && creditLimit != null) {
            card.setCreditLimit(creditLimit);
            card.setAvailableCredit(creditLimit);
        }

        Card saved = cardRepository.save(card);
    log.info("Card issued: ref={}, type={}, scheme={}, account={}, panProvider={}, issuerRef={}",
        cardRef, cardType, cardScheme, account.getAccountNumber(), issuedPan.providerName(), issuedPan.providerReference());
        return saved;
    }

    public Card getCard(Long id) {
        return cardRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Card", "id", id));
    }

    public Page<Card> getCustomerCards(Long customerId, Pageable pageable) {
        return cardRepository.findByCustomerId(customerId, pageable);
    }

    @Transactional
    public Card activateCard(Long cardId) {
        Card card = getCard(cardId);
        if (card.getStatus() != CardStatus.PENDING_ACTIVATION && card.getStatus() != CardStatus.BLOCKED) {
            throw new BusinessException("Card must be pending activation or blocked to activate", "CARD_NOT_ACTIVATABLE");
        }
        card.setStatus(CardStatus.ACTIVE);
        card.setBlockReason(null);
        return cardRepository.save(card);
    }

    @Transactional
    public Card blockCard(Long cardId, String reason) {
        Card card = getCard(cardId);
        card.setStatus(CardStatus.BLOCKED);
        card.setBlockReason(reason);
        return cardRepository.save(card);
    }

    @Transactional
    public Card hotlistCard(Long cardId, String reason) {
        Card card = getCard(cardId);
        CardStatus newStatus = reason != null && reason.toLowerCase().contains("stolen") ?
                CardStatus.STOLEN : reason != null && reason.toLowerCase().contains("lost") ?
                CardStatus.LOST : CardStatus.HOT_LISTED;
        card.setStatus(newStatus);
        card.setBlockReason(reason);
        return cardRepository.save(card);
    }

    @Transactional
    public Card updateControls(Long cardId, Boolean contactless, Boolean online,
                                 Boolean international, Boolean atm, Boolean pos) {
        Card card = getCard(cardId);
        if (contactless != null) card.setIsContactlessEnabled(contactless);
        if (online != null) card.setIsOnlineEnabled(online);
        if (international != null) card.setIsInternationalEnabled(international);
        if (atm != null) card.setIsAtmEnabled(atm);
        if (pos != null) card.setIsPosEnabled(pos);
        return cardRepository.save(card);
    }

    // ========================================================================
    // TRANSACTION AUTHORIZATION (Cap 37-38)
    // ========================================================================

    @Transactional
    public CardTransaction authorizeTransaction(Long cardId, String transactionType, String channel,
                                                  BigDecimal amount, String currencyCode,
                                                  String merchantName, String merchantId, String mcc,
                                                  String terminalId, String merchantCity, String merchantCountry) {
        Card card = cardRepository.findByIdWithDetails(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card", "id", cardId));
        Account account = card.getAccount();

        boolean international = merchantCountry != null && !merchantCountry.isEmpty();
        String txnRef = "CTX-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
        String txnCurrency = normalizeCurrencyCode(currencyCode, card.getCurrencyCode());

        CardTransaction txn = CardTransaction.builder()
                .transactionRef(txnRef).card(card).account(card.getAccount())
                .transactionType(transactionType).channel(channel)
                .amount(amount).currencyCode(txnCurrency)
                .merchantName(merchantName).merchantId(merchantId)
                .merchantCategoryCode(mcc).terminalId(terminalId)
                .merchantCity(merchantCity).merchantCountry(merchantCountry)
                .isInternational(international).build();

        BillingContext billing;
        try {
            billing = resolveBillingContext(account, amount, txnCurrency);
            txn.setBillingAmount(billing.billingAmount());
            txn.setBillingCurrency(billing.billingCurrency());
            txn.setFxRate(billing.fxRate());
        } catch (BusinessException ex) {
            txn.setStatus("DECLINED");
            txn.setDeclineReason(ex.getMessage());
            txn.setResponseCode("91");
            txnRepository.save(txn);
            return txn;
        }

        // Validation checks
        if (!card.canTransact(channel, international)) {
            txn.setStatus("DECLINED");
            txn.setDeclineReason("Card channel/international restriction");
            txn.setResponseCode("05");
            txnRepository.save(txn);
            return txn;
        }

        if (card.getPinRetriesRemaining() <= 0) {
            txn.setStatus("DECLINED");
            txn.setDeclineReason("PIN blocked");
            txn.setResponseCode("75");
            txnRepository.save(txn);
            return txn;
        }

        // Single transaction limit
        if (card.getSingleTxnLimit() != null && billing.billingAmount().compareTo(card.getSingleTxnLimit()) > 0) {
            txn.setStatus("DECLINED");
            txn.setDeclineReason("Exceeds single transaction limit");
            txn.setResponseCode("61");
            txnRepository.save(txn);
            return txn;
        }

        // Channel daily limit
        BigDecimal channelLimit = card.getChannelLimit(channel);
        if (channelLimit != null) {
            Instant startOfDay = LocalDate.now().atStartOfDay(ZoneOffset.UTC).toInstant();
            BigDecimal dailyUsed = txnRepository.sumDailyUsageByChannel(cardId, channel, startOfDay);
            if (dailyUsed.add(billing.billingAmount()).compareTo(channelLimit) > 0) {
                txn.setStatus("DECLINED");
                txn.setDeclineReason("Exceeds daily " + channel + " limit");
                txn.setResponseCode("61");
                txnRepository.save(txn);
                return txn;
            }
        }

        IslamicCardAuthorizationDecision islamicDecision = islamicCardAuthorizationService.evaluate(card, txn);
        applyIslamicDecision(txn, islamicDecision);
        if (!islamicDecision.allowed()) {
            txn.setStatus("DECLINED");
            txn.setDeclineReason(islamicDecision.shariahReason());
            txn.setResponseCode(islamicDecision.responseCode());
            txnRepository.save(txn);
            return txn;
        }

        // Balance check
        if (card.getCardType() == CardType.DEBIT || card.getCardType() == CardType.PREPAID) {
            if (account.getAvailableBalance().compareTo(billing.billingAmount()) < 0) {
                txn.setStatus("DECLINED");
                txn.setDeclineReason("Insufficient funds");
                txn.setResponseCode("51");
                txnRepository.save(txn);
                return txn;
            }
            accountPostingService.postDebitAgainstGl(
                    account,
                    TransactionType.DEBIT,
                    billing.billingAmount(),
                    "Card authorization " + txnRef,
                    resolveChannel(channel),
                    txnRef,
                    resolveCardSettlementGlCode(islamicDecision),
                    "CARDS",
                    txnRef
            );
        } else if (card.getCardType() == CardType.CREDIT) {
            if (card.getAvailableCredit() == null || card.getAvailableCredit().compareTo(billing.billingAmount()) < 0) {
                txn.setStatus("DECLINED");
                txn.setDeclineReason("Credit limit exceeded");
                txn.setResponseCode("51");
                txnRepository.save(txn);
                return txn;
            }
            card.setAvailableCredit(card.getAvailableCredit().subtract(billing.billingAmount()));
            card.setOutstandingBalance(card.getOutstandingBalance().add(billing.billingAmount()));
        }

        // Authorize
        txn.setStatus("AUTHORIZED");
        java.security.SecureRandom secureRandom = new java.security.SecureRandom();
        txn.setAuthCode(String.format("%06d", secureRandom.nextInt(1000000)));
        txn.setResponseCode("00");
        card.setLastUsedDate(LocalDate.now());

        cardRepository.save(card);
        txn = txnRepository.save(txn);
        islamicCardAuthorizationService.afterAuthorization(txn);

        log.info("Card txn authorized: ref={}, card={}, channel={}, amount={}, merchant={}",
                txnRef, card.getCardReference(), channel, amount, merchantName);
        return txn;
    }

    @Transactional
    public CardTransaction refundTransaction(Long originalTxnId, BigDecimal amount, String reason) {
        return createAdjustment(originalTxnId, amount, reason, "REFUND", "REFUND");
    }

    @Transactional
    public CardTransaction reverseTransaction(Long originalTxnId, BigDecimal amount, String reason) {
        return createAdjustment(originalTxnId, amount, reason, "REVERSAL", "REVERSAL");
    }

    @Transactional
    public CardTransaction disputeTransaction(Long txnId, String reason) {
        CardTransaction txn = txnRepository.findById(txnId)
                .orElseThrow(() -> new ResourceNotFoundException("CardTransaction", "id", txnId));
        txn.setIsDisputed(true);
        txn.setDisputeReason(reason);
        txn.setDisputeDate(LocalDate.now());
        txn.setStatus("DISPUTED");
        return txnRepository.save(txn);
    }

    public Page<CardTransaction> getCardTransactions(Long cardId, Pageable pageable) {
        return txnRepository.findByCardIdOrderByTransactionDateDesc(cardId, pageable);
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private String maskPan(String pan) {
        return pan.substring(0, 6) + "******" + pan.substring(pan.length() - 4);
    }

    private String hashPan(String pan) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(panHmacKey.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] hash = mac.doFinal(pan.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("PAN hashing failed", e);
        }
    }

    private TransactionChannel resolveChannel(String channel) {
        if (!StringUtils.hasText(channel)) {
            return TransactionChannel.SYSTEM;
        }
        try {
            return TransactionChannel.valueOf(channel.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return TransactionChannel.SYSTEM;
        }
    }

    private String resolveCardSettlementGlCode(IslamicCardAuthorizationDecision islamicDecision) {
        if (islamicDecision != null && StringUtils.hasText(islamicDecision.settlementGlCode())) {
            return islamicDecision.settlementGlCode();
        }
        String glCode = cbsProperties.getLedger().getExternalClearingGlCode();
        if (!StringUtils.hasText(glCode)) {
            throw new BusinessException("CBS_LEDGER_EXTERNAL_CLEARING_GL is required for card postings",
                    "MISSING_CARD_SETTLEMENT_GL");
        }
        return glCode;
    }

    private void applyIslamicDecision(CardTransaction txn, IslamicCardAuthorizationDecision decision) {
        if (decision == null || !decision.applicable()) {
            return;
        }
        txn.setIslamicCardId(decision.islamicCardId());
        txn.setShariahScreeningRef(decision.shariahScreeningRef());
        txn.setShariahDecision(decision.shariahDecision());
        txn.setShariahReason(decision.shariahReason());
    }

    private CardTransaction createAdjustment(Long originalTxnId,
                                             BigDecimal requestedAmount,
                                             String reason,
                                             String adjustmentType,
                                             String lifecycleEvent) {
        CardTransaction original = txnRepository.findById(originalTxnId)
                .orElseThrow(() -> new ResourceNotFoundException("CardTransaction", "id", originalTxnId));
        validateAdjustmentEligibility(original, adjustmentType);

        BigDecimal remainingBillingAmount = calculateRemainingAdjustableAmount(original);
        BigDecimal adjustmentBillingAmount = resolveAdjustmentAmount(requestedAmount, remainingBillingAmount);
        AdjustmentAmounts adjustmentAmounts = deriveAdjustmentAmounts(original, adjustmentBillingAmount);
        Card card = original.getCard();
        String adjustmentRef = nextAdjustmentRef(adjustmentType);

        if (isDebitLikeCard(card)) {
            accountPostingService.postCreditAgainstGl(
                    original.getAccount(),
                    TransactionType.ADJUSTMENT,
                    adjustmentAmounts.billingAmount(),
                    buildAdjustmentNarration(adjustmentType, original, reason),
                    TransactionChannel.SYSTEM,
                adjustmentRef,
                    resolveCardSettlementGlCode(original),
                    "CARDS",
                    original.getTransactionRef()
            );
        } else {
            card.setAvailableCredit(defaultAmount(card.getAvailableCredit()).add(adjustmentAmounts.billingAmount()));
            card.setOutstandingBalance(defaultAmount(card.getOutstandingBalance()).subtract(adjustmentAmounts.billingAmount()));
            cardRepository.save(card);
        }

        CardTransaction adjustment = CardTransaction.builder()
                .transactionRef(adjustmentRef)
                .card(card)
                .account(original.getAccount())
                .transactionType(adjustmentType)
                .channel("SYSTEM")
                .amount(adjustmentAmounts.transactionAmount())
                .currencyCode(adjustmentAmounts.transactionCurrency())
                .billingAmount(adjustmentAmounts.billingAmount())
                .billingCurrency(adjustmentAmounts.billingCurrency())
                .fxRate(adjustmentAmounts.fxRate())
                .originalTransaction(original)
                .originalTransactionRef(original.getTransactionRef())
                .adjustmentReason(normalizeReason(reason, adjustmentType))
                .merchantName(original.getMerchantName())
                .merchantId(original.getMerchantId())
                .merchantCategoryCode(original.getMerchantCategoryCode())
                .terminalId(original.getTerminalId())
                .merchantCity(original.getMerchantCity())
                .merchantCountry(original.getMerchantCountry())
                .isInternational(original.getIsInternational())
                .responseCode("00")
                .status("SETTLED")
                .settlementDate(LocalDate.now())
                .transactionDate(Instant.now())
                .build();
        copyIslamicContext(original, adjustment);
        CardTransaction saved = txnRepository.save(adjustment);

        updateOriginalStatusAfterAdjustment(original, adjustmentType, remainingBillingAmount.subtract(adjustmentBillingAmount));
        if (original.getIslamicCardId() != null) {
            islamicCardAuthorizationService.afterLifecyclePosting(original.getIslamicCardId(), lifecycleEvent);
        }

        log.info("Card txn adjusted: type={}, originalRef={}, adjustmentRef={}, billingAmount={}",
                adjustmentType, original.getTransactionRef(), adjustmentRef, adjustmentBillingAmount);
        return saved;
    }

    private BillingContext resolveBillingContext(Account account, BigDecimal amount, String transactionCurrency) {
        String accountCurrency = normalizeCurrencyCode(account.getCurrencyCode(), transactionCurrency);
        BigDecimal normalizedAmount = amount.setScale(2, RoundingMode.HALF_UP);
        if (accountCurrency.equals(transactionCurrency)) {
            return new BillingContext(normalizedAmount, accountCurrency, BigDecimal.ONE.setScale(8, RoundingMode.HALF_UP));
        }

        FxRate rate = fxRateRepository.findLatestRate(transactionCurrency, accountCurrency).stream().findFirst()
                .orElseThrow(() -> new BusinessException(
                        "No FX rate configured for " + transactionCurrency + "/" + accountCurrency,
                        "CARD_FX_RATE_MISSING"
                ));
        BigDecimal appliedRate = resolveAppliedRate(rate);
        BigDecimal billingAmount = normalizedAmount.multiply(appliedRate).setScale(2, RoundingMode.HALF_UP);
        return new BillingContext(billingAmount, accountCurrency, appliedRate);
    }

    private BigDecimal resolveAppliedRate(FxRate rate) {
        if (rate.getSellRate() != null && rate.getSellRate().compareTo(BigDecimal.ZERO) > 0) {
            return rate.getSellRate();
        }
        if (rate.getMidRate() != null && rate.getMidRate().compareTo(BigDecimal.ZERO) > 0) {
            return rate.getMidRate();
        }
        if (rate.getBuyRate() != null && rate.getBuyRate().compareTo(BigDecimal.ZERO) > 0) {
            return rate.getBuyRate();
        }
        throw new BusinessException("Configured FX rate does not contain a usable price", "CARD_FX_RATE_INVALID");
    }

    private String normalizeCurrencyCode(String currencyCode, String fallbackCurrency) {
        String value = StringUtils.hasText(currencyCode) ? currencyCode : fallbackCurrency;
        if (!StringUtils.hasText(value)) {
            throw new BusinessException("Transaction currency is required for card authorization", "CARD_CURRENCY_REQUIRED");
        }
        return value.trim().toUpperCase();
    }

    private void validateAdjustmentEligibility(CardTransaction original, String adjustmentType) {
        if (original.getOriginalTransaction() != null
                || "REFUND".equalsIgnoreCase(original.getTransactionType())
                || "REVERSAL".equalsIgnoreCase(original.getTransactionType())) {
            throw new BusinessException("Only original purchase or cash transactions can be adjusted", "CARD_ADJUSTMENT_INVALID_TARGET");
        }
        if (!StringUtils.hasText(original.getStatus())
                || "DECLINED".equalsIgnoreCase(original.getStatus())
                || "DISPUTED".equalsIgnoreCase(original.getStatus())) {
            throw new BusinessException("Card transaction is not eligible for " + adjustmentType.toLowerCase(), "CARD_ADJUSTMENT_NOT_ALLOWED");
        }
        if (effectiveBillingAmount(original).compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Card transaction has no billable amount to adjust", "CARD_ADJUSTMENT_AMOUNT_INVALID");
        }
    }

    private BigDecimal calculateRemainingAdjustableAmount(CardTransaction original) {
        BigDecimal originalBillingAmount = effectiveBillingAmount(original);
        BigDecimal appliedAdjustments = txnRepository.sumSettledAdjustmentsForOriginal(original.getId());
        BigDecimal remaining = originalBillingAmount.subtract(defaultAmount(appliedAdjustments)).setScale(2, RoundingMode.HALF_UP);
        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Card transaction has already been fully adjusted", "CARD_ADJUSTMENT_ALREADY_APPLIED");
        }
        return remaining;
    }

    private BigDecimal resolveAdjustmentAmount(BigDecimal requestedAmount, BigDecimal remainingBillingAmount) {
        if (requestedAmount == null) {
            return remainingBillingAmount;
        }
        BigDecimal normalized = requestedAmount.setScale(2, RoundingMode.HALF_UP);
        if (normalized.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Adjustment amount must be greater than zero", "CARD_ADJUSTMENT_AMOUNT_INVALID");
        }
        if (normalized.compareTo(remainingBillingAmount) > 0) {
            throw new BusinessException("Adjustment amount exceeds remaining reversible or refundable amount", "CARD_ADJUSTMENT_AMOUNT_EXCEEDED");
        }
        return normalized;
    }

    private AdjustmentAmounts deriveAdjustmentAmounts(CardTransaction original, BigDecimal billingAmount) {
        BigDecimal originalBillingAmount = effectiveBillingAmount(original);
        String billingCurrency = normalizeCurrencyCode(original.getBillingCurrency(), original.getCurrencyCode());
        String transactionCurrency = normalizeCurrencyCode(original.getCurrencyCode(), billingCurrency);
        BigDecimal fxRate = defaultFxRate(original.getFxRate());
        BigDecimal transactionAmount;
        if (billingCurrency.equals(transactionCurrency)) {
            transactionAmount = billingAmount;
        } else {
            transactionAmount = original.getAmount()
                    .multiply(billingAmount)
                    .divide(originalBillingAmount, 2, RoundingMode.HALF_UP);
        }
        return new AdjustmentAmounts(transactionAmount, billingAmount, transactionCurrency, billingCurrency, fxRate);
    }

    private void updateOriginalStatusAfterAdjustment(CardTransaction original, String adjustmentType, BigDecimal remainingAmount) {
        original.setStatus(remainingAmount.compareTo(BigDecimal.ZERO) > 0
                ? ("REFUND".equals(adjustmentType) ? "PARTIALLY_REFUNDED" : "PARTIALLY_REVERSED")
                : ("REFUND".equals(adjustmentType) ? "REFUNDED" : "REVERSED"));
        txnRepository.save(original);
    }

    private void copyIslamicContext(CardTransaction source, CardTransaction target) {
        target.setIslamicCardId(source.getIslamicCardId());
        target.setShariahScreeningRef(source.getShariahScreeningRef());
        target.setShariahDecision(source.getShariahDecision());
        target.setShariahReason(source.getShariahReason());
    }

    private String resolveCardSettlementGlCode(CardTransaction txn) {
        if (txn.getIslamicCardId() != null) {
            String islamicGlCode = islamicCardAuthorizationService.resolveSettlementGlCode(txn.getIslamicCardId());
            if (StringUtils.hasText(islamicGlCode)) {
                return islamicGlCode;
            }
        }
        return resolveCardSettlementGlCode(IslamicCardAuthorizationDecision.notApplicable());
    }

    private BigDecimal effectiveBillingAmount(CardTransaction txn) {
        return defaultAmount(txn.getBillingAmount() != null ? txn.getBillingAmount() : txn.getAmount()).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal defaultAmount(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private BigDecimal defaultFxRate(BigDecimal fxRate) {
        BigDecimal rate = fxRate != null ? fxRate : BigDecimal.ONE;
        return rate.setScale(8, RoundingMode.HALF_UP);
    }

    private boolean isDebitLikeCard(Card card) {
        return card.getCardType() == CardType.DEBIT || card.getCardType() == CardType.PREPAID;
    }

    private String buildAdjustmentNarration(String adjustmentType, CardTransaction original, String reason) {
        return adjustmentType + " " + original.getTransactionRef() + " - " + normalizeReason(reason, adjustmentType);
    }

    private String normalizeReason(String reason, String fallback) {
        return StringUtils.hasText(reason) ? reason.trim() : fallback;
    }

    private String nextAdjustmentRef(String prefix) {
        String normalizedPrefix = prefix.length() <= 3 ? prefix : prefix.substring(0, 3);
        return normalizedPrefix.toUpperCase() + "-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
    }

    private record BillingContext(BigDecimal billingAmount, String billingCurrency, BigDecimal fxRate) {}

    private record AdjustmentAmounts(BigDecimal transactionAmount,
                                     BigDecimal billingAmount,
                                     String transactionCurrency,
                                     String billingCurrency,
                                     BigDecimal fxRate) {}
}
