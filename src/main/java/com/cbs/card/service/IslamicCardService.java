package com.cbs.card.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.repository.AccountRepository;
import com.cbs.card.dto.*;
import com.cbs.card.entity.*;
import com.cbs.card.repository.CardRepository;
import com.cbs.card.repository.IslamicCardDetailsRepository;
import com.cbs.card.repository.IslamicCardProductRepository;
import com.cbs.card.repository.IslamicCardProfileRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.CustomerIdentification;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.repository.CustomerIdentificationRepository;
import com.cbs.fees.islamic.dto.IslamicFeeRequests;
import com.cbs.fees.islamic.dto.IslamicFeeResponses;
import com.cbs.fees.islamic.service.IslamicFeeService;
import com.cbs.mudarabah.entity.MudarabahAccount;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.cbs.wadiah.entity.WadiahAccount;
import com.cbs.wadiah.repository.WadiahAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IslamicCardService {

    private static final List<CardStatus> BLOCKING_CARD_STATUSES = List.of(
            CardStatus.ACTIVE,
            CardStatus.PENDING_ACTIVATION,
            CardStatus.BLOCKED,
            CardStatus.HOT_LISTED
    );

    private final IslamicCardProductRepository islamicCardProductRepository;
    private final IslamicCardProfileRepository islamicCardProfileRepository;
    private final IslamicCardDetailsRepository islamicCardDetailsRepository;
    private final AccountRepository accountRepository;
    private final CardRepository cardRepository;
    private final CardService cardService;
    private final WadiahAccountRepository wadiahAccountRepository;
    private final MudarabahAccountRepository mudarabahAccountRepository;
    private final CustomerIdentificationRepository customerIdentificationRepository;
    private final IslamicFeeService islamicFeeService;
    private final CurrentTenantResolver tenantResolver;
    private final IslamicCardAuthorizationService islamicCardAuthorizationService;

    @CacheEvict(cacheNames = {"islamic-card-profiles", "islamic-card-products"}, allEntries = true)
    public IslamicCardProfileResponse createProfile(SaveIslamicCardProfileRequest request) {
        String profileCode = normalizeCode(request.getProfileCode());
        if (islamicCardProfileRepository.findByProfileCode(profileCode).isPresent()) {
            throw new BusinessException("Islamic card profile already exists: " + profileCode, "ISLAMIC_CARD_PROFILE_DUPLICATE");
        }

        IslamicCardProfile profile = IslamicCardProfile.builder()
                .profileCode(profileCode)
                .profileName(request.getProfileName().trim())
                .description(request.getDescription())
                .restrictedMccs(normalizeMccList(request.getRestrictedMccs()))
                .active(request.getActive() == null || request.getActive())
                .tenantId(tenantResolver.getCurrentTenantId())
                .build();
        return IslamicCardMapper.toProfileResponse(islamicCardProfileRepository.save(profile));
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "islamic-card-profiles", key = "'all'")
    public List<IslamicCardProfileResponse> listProfiles() {
        return islamicCardProfileRepository.findAllByOrderByProfileCodeAsc().stream()
                .map(IslamicCardMapper::toProfileResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "islamic-card-profiles", key = "#profileCode.toUpperCase()")
    public IslamicCardProfileResponse getProfile(String profileCode) {
        return IslamicCardMapper.toProfileResponse(resolveProfile(profileCode));
    }

    @CacheEvict(cacheNames = {"islamic-card-profiles", "islamic-card-products"}, allEntries = true)
    public IslamicCardProductResponse createProduct(SaveIslamicCardProductRequest request) {
        String productCode = normalizeCode(request.getProductCode());
        if (islamicCardProductRepository.findByProductCode(productCode).isPresent()) {
            throw new BusinessException("Islamic card product already exists: " + productCode, "ISLAMIC_CARD_PRODUCT_DUPLICATE");
        }

        IslamicCardProfile profile = StringUtils.hasText(request.getRestrictionProfileCode())
                ? resolveProfile(request.getRestrictionProfileCode())
                : null;

        IslamicCardProduct product = IslamicCardProduct.builder()
                .productCode(productCode)
                .productName(request.getProductName().trim())
                .description(request.getDescription())
                .contractType(request.getContractType())
                .cardScheme(request.getCardScheme())
                .cardTier(StringUtils.hasText(request.getCardTier()) ? request.getCardTier().trim().toUpperCase(Locale.ROOT) : "CLASSIC")
                .restrictionProfile(profile)
                .settlementGlCode(request.getSettlementGlCode().trim())
                .feeGlCode(trimToNull(request.getFeeGlCode()))
                .issuanceFeeCode(trimToNull(request.getIssuanceFeeCode()))
                .replacementFeeCode(trimToNull(request.getReplacementFeeCode()))
                .allowAtm(defaultTrue(request.getAllowAtm()))
                .allowPos(defaultTrue(request.getAllowPos()))
                .allowOnline(defaultTrue(request.getAllowOnline()))
                .allowInternational(defaultFalse(request.getAllowInternational()))
                .allowContactless(defaultTrue(request.getAllowContactless()))
                .requireVerifiedKyc(defaultTrue(request.getRequireVerifiedKyc()))
                .allowOverdraft(defaultFalse(request.getAllowOverdraft()))
                .active(request.getActive() == null || request.getActive())
                .tenantId(tenantResolver.getCurrentTenantId())
                .build();
        return IslamicCardMapper.toProductResponse(islamicCardProductRepository.save(product));
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "islamic-card-products", key = "'all'")
    public List<IslamicCardProductResponse> listProducts() {
        return islamicCardProductRepository.findAllByOrderByProductCodeAsc().stream()
                .map(IslamicCardMapper::toProductResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "islamic-card-products", key = "#productCode.toUpperCase()")
    public IslamicCardProductResponse getProduct(String productCode) {
        return IslamicCardMapper.toProductResponse(resolveProduct(productCode));
    }

    public Card issueIslamicDebitCard(IssueIslamicCardRequest request) {
        IslamicCardProduct product = resolveActiveProduct(request.getProductCode());
        Account account = accountRepository.findByIdWithProduct(request.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getAccountId()));
        validateIssuanceEligibility(account, request, product);

        IslamicCardProfile restrictionProfile = StringUtils.hasText(request.getRestrictionProfileCode())
                ? resolveActiveProfile(request.getRestrictionProfileCode())
                : product.getRestrictionProfile();

        WadiahAccount wadiahAccount = null;
        MudarabahAccount mudarabahAccount = null;
        String contractRef;
        String contractTypeCode;

        if (product.getContractType() == IslamicCardContractType.WADIAH) {
            wadiahAccount = wadiahAccountRepository.findByAccountId(account.getId())
                    .orElseThrow(() -> new BusinessException("Account is not linked to a Wadiah contract", "ISLAMIC_CARD_WADIAH_ACCOUNT_REQUIRED"));
            wadiahAccount.setDebitCardEnabled(true);
            wadiahAccountRepository.save(wadiahAccount);
            contractRef = wadiahAccount.getContractReference();
            contractTypeCode = wadiahAccount.getContractTypeCode();
        } else {
            mudarabahAccount = mudarabahAccountRepository.findByAccountId(account.getId())
                    .orElseThrow(() -> new BusinessException("Account is not linked to a Mudarabah contract", "ISLAMIC_CARD_MUDARABAH_ACCOUNT_REQUIRED"));
            if (!mudarabahAccount.isLossDisclosureAccepted()) {
                throw new BusinessException("Mudarabah loss disclosure must be accepted before card issuance", "ISLAMIC_CARD_LOSS_DISCLOSURE_REQUIRED");
            }
            contractRef = mudarabahAccount.getContractReference();
            contractTypeCode = mudarabahAccount.getContractTypeCode();
        }

        String cardholderName = StringUtils.hasText(request.getCardholderName())
                ? request.getCardholderName().trim()
                : account.getCustomer().getDisplayName().toUpperCase(Locale.ROOT);
        String branchCode = StringUtils.hasText(request.getBranchCode()) ? request.getBranchCode().trim() : account.getBranchCode();

        Card card = cardService.issueCard(
                account.getId(),
                CardType.DEBIT,
                product.getCardScheme(),
                StringUtils.hasText(request.getCardTier()) ? request.getCardTier().trim().toUpperCase(Locale.ROOT) : product.getCardTier(),
                cardholderName,
                request.getExpiryDate(),
                request.getDailyPosLimit(),
                request.getDailyAtmLimit(),
                request.getDailyOnlineLimit(),
                request.getSingleTxnLimit(),
                BigDecimal.ZERO,
                branchCode,
                CardStatus.PENDING_ACTIVATION
        );
        card.setIsAtmEnabled(product.getAllowAtm());
        card.setIsPosEnabled(product.getAllowPos());
        card.setIsOnlineEnabled(product.getAllowOnline());
        card.setIsInternationalEnabled(product.getAllowInternational());
        card.setIsContactlessEnabled(product.getAllowContactless());
        card = cardRepository.save(card);

        IslamicFeeResponses.FeeChargeResult issuanceFee = chargeIssuanceFee(product, account, card, contractRef, contractTypeCode);
        validateFeeGlAlignment(product, issuanceFee);

        IslamicCardDetails details = IslamicCardDetails.builder()
                .card(card)
                .product(product)
                .restrictionProfile(restrictionProfile)
                .contractType(product.getContractType())
                .wadiahAccount(wadiahAccount)
                .mudarabahAccount(mudarabahAccount)
                .settlementGlCode(product.getSettlementGlCode())
                .feeGlCode(product.getFeeGlCode())
                .issuedFeeJournalRef(issuanceFee != null ? issuanceFee.getJournalRef() : null)
                .issuedFeeChargeLogId(issuanceFee != null ? issuanceFee.getFeeChargeLogId() : null)
                .tenantId(tenantResolver.getCurrentTenantId())
                .build();
        IslamicCardDetails savedDetails = islamicCardDetailsRepository.save(details);

        if (mudarabahAccount != null && issuanceFee != null && issuanceFee.getChargedAmount() != null
                && issuanceFee.getChargedAmount().compareTo(BigDecimal.ZERO) > 0) {
            islamicCardAuthorizationService.refreshMudarabahWeightage(savedDetails.getId());
        }

        log.info("Islamic debit card issued: cardRef={}, productCode={}, accountId={}, contractType={}",
                card.getCardReference(), product.getProductCode(), account.getId(), product.getContractType());
        return card;
    }

    public Card assignRestrictionProfile(Long cardId, String restrictionProfileCode) {
        IslamicCardDetails details = islamicCardDetailsRepository.findByCardId(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicCard", "cardId", cardId));
        details.setRestrictionProfile(resolveActiveProfile(restrictionProfileCode));
        islamicCardDetailsRepository.save(details);
        return details.getCard();
    }

    private void validateIssuanceEligibility(Account account,
                                             IssueIslamicCardRequest request,
                                             IslamicCardProduct product) {
        if (account.getStatus() != AccountStatus.ACTIVE || !account.isDebitAllowed()) {
            throw new BusinessException("Account is not eligible for debit card issuance", "ISLAMIC_CARD_ACCOUNT_INELIGIBLE");
        }
        if (account.getCustomer() == null || account.getCustomer().getStatus() != CustomerStatus.ACTIVE) {
            throw new BusinessException("Customer must be active before Islamic card issuance", "ISLAMIC_CARD_CUSTOMER_INACTIVE");
        }
        if (request.getCustomerId() != null && !request.getCustomerId().equals(account.getCustomer().getId())) {
            throw new BusinessException("customerId does not match the account owner", "ISLAMIC_CARD_CUSTOMER_MISMATCH");
        }
        if (Boolean.FALSE.equals(product.getAllowOverdraft()) && account.getOverdraftLimit().compareTo(BigDecimal.ZERO) > 0) {
            throw new BusinessException("Islamic debit cards cannot be issued on overdraft-enabled accounts", "ISLAMIC_CARD_OVERDRAFT_NOT_ALLOWED");
        }
        if (Boolean.TRUE.equals(product.getRequireVerifiedKyc()) && !hasVerifiedKyc(account.getCustomer().getId())) {
            throw new BusinessException("Verified KYC is required before Islamic card issuance", "ISLAMIC_CARD_KYC_REQUIRED");
        }
        if (islamicCardDetailsRepository.findByCardAccountIdAndCardStatusIn(account.getId(), BLOCKING_CARD_STATUSES).isPresent()) {
            throw new BusinessException("An Islamic card already exists for this account", "ISLAMIC_CARD_ALREADY_EXISTS");
        }
    }

    private boolean hasVerifiedKyc(Long customerId) {
        return customerIdentificationRepository.findVerifiedByCustomerId(customerId).stream()
                .anyMatch(id -> !id.isExpired());
    }

    private IslamicFeeResponses.FeeChargeResult chargeIssuanceFee(IslamicCardProduct product,
                                                                  Account account,
                                                                  Card card,
                                                                  String contractRef,
                                                                  String contractTypeCode) {
        if (!StringUtils.hasText(product.getIssuanceFeeCode())) {
            return null;
        }
        return islamicFeeService.chargeFee(IslamicFeeRequests.ChargeFeeRequest.builder()
                .feeCode(product.getIssuanceFeeCode())
                .accountId(account.getId())
                .accountBalance(account.getAvailableBalance())
                .customerId(account.getCustomer() != null ? account.getCustomer().getId() : null)
                .contractRef(contractRef)
                .contractTypeCode(contractTypeCode)
                .transactionType("CARD_ISSUANCE")
                .triggerRef("CARDISS-" + card.getCardReference())
                .currencyCode(account.getCurrencyCode())
                .narration("Islamic debit card issuance fee " + card.getCardReference())
                .build());
    }

    private void validateFeeGlAlignment(IslamicCardProduct product, IslamicFeeResponses.FeeChargeResult issuanceFee) {
        if (issuanceFee == null || !StringUtils.hasText(product.getFeeGlCode()) || !StringUtils.hasText(issuanceFee.getGlAccountCode())) {
            return;
        }
        if (!product.getFeeGlCode().equals(issuanceFee.getGlAccountCode())) {
            throw new BusinessException(
                    "Islamic card product fee GL does not match the Islamic fee configuration GL",
                    "ISLAMIC_CARD_FEE_GL_MISMATCH");
        }
    }

    private IslamicCardProfile resolveProfile(String profileCode) {
        return islamicCardProfileRepository.findByProfileCode(normalizeCode(profileCode))
                .orElseThrow(() -> new ResourceNotFoundException("IslamicCardProfile", "profileCode", normalizeCode(profileCode)));
    }

    private IslamicCardProfile resolveActiveProfile(String profileCode) {
        IslamicCardProfile profile = resolveProfile(profileCode);
        if (!Boolean.TRUE.equals(profile.getActive())) {
            throw new BusinessException("Islamic card profile is inactive: " + profileCode, "ISLAMIC_CARD_PROFILE_INACTIVE");
        }
        return profile;
    }

    private IslamicCardProduct resolveProduct(String productCode) {
        return islamicCardProductRepository.findByProductCode(normalizeCode(productCode))
                .orElseThrow(() -> new ResourceNotFoundException("IslamicCardProduct", "productCode", normalizeCode(productCode)));
    }

    private IslamicCardProduct resolveActiveProduct(String productCode) {
        IslamicCardProduct product = resolveProduct(productCode);
        if (!Boolean.TRUE.equals(product.getActive())) {
            throw new BusinessException("Islamic card product is inactive: " + productCode, "ISLAMIC_CARD_PRODUCT_INACTIVE");
        }
        return product;
    }

    private List<String> normalizeMccList(List<String> restrictedMccs) {
        Set<String> normalized = new LinkedHashSet<>();
        if (restrictedMccs != null) {
            for (String rawCode : restrictedMccs) {
                if (!StringUtils.hasText(rawCode)) {
                    continue;
                }
                String code = rawCode.trim().toUpperCase(Locale.ROOT);
                if (!code.matches("\\d{4}")) {
                    throw new BusinessException("MCC codes must be 4 digits: " + rawCode, "ISLAMIC_CARD_INVALID_MCC");
                }
                normalized.add(code);
            }
        }
        return normalized.stream().sorted(Comparator.naturalOrder()).toList();
    }

    private String normalizeCode(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private Boolean defaultTrue(Boolean value) {
        return value == null || value;
    }

    private Boolean defaultFalse(Boolean value) {
        return value != null && value;
    }
}