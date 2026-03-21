package com.cbs.card.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.config.CbsProperties;
import com.cbs.card.entity.*;
import com.cbs.card.repository.*;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.UUID;

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

    @Transactional
    public Card issueCard(Long accountId, CardType cardType, CardScheme cardScheme,
                            String cardTier, String cardholderName, LocalDate expiryDate,
                            BigDecimal dailyPosLimit, BigDecimal dailyAtmLimit,
                            BigDecimal dailyOnlineLimit, BigDecimal singleTxnLimit,
                            BigDecimal creditLimit) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));

        String cardRef = "CRD-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
        // Simulated PAN — production would use HSM
        String pan = generateSimulatedPan(cardScheme);
        String masked = maskPan(pan);
        String hash = hashPan(pan);

        Card card = Card.builder()
                .cardNumberHash(hash).cardNumberMasked(masked).cardReference(cardRef)
                .account(account).customer(account.getCustomer())
                .cardType(cardType).cardScheme(cardScheme)
                .cardTier(cardTier != null ? cardTier : "CLASSIC")
                .cardholderName(cardholderName)
                .expiryDate(expiryDate != null ? expiryDate : LocalDate.now().plusYears(3))
                .dailyPosLimit(dailyPosLimit).dailyAtmLimit(dailyAtmLimit)
                .dailyOnlineLimit(dailyOnlineLimit).singleTxnLimit(singleTxnLimit)
                .currencyCode(account.getCurrencyCode())
                .status(CardStatus.ACTIVE).build();

        if (cardType == CardType.CREDIT && creditLimit != null) {
            card.setCreditLimit(creditLimit);
            card.setAvailableCredit(creditLimit);
        }

        Card saved = cardRepository.save(card);
        log.info("Card issued: ref={}, type={}, scheme={}, account={}", cardRef, cardType, cardScheme, account.getAccountNumber());
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

        boolean international = merchantCountry != null && !merchantCountry.isEmpty();
        String txnRef = "CTX-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();

        CardTransaction txn = CardTransaction.builder()
                .transactionRef(txnRef).card(card).account(card.getAccount())
                .transactionType(transactionType).channel(channel)
                .amount(amount).currencyCode(currencyCode)
                .merchantName(merchantName).merchantId(merchantId)
                .merchantCategoryCode(mcc).terminalId(terminalId)
                .merchantCity(merchantCity).merchantCountry(merchantCountry)
                .isInternational(international).build();

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
        if (card.getSingleTxnLimit() != null && amount.compareTo(card.getSingleTxnLimit()) > 0) {
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
            if (dailyUsed.add(amount).compareTo(channelLimit) > 0) {
                txn.setStatus("DECLINED");
                txn.setDeclineReason("Exceeds daily " + channel + " limit");
                txn.setResponseCode("61");
                txnRepository.save(txn);
                return txn;
            }
        }

        // Balance check
        Account account = card.getAccount();
        if (card.getCardType() == CardType.DEBIT || card.getCardType() == CardType.PREPAID) {
            if (account.getAvailableBalance().compareTo(amount) < 0) {
                txn.setStatus("DECLINED");
                txn.setDeclineReason("Insufficient funds");
                txn.setResponseCode("51");
                txnRepository.save(txn);
                return txn;
            }
            accountPostingService.postDebitAgainstGl(
                    account,
                    TransactionType.DEBIT,
                    amount,
                    "Card authorization " + txnRef,
                    resolveChannel(channel),
                    txnRef,
                    resolveCardSettlementGlCode(),
                    "CARDS",
                    txnRef
            );
        } else if (card.getCardType() == CardType.CREDIT) {
            if (card.getAvailableCredit() == null || card.getAvailableCredit().compareTo(amount) < 0) {
                txn.setStatus("DECLINED");
                txn.setDeclineReason("Credit limit exceeded");
                txn.setResponseCode("51");
                txnRepository.save(txn);
                return txn;
            }
            card.setAvailableCredit(card.getAvailableCredit().subtract(amount));
            card.setOutstandingBalance(card.getOutstandingBalance().add(amount));
        }

        // Authorize
        txn.setStatus("AUTHORIZED");
        java.security.SecureRandom secureRandom = new java.security.SecureRandom();
        txn.setAuthCode(String.format("%06d", secureRandom.nextInt(1000000)));
        txn.setResponseCode("00");
        card.setLastUsedDate(LocalDate.now());

        cardRepository.save(card);
        txnRepository.save(txn);

        log.info("Card txn authorized: ref={}, card={}, channel={}, amount={}, merchant={}",
                txnRef, card.getCardReference(), channel, amount, merchantName);
        return txn;
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

    private String generateSimulatedPan(CardScheme scheme) {
        String prefix = switch (scheme) {
            case VISA -> "4";
            case MASTERCARD -> "52";
            case VERVE -> "650271";
            case AMEX -> "37";
            default -> "9";
        };
        // Fill digits to length 15, then compute Luhn check digit
        StringBuilder sb = new StringBuilder(prefix);
        java.security.SecureRandom rng = new java.security.SecureRandom();
        while (sb.length() < 15) sb.append(rng.nextInt(10));
        // Compute Luhn check digit
        String partial = sb.toString();
        int sum = 0;
        boolean alt = true;
        for (int i = partial.length() - 1; i >= 0; i--) {
            int d = partial.charAt(i) - '0';
            if (alt) { d *= 2; if (d > 9) d -= 9; }
            sum += d;
            alt = !alt;
        }
        int check = (10 - (sum % 10)) % 10;
        sb.append(check);
        return sb.toString();
    }

    private String maskPan(String pan) {
        return pan.substring(0, 6) + "******" + pan.substring(pan.length() - 4);
    }

    private String hashPan(String pan) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(pan.getBytes());
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

    private String resolveCardSettlementGlCode() {
        String glCode = cbsProperties.getLedger().getExternalClearingGlCode();
        if (!StringUtils.hasText(glCode)) {
            throw new BusinessException("CBS_LEDGER_EXTERNAL_CLEARING_GL is required for card postings",
                    "MISSING_CARD_SETTLEMENT_GL");
        }
        return glCode;
    }
}
