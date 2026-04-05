package com.cbs.card.service;

import com.cbs.account.entity.Account;
import com.cbs.card.entity.Card;
import com.cbs.card.entity.CardTransaction;
import com.cbs.card.entity.IslamicCardDetails;
import com.cbs.card.entity.IslamicCardProfile;
import com.cbs.card.repository.IslamicCardDetailsRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.mudarabah.entity.MudarabahAccount;
import com.cbs.mudarabah.entity.PoolWeightageRecord;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.mudarabah.repository.PoolWeightageRecordRepository;
import com.cbs.mudarabah.service.PoolWeightageService;
import com.cbs.shariahcompliance.dto.ShariahScreeningRequest;
import com.cbs.shariahcompliance.dto.ShariahScreeningResultResponse;
import com.cbs.shariahcompliance.entity.ScreeningActionTaken;
import com.cbs.shariahcompliance.service.ShariahScreeningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IslamicCardAuthorizationService {

    private static final String ISLAMIC_BLOCK_RESPONSE_CODE = "57";

    private final IslamicCardDetailsRepository islamicCardDetailsRepository;
    private final ShariahScreeningService shariahScreeningService;
    private final PoolWeightageRecordRepository poolWeightageRecordRepository;
    private final MudarabahAccountRepository mudarabahAccountRepository;
    private final PoolWeightageService poolWeightageService;

    public IslamicCardAuthorizationDecision evaluate(Card card, CardTransaction txn) {
        IslamicCardDetails islamicCard = islamicCardDetailsRepository.findByCardId(card.getId())
                .orElse(null);
        if (islamicCard == null) {
            return IslamicCardAuthorizationDecision.notApplicable();
        }

        String settlementGlCode = resolveSettlementGlCode(islamicCard);
        IslamicCardProfile profile = islamicCard.getEffectiveRestrictionProfile();
        if (profile == null || !Boolean.TRUE.equals(profile.getActive())) {
            return IslamicCardAuthorizationDecision.blocked(
                    islamicCard.getId(),
                    settlementGlCode,
                    null,
                    "Islamic restriction profile is not configured or inactive",
                    ISLAMIC_BLOCK_RESPONSE_CODE
            );
        }
        String normalizedMcc = normalizeMcc(txn.getMerchantCategoryCode());
        ShariahScreeningResultResponse screening = shariahScreeningService.screenTransaction(buildScreeningRequest(islamicCard, card, txn, profile));
        islamicCard.setLastScreeningRef(screening.getScreeningRef());
        islamicCardDetailsRepository.save(islamicCard);

        if (profile != null && profile.blocks(normalizedMcc)) {
            String reason = "Merchant category " + normalizedMcc + " is blocked by Islamic profile " + profile.getProfileCode();
            return IslamicCardAuthorizationDecision.blocked(
                    islamicCard.getId(),
                    settlementGlCode,
                    screening.getScreeningRef(),
                    reason,
                    ISLAMIC_BLOCK_RESPONSE_CODE
            );
        }

        if (screening.getActionTaken() == ScreeningActionTaken.BLOCKED) {
            return IslamicCardAuthorizationDecision.blocked(
                    islamicCard.getId(),
                    settlementGlCode,
                    screening.getScreeningRef(),
                    screening.getBlockReason(),
                    ISLAMIC_BLOCK_RESPONSE_CODE
            );
        }

        String shariahDecision = screening.getActionTaken() == ScreeningActionTaken.ALLOWED_WITH_ALERT
                ? "REVIEW"
                : "ALLOWED";
        String shariahReason = screening.getActionTaken() == ScreeningActionTaken.ALLOWED_WITH_ALERT
                ? "Allowed with Shariah compliance alert"
                : null;
        return IslamicCardAuthorizationDecision.allowed(
                islamicCard.getId(),
                settlementGlCode,
                screening.getScreeningRef(),
                shariahDecision,
                shariahReason
        );
    }

    public void afterAuthorization(CardTransaction txn) {
        if (txn.getIslamicCardId() == null || !"AUTHORIZED".equals(txn.getStatus())) {
            return;
        }
        refreshMudarabahWeightage(txn.getIslamicCardId());
    }

    public void refreshMudarabahWeightage(Long islamicCardId) {
        IslamicCardDetails islamicCard = islamicCardDetailsRepository.findById(islamicCardId)
                .orElseThrow(() -> new BusinessException("Islamic card not found: " + islamicCardId, "ISLAMIC_CARD_NOT_FOUND"));
        MudarabahAccount mudarabahAccount = islamicCard.getMudarabahAccount();
        if (mudarabahAccount == null || mudarabahAccount.getInvestmentPoolId() == null || mudarabahAccount.getAccount() == null) {
            return;
        }

        Account account = mudarabahAccount.getAccount();
        LocalDate today = LocalDate.now();
        LocalDate periodStart = today.withDayOfMonth(1);
        BigDecimal currentBalance = account.getBookBalance();
        BigDecimal previousCumulative = today.equals(periodStart)
                ? BigDecimal.ZERO
                : poolWeightageRecordRepository.sumDailyProduct(
                        mudarabahAccount.getInvestmentPoolId(),
                        account.getId(),
                        periodStart,
                        today.minusDays(1)
                );

        PoolWeightageRecord record = poolWeightageRecordRepository
                .findByPoolIdAndAccountIdAndRecordDate(mudarabahAccount.getInvestmentPoolId(), account.getId(), today)
                .orElseGet(() -> PoolWeightageRecord.builder()
                        .poolId(mudarabahAccount.getInvestmentPoolId())
                        .accountId(account.getId())
                        .mudarabahAccountId(mudarabahAccount.getId())
                        .recordDate(today)
                        .createdAt(Instant.now())
                        .build());

        record.setClosingBalance(currentBalance);
        record.setDailyProduct(currentBalance);
        record.setCumulativeDailyProduct(previousCumulative.add(currentBalance));
        record.setPeriodStartDate(periodStart);
        record.setActive(true);
        poolWeightageRecordRepository.save(record);

        mudarabahAccount.setCurrentWeight(poolWeightageService.calculateWeightage(
                mudarabahAccount.getInvestmentPoolId(),
                account.getId(),
                periodStart,
                today
        ));
        mudarabahAccountRepository.save(mudarabahAccount);

        log.info("Islamic card settlement refreshed mudarabah weightage: cardId={}, accountId={}, poolId={}",
                islamicCardId, account.getId(), mudarabahAccount.getInvestmentPoolId());
    }

    @Transactional(readOnly = true)
    public String resolveSettlementGlCode(Long islamicCardId) {
        if (islamicCardId == null) {
            return null;
        }
        IslamicCardDetails islamicCard = islamicCardDetailsRepository.findById(islamicCardId)
                .orElseThrow(() -> new BusinessException("Islamic card not found: " + islamicCardId, "ISLAMIC_CARD_NOT_FOUND"));
        return resolveSettlementGlCode(islamicCard);
    }

    public void afterLifecyclePosting(Long islamicCardId, String lifecycleEvent) {
        if (islamicCardId == null) {
            return;
        }
        refreshMudarabahWeightage(islamicCardId);
        log.info("Islamic card lifecycle posting applied: cardId={}, event={}", islamicCardId, lifecycleEvent);
    }

    private String resolveSettlementGlCode(IslamicCardDetails islamicCard) {
        if (StringUtils.hasText(islamicCard.getSettlementGlCode())) {
            return islamicCard.getSettlementGlCode();
        }
        if (islamicCard.getProduct() != null && StringUtils.hasText(islamicCard.getProduct().getSettlementGlCode())) {
            return islamicCard.getProduct().getSettlementGlCode();
        }
        throw new BusinessException("Islamic card settlement GL is not configured", "ISLAMIC_CARD_SETTLEMENT_GL_MISSING");
    }

    private ShariahScreeningRequest buildScreeningRequest(IslamicCardDetails islamicCard,
                                                          Card card,
                                                          CardTransaction txn,
                                                          IslamicCardProfile profile) {
        Map<String, Object> additionalContext = new LinkedHashMap<>();
        additionalContext.put("cardReference", card.getCardReference());
        additionalContext.put("channel", txn.getChannel());
        additionalContext.put("cardScheme", card.getCardScheme().name());
        if (islamicCard.getProduct() != null) {
            additionalContext.put("productCode", islamicCard.getProduct().getProductCode());
        }
        if (profile != null) {
            additionalContext.put("restrictionProfileCode", profile.getProfileCode());
        }
        if (StringUtils.hasText(txn.getMerchantCountry())) {
            additionalContext.put("merchantCountry", txn.getMerchantCountry());
        }

        return ShariahScreeningRequest.builder()
                .transactionRef(txn.getTransactionRef())
                .transactionType(txn.getTransactionType())
                .amount(txn.getAmount())
                .currencyCode(txn.getCurrencyCode())
                .contractRef(islamicCard.getContractReference())
                .contractTypeCode(islamicCard.getContractTypeCode())
                .customerId(card.getCustomer() != null ? card.getCustomer().getId() : null)
                .counterpartyName(txn.getMerchantName())
                .counterpartyId(txn.getMerchantId())
                .merchantCategoryCode(normalizeMcc(txn.getMerchantCategoryCode()))
                .merchantName(txn.getMerchantName())
                .purpose("Islamic card authorization")
                .additionalContext(additionalContext)
                .build();
    }

    private String normalizeMcc(String merchantCategoryCode) {
        return merchantCategoryCode == null ? null : merchantCategoryCode.trim().toUpperCase(Locale.ROOT);
    }
}