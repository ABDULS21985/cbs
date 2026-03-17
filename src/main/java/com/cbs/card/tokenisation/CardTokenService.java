package com.cbs.card.tokenisation;

import com.cbs.card.entity.Card;
import com.cbs.card.entity.CardStatus;
import com.cbs.card.entity.CardType;
import com.cbs.card.repository.CardRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CardTokenService {

    private final CardTokenRepository tokenRepository;
    private final CardRepository cardRepository;

    private static final int MAX_TOKENS_PER_CARD = 10;

    /**
     * Provisions a token for a digital wallet (Apple Pay, Google Pay, etc.).
     * For VIRTUAL cards, creates an instant-issuance token.
     * For physical cards, links the existing card to a wallet.
     */
    @Transactional
    public CardToken provisionToken(Long cardId, WalletProvider walletProvider,
                                      String deviceName, String deviceId, String deviceType,
                                      String tokenRequestorId) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card", "id", cardId));

        if (card.getStatus() != CardStatus.ACTIVE) {
            throw new BusinessException("Card must be ACTIVE for tokenisation", "CARD_NOT_ACTIVE");
        }

        long activeTokens = tokenRepository.countByCardIdAndStatus(cardId, TokenStatus.ACTIVE);
        if (activeTokens >= MAX_TOKENS_PER_CARD) {
            throw new BusinessException("Maximum tokens per card reached (" + MAX_TOKENS_PER_CARD + ")", "MAX_TOKENS_REACHED");
        }

        // Generate token number (in production: call TSP — Token Service Provider)
        String tokenNumber = generateTokenNumber(walletProvider);
        String tokenHash = hashToken(tokenNumber);
        String tokenSuffix = tokenNumber.substring(tokenNumber.length() - 4);

        String ref = "TKN-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();

        CardToken token = CardToken.builder()
                .tokenRef(ref).cardId(cardId).customerId(card.getCustomer().getId())
                .tokenNumberHash(tokenHash).tokenNumberSuffix(tokenSuffix)
                .tokenRequestorId(tokenRequestorId)
                .walletProvider(walletProvider)
                .deviceName(deviceName).deviceId(deviceId).deviceType(deviceType)
                .status(TokenStatus.ACTIVE)
                .activatedAt(Instant.now())
                .tokenExpiryDate(card.getExpiryDate())
                .build();

        CardToken saved = tokenRepository.save(token);
        log.info("Token provisioned: ref={}, card={}, wallet={}, device={}",
                ref, card.getCardReference(), walletProvider, deviceName);
        return saved;
    }

    /**
     * Instant virtual card issuance — creates a card + token in one step.
     * Used for e-commerce and immediate wallet provisioning.
     */
    @Transactional
    public CardToken issueVirtualCardWithToken(Long accountId, WalletProvider walletProvider,
                                                 String cardholderName, String deviceName,
                                                 String deviceId) {
        // Issue virtual card first
        Card virtualCard = Card.builder()
                .cardNumberHash(hashToken(UUID.randomUUID().toString()))
                .cardNumberMasked("****" + String.format("%04d", (int)(Math.random() * 9999)))
                .cardReference("VCR-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase())
                .cardType(CardType.VIRTUAL)
                .cardholderName(cardholderName)
                .expiryDate(LocalDate.now().plusYears(3))
                .status(CardStatus.ACTIVE)
                .build();

        // Account and customer set via accountId lookup would happen here
        // Simplified — in production, CardService.issueCard() would be called

        // Then provision token
        return provisionToken(virtualCard.getId(), walletProvider, deviceName, deviceId, "PHONE", null);
    }

    @Transactional
    public CardToken suspendToken(Long tokenId, String reason) {
        CardToken token = findTokenOrThrow(tokenId);
        if (token.getStatus() != TokenStatus.ACTIVE) {
            throw new BusinessException("Token is not active", "TOKEN_NOT_ACTIVE");
        }
        token.setStatus(TokenStatus.SUSPENDED);
        token.setSuspendedAt(Instant.now());
        token.setSuspendReason(reason);
        token.setUpdatedAt(Instant.now());
        log.info("Token suspended: ref={}, reason={}", token.getTokenRef(), reason);
        return tokenRepository.save(token);
    }

    @Transactional
    public CardToken resumeToken(Long tokenId) {
        CardToken token = findTokenOrThrow(tokenId);
        if (token.getStatus() != TokenStatus.SUSPENDED) {
            throw new BusinessException("Token is not suspended", "TOKEN_NOT_SUSPENDED");
        }
        token.setStatus(TokenStatus.ACTIVE);
        token.setSuspendReason(null);
        token.setUpdatedAt(Instant.now());
        log.info("Token resumed: ref={}", token.getTokenRef());
        return tokenRepository.save(token);
    }

    @Transactional
    public CardToken deactivateToken(Long tokenId, String reason) {
        CardToken token = findTokenOrThrow(tokenId);
        token.setStatus(TokenStatus.DEACTIVATED);
        token.setDeactivatedAt(Instant.now());
        token.setDeactivationReason(reason);
        token.setUpdatedAt(Instant.now());
        log.info("Token deactivated: ref={}, reason={}", token.getTokenRef(), reason);
        return tokenRepository.save(token);
    }

    /**
     * When a card is hot-listed (lost/stolen), deactivate all its tokens.
     */
    @Transactional
    public int deactivateAllTokensForCard(Long cardId, String reason) {
        List<CardToken> activeTokens = tokenRepository.findByCardIdAndStatus(cardId, TokenStatus.ACTIVE);
        List<CardToken> suspendedTokens = tokenRepository.findByCardIdAndStatus(cardId, TokenStatus.SUSPENDED);

        int count = 0;
        for (CardToken token : activeTokens) {
            token.setStatus(TokenStatus.DEACTIVATED);
            token.setDeactivatedAt(Instant.now());
            token.setDeactivationReason(reason);
            tokenRepository.save(token);
            count++;
        }
        for (CardToken token : suspendedTokens) {
            token.setStatus(TokenStatus.DEACTIVATED);
            token.setDeactivatedAt(Instant.now());
            token.setDeactivationReason(reason);
            tokenRepository.save(token);
            count++;
        }

        log.info("Deactivated {} tokens for card {}: {}", count, cardId, reason);
        return count;
    }

    public List<CardToken> getCardTokens(Long cardId) { return tokenRepository.findByCardIdOrderByCreatedAtDesc(cardId); }
    public List<CardToken> getCustomerTokens(Long customerId) { return tokenRepository.findByCustomerIdOrderByCreatedAtDesc(customerId); }

    private CardToken findTokenOrThrow(Long id) {
        return tokenRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("CardToken", "id", id));
    }

    private String generateTokenNumber(WalletProvider provider) {
        String prefix = switch (provider) {
            case APPLE_PAY -> "49";
            case GOOGLE_PAY -> "52";
            case SAMSUNG_PAY -> "53";
            default -> "40";
        };
        StringBuilder sb = new StringBuilder(prefix);
        while (sb.length() < 16) sb.append((int)(Math.random() * 10));
        return sb.toString();
    }

    private String hashToken(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(value.getBytes()));
        } catch (Exception e) { throw new RuntimeException("Token hashing failed", e); }
    }
}
