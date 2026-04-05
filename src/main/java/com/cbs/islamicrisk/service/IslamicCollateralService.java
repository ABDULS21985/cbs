package com.cbs.islamicrisk.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.islamicrisk.dto.IslamicRiskRequests;
import com.cbs.islamicrisk.dto.IslamicRiskResponses;
import com.cbs.islamicrisk.entity.IslamicCollateralExtension;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import com.cbs.islamicrisk.repository.IslamicCollateralExtensionRepository;
import com.cbs.lending.dto.CollateralDto;
import com.cbs.lending.dto.CollateralValuationDto;
import com.cbs.lending.entity.Collateral;
import com.cbs.lending.entity.CollateralType;
import com.cbs.lending.entity.ValuationMethod;
import com.cbs.lending.repository.CollateralRepository;
import com.cbs.lending.service.CollateralService;
import com.cbs.shariahcompliance.dto.ShariahScreeningResultResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IslamicCollateralService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final IslamicCollateralExtensionRepository extensionRepository;
    private final CollateralRepository collateralRepository;
    private final CollateralService collateralService;
    private final IslamicRiskSupport riskSupport;

    @Transactional
    public IslamicCollateralExtension registerCollateral(IslamicRiskRequests.RegisterIslamicCollateralRequest request) {
        PermissibilityDecision decision = classifyPermissibility(request);
        if (decision.permissibility() == IslamicRiskDomainEnums.ShariahPermissibility.PROHIBITED) {
            throw new BusinessException(decision.reason(), "PROHIBITED_COLLATERAL");
        }

        CollateralDto baseRequest = CollateralDto.builder()
                .customerId(request.getCustomerId())
                .collateralType(request.getCollateralType())
                .description(request.getDescription())
                .marketValue(request.getMarketValue())
                .forcedSaleValue(request.getForcedSaleValue())
                .currencyCode(request.getCurrencyCode())
                .valuationSource(request.getValuationSource())
                .location(request.getLocation())
                .registrationNumber(request.getRegistrationNumber())
                .registrationAuthority(request.getRegistrationAuthority())
                .isInsured(Boolean.TRUE.equals(request.getInsured()))
                .insurancePolicyNumber(request.getInsurancePolicyNumber())
                .insuranceExpiryDate(request.getInsuranceExpiryDate())
                .insuranceValue(request.getInsuranceValue())
                .build();
        CollateralDto collateralDto = collateralService.registerCollateral(baseRequest);

        IslamicCollateralExtension extension = IslamicCollateralExtension.builder()
                .baseCollateralId(collateralDto.getId())
                .contractId(request.getContractId())
                .contractTypeCode(riskSupport.uppercase(request.getContractTypeCode()))
                .shariahPermissibility(decision.permissibility())
                .shariahClassificationReason(decision.reason())
                .shariahScreened(Boolean.TRUE.equals(decision.screened()))
                .shariahScreenedBy(Boolean.TRUE.equals(decision.screened()) ? riskSupport.currentActor() : null)
                .shariahScreenedAt(Boolean.TRUE.equals(decision.screened()) ? LocalDateTime.now() : null)
                .islamicCollateralType(request.getIslamicCollateralType())
                .issuerName(request.getIssuerName())
                .underlyingAssetScreened(Boolean.TRUE.equals(request.getUnderlyingAssetScreened()) || decision.underlyingResult() != null)
                .underlyingScreeningResult(decision.underlyingResult() != null ? decision.underlyingResult() : request.getUnderlyingScreeningResult())
                .underlyingScreeningDate(decision.underlyingResult() != null ? LocalDate.now() : request.getUnderlyingScreeningDate())
                .lastValuationDate(LocalDate.now())
                .lastValuationAmount(riskSupport.scaleMoney(request.getMarketValue()))
                .valuationMethod(IslamicRiskDomainEnums.IslamicCollateralValuationMethod.MARKET_VALUE)
                .haircutPercentage(defaultHaircut(request.getHaircutPercentage(), request.getIslamicCollateralType()))
                .netCollateralValue(netValue(request.getMarketValue(), defaultHaircut(request.getHaircutPercentage(), request.getIslamicCollateralType())))
                .lienCreatedDate(LocalDate.now())
                .lienRegisteredWith(request.getLienRegisteredWith())
                .lienRegistrationRef(request.getLienRegistrationRef())
                .lienPriority(request.getLienPriority())
                .takafulRequired(Boolean.TRUE.equals(request.getTakafulRequired()))
                .takafulPolicyRef(request.getTakafulPolicyRef())
                .takafulProvider(request.getTakafulProvider())
                .takafulCoverageAmount(riskSupport.scaleMoney(request.getTakafulCoverageAmount()))
                .takafulExpiryDate(request.getTakafulExpiryDate())
                .status(IslamicRiskDomainEnums.IslamicCollateralStatus.ACTIVE)
                .tenantId(riskSupport.currentTenantId())
                .build();
        return extensionRepository.save(extension);
    }

    @Transactional
    public void validateCollateralPermissibility(Long collateralId) {
        IslamicCollateralExtension extension = getCollateral(collateralId);
        Collateral baseCollateral = collateralRepository.findById(extension.getBaseCollateralId())
                .orElseThrow(() -> new ResourceNotFoundException("Collateral", "id", extension.getBaseCollateralId()));

        IslamicRiskRequests.RegisterIslamicCollateralRequest request = IslamicRiskRequests.RegisterIslamicCollateralRequest.builder()
                .customerId(baseCollateral.getCustomer().getId())
                .contractId(extension.getContractId())
                .contractTypeCode(extension.getContractTypeCode())
                .collateralType(baseCollateral.getCollateralType())
                .description(baseCollateral.getDescription())
                .marketValue(baseCollateral.getMarketValue())
                .forcedSaleValue(baseCollateral.getForcedSaleValue())
                .currencyCode(baseCollateral.getCurrencyCode())
                .valuationSource(baseCollateral.getValuationSource())
                .location(baseCollateral.getLocation())
                .registrationNumber(baseCollateral.getRegistrationNumber())
                .registrationAuthority(baseCollateral.getRegistrationAuthority())
                .insured(baseCollateral.getIsInsured())
                .insurancePolicyNumber(baseCollateral.getInsurancePolicyNumber())
                .insuranceExpiryDate(baseCollateral.getInsuranceExpiryDate())
                .insuranceValue(baseCollateral.getInsuranceValue())
                .islamicCollateralType(extension.getIslamicCollateralType())
                .issuerName(extension.getIssuerName())
                .haircutPercentage(extension.getHaircutPercentage())
                .takafulRequired(extension.getTakafulRequired())
                .takafulPolicyRef(extension.getTakafulPolicyRef())
                .takafulProvider(extension.getTakafulProvider())
                .takafulCoverageAmount(extension.getTakafulCoverageAmount())
                .takafulExpiryDate(extension.getTakafulExpiryDate())
                .build();

        PermissibilityDecision decision = classifyPermissibility(request);
        extension.setShariahPermissibility(decision.permissibility());
        extension.setShariahClassificationReason(decision.reason());
        extension.setShariahScreened(Boolean.TRUE.equals(decision.screened()));
        extension.setShariahScreenedBy(Boolean.TRUE.equals(decision.screened()) ? riskSupport.currentActor() : extension.getShariahScreenedBy());
        extension.setShariahScreenedAt(Boolean.TRUE.equals(decision.screened()) ? LocalDateTime.now() : extension.getShariahScreenedAt());
        if (decision.underlyingResult() != null) {
            extension.setUnderlyingAssetScreened(true);
            extension.setUnderlyingScreeningResult(decision.underlyingResult());
            extension.setUnderlyingScreeningDate(LocalDate.now());
        }
        if (decision.permissibility() != IslamicRiskDomainEnums.ShariahPermissibility.PERMISSIBLE) {
            extension.setStatus(IslamicRiskDomainEnums.IslamicCollateralStatus.UNDER_REVIEW);
        }
        extensionRepository.save(extension);
    }

    @Transactional
    public void recordValuation(Long collateralId, IslamicRiskRequests.ValuationRequest request) {
        IslamicCollateralExtension extension = getCollateral(collateralId);
        collateralService.addValuation(extension.getBaseCollateralId(), CollateralValuationDto.builder()
                .valuationDate(request.getValuationDate())
                .marketValue(request.getValuationAmount())
                .forcedSaleValue(request.getForcedSaleValue())
                .valuationMethod(ValuationMethod.valueOf(request.getValuationMethod().name()))
                .valuerName(request.getAppraiserName())
                .valuerOrganisation(request.getAppraiserName())
                .nextValuationDate(request.getNextValuationDueDate())
                .build());

        BigDecimal haircut = defaultHaircut(request.getHaircutPercentage(), extension.getIslamicCollateralType());
        extension.setLastValuationDate(request.getValuationDate());
        extension.setLastValuationAmount(riskSupport.scaleMoney(request.getValuationAmount()));
        extension.setValuationMethod(request.getValuationMethod());
        extension.setAppraiserName(request.getAppraiserName());
        extension.setShariahCompliantAppraiser(Boolean.TRUE.equals(request.getShariahCompliantAppraiser()));
        extension.setHaircutPercentage(haircut);
        extension.setNetCollateralValue(netValue(request.getValuationAmount(), haircut));
        extension.setNextValuationDueDate(request.getNextValuationDueDate());
        extensionRepository.save(extension);
    }

    public IslamicRiskResponses.CollateralCoverageResult calculateCoverage(Long contractId, String contractTypeCode) {
        IslamicRiskSupport.ContractSnapshot snapshot = riskSupport.loadContract(contractId, contractTypeCode);
        Map<String, BigDecimal> byType = new LinkedHashMap<>();
        BigDecimal explicitTotal = BigDecimal.ZERO;
        for (IslamicCollateralExtension extension : extensionRepository.findByContractId(contractId)) {
            if (extension.getStatus() != IslamicRiskDomainEnums.IslamicCollateralStatus.ACTIVE) {
                continue;
            }
            BigDecimal value = riskSupport.resolveNetCollateralValue(extension);
            explicitTotal = explicitTotal.add(value);
            byType.merge(extension.getIslamicCollateralType().name(), value, BigDecimal::add);
        }

        BigDecimal implicit = BigDecimal.ZERO;
        if ("IJARAH".equals(snapshot.contractTypeCode())) {
            implicit = snapshot.assetNetBookValue();
            byType.merge(IslamicRiskDomainEnums.IslamicCollateralType.IJARAH_ASSET_OWNERSHIP.name(), implicit, BigDecimal::add);
        } else if ("MUSHARAKAH".equals(snapshot.contractTypeCode())) {
            implicit = snapshot.bankShareValue();
            byType.merge(IslamicRiskDomainEnums.IslamicCollateralType.MUSHARAKAH_SHARE.name(), implicit, BigDecimal::add);
        }

        BigDecimal ead = exposureForCoverage(snapshot);
        BigDecimal total = explicitTotal.add(implicit);
        BigDecimal coverageRatio = ead.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO
                : total.multiply(HUNDRED).divide(ead, 2, RoundingMode.HALF_UP);
        return IslamicRiskResponses.CollateralCoverageResult.builder()
                .contractId(contractId)
                .contractTypeCode(snapshot.contractTypeCode())
                .totalCollateralValue(riskSupport.scaleMoney(total))
                .ead(riskSupport.scaleMoney(ead))
                .coverageRatio(coverageRatio)
                .surplusOrShortfall(riskSupport.scaleMoney(total.subtract(ead)))
                .byCollateralType(byType)
                .build();
    }

    public List<IslamicCollateralExtension> getCollateralRequiringReScreening() {
        LocalDate threshold = LocalDate.now().minusDays(90);
        return extensionRepository.findAll().stream()
                .filter(extension -> extension.getIslamicCollateralType() == IslamicRiskDomainEnums.IslamicCollateralType.SHARIAH_COMPLIANT_EQUITY
                        || extension.getIslamicCollateralType() == IslamicRiskDomainEnums.IslamicCollateralType.SUKUK)
                .filter(extension -> extension.getUnderlyingScreeningDate() == null
                        || extension.getUnderlyingScreeningDate().isBefore(threshold))
                .toList();
    }

    @Transactional
    public void reScreenEquityCollateral(Long collateralId) {
        IslamicCollateralExtension extension = getCollateral(collateralId);
        ShariahScreeningResultResponse screening = riskSupport.preScreenIssuer(extension.getIssuerName(),
                riskSupport.nextRef("COLL-RESCREEN"));
        extension.setUnderlyingAssetScreened(true);
        extension.setUnderlyingScreeningDate(LocalDate.now());
        if (riskSupport.blocked(screening)) {
            extension.setUnderlyingScreeningResult(IslamicRiskDomainEnums.UnderlyingScreeningResult.NON_COMPLIANT);
            extension.setShariahPermissibility(IslamicRiskDomainEnums.ShariahPermissibility.REQUIRES_REVIEW);
            extension.setStatus(IslamicRiskDomainEnums.IslamicCollateralStatus.UNDER_REVIEW);
        } else {
            extension.setUnderlyingScreeningResult(IslamicRiskDomainEnums.UnderlyingScreeningResult.COMPLIANT);
            extension.setShariahPermissibility(IslamicRiskDomainEnums.ShariahPermissibility.PERMISSIBLE);
        }
        extensionRepository.save(extension);
    }

    public List<IslamicCollateralExtension> getCollateralWithExpiringTakaful(int daysAhead) {
        return extensionRepository.findByTakafulExpiryDateBetween(LocalDate.now(), LocalDate.now().plusDays(daysAhead));
    }

    public IslamicCollateralExtension getCollateral(Long collateralId) {
        return extensionRepository.findById(collateralId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicCollateralExtension", "id", collateralId));
    }

    public List<IslamicCollateralExtension> getCollateralByContract(Long contractId) {
        return extensionRepository.findByContractId(contractId);
    }

    public List<IslamicCollateralExtension> getProhibitedCollateral() {
        return extensionRepository.findByShariahPermissibility(IslamicRiskDomainEnums.ShariahPermissibility.PROHIBITED);
    }

    public IslamicRiskResponses.CollateralPortfolioSummary getCollateralSummary() {
        List<IslamicCollateralExtension> all = extensionRepository.findAll();
        Map<String, BigDecimal> byType = new LinkedHashMap<>();
        BigDecimal total = BigDecimal.ZERO;
        for (IslamicCollateralExtension extension : all) {
            BigDecimal value = riskSupport.resolveNetCollateralValue(extension);
            total = total.add(value);
            byType.merge(extension.getIslamicCollateralType().name(), value, BigDecimal::add);
        }
        return IslamicRiskResponses.CollateralPortfolioSummary.builder()
                .totalCollateralCount(all.size())
                .totalNetCollateralValue(riskSupport.scaleMoney(total))
                .prohibitedCount(all.stream().filter(item -> item.getShariahPermissibility() == IslamicRiskDomainEnums.ShariahPermissibility.PROHIBITED).count())
                .reviewRequiredCount(all.stream().filter(item -> item.getShariahPermissibility() == IslamicRiskDomainEnums.ShariahPermissibility.REQUIRES_REVIEW
                        || item.getStatus() == IslamicRiskDomainEnums.IslamicCollateralStatus.UNDER_REVIEW).count())
                .byType(byType)
                .build();
    }

    private PermissibilityDecision classifyPermissibility(IslamicRiskRequests.RegisterIslamicCollateralRequest request) {
        String description = StringUtils.hasText(request.getDescription()) ? request.getDescription().toLowerCase() : "";
        if ((request.getCollateralType() == CollateralType.SECURITIES && description.contains("bond"))
                || description.contains("interest-bearing")
                || description.contains("conventional bond")) {
            return new PermissibilityDecision(IslamicRiskDomainEnums.ShariahPermissibility.PROHIBITED,
                    "Conventional interest-bearing bonds are not permissible collateral.",
                    true,
                    IslamicRiskDomainEnums.UnderlyingScreeningResult.NON_COMPLIANT);
        }
        if (request.getCollateralType() == CollateralType.INSURANCE
                && request.getIslamicCollateralType() != IslamicRiskDomainEnums.IslamicCollateralType.TAKAFUL_POLICY) {
            return new PermissibilityDecision(IslamicRiskDomainEnums.ShariahPermissibility.PROHIBITED,
                    "Conventional insurance collateral is not permissible. Only Takaful is acceptable.",
                    true,
                    IslamicRiskDomainEnums.UnderlyingScreeningResult.NON_COMPLIANT);
        }
        if (description.contains("haram") || description.contains("alcohol") || description.contains("gambling")) {
            return new PermissibilityDecision(IslamicRiskDomainEnums.ShariahPermissibility.PROHIBITED,
                    "Collateral derived from Haram business activity is prohibited.",
                    true,
                    IslamicRiskDomainEnums.UnderlyingScreeningResult.NON_COMPLIANT);
        }

        if (request.getIslamicCollateralType() == IslamicRiskDomainEnums.IslamicCollateralType.SHARIAH_COMPLIANT_EQUITY
                || request.getIslamicCollateralType() == IslamicRiskDomainEnums.IslamicCollateralType.SUKUK) {
            ShariahScreeningResultResponse screening = riskSupport.preScreenIssuer(request.getIssuerName(),
                    riskSupport.nextRef("COLL-ISSUER"));
            if (riskSupport.blocked(screening)) {
                return new PermissibilityDecision(IslamicRiskDomainEnums.ShariahPermissibility.PROHIBITED,
                        "Underlying issuer failed Shariah screening.",
                        true,
                        IslamicRiskDomainEnums.UnderlyingScreeningResult.NON_COMPLIANT);
            }
            return new PermissibilityDecision(IslamicRiskDomainEnums.ShariahPermissibility.PERMISSIBLE,
                    "Underlying issuer passed Shariah screening.",
                    true,
                    IslamicRiskDomainEnums.UnderlyingScreeningResult.COMPLIANT);
        }

        if (request.getIslamicCollateralType() == IslamicRiskDomainEnums.IslamicCollateralType.RECEIVABLES_HALAL
                && description.contains("review")) {
            return new PermissibilityDecision(IslamicRiskDomainEnums.ShariahPermissibility.RESTRICTED,
                    "Receivables collateral requires source-business validation.",
                    true,
                    IslamicRiskDomainEnums.UnderlyingScreeningResult.UNDER_REVIEW);
        }

        return new PermissibilityDecision(IslamicRiskDomainEnums.ShariahPermissibility.PERMISSIBLE,
                "Collateral type is Shariah-permissible.",
                false,
                null);
    }

    private BigDecimal exposureForCoverage(IslamicRiskSupport.ContractSnapshot snapshot) {
        return switch (snapshot.contractTypeCode()) {
            case "MURABAHA" -> snapshot.outstandingPrincipal();
            case "IJARAH" -> snapshot.assetNetBookValue().add(snapshot.rentalReceivable());
            case "MUSHARAKAH" -> snapshot.bankShareValue();
            default -> BigDecimal.ZERO;
        };
    }

    private BigDecimal defaultHaircut(BigDecimal haircutPercentage, IslamicRiskDomainEnums.IslamicCollateralType type) {
        if (haircutPercentage != null) {
            return haircutPercentage.setScale(6, RoundingMode.HALF_UP);
        }
        return switch (type) {
            case CASH_DEPOSIT -> new BigDecimal("5.000000");
            case GOLD_PRECIOUS_METALS, REAL_ESTATE -> new BigDecimal("10.000000");
            case SHARIAH_COMPLIANT_EQUITY, SUKUK -> new BigDecimal("20.000000");
            default -> new BigDecimal("15.000000");
        };
    }

    private BigDecimal netValue(BigDecimal gross, BigDecimal haircutPercentage) {
        BigDecimal grossValue = riskSupport.scaleMoney(gross);
        BigDecimal factor = BigDecimal.ONE.subtract(haircutPercentage.divide(HUNDRED, 6, RoundingMode.HALF_UP));
        return riskSupport.scaleMoney(grossValue.multiply(factor));
    }

    private record PermissibilityDecision(IslamicRiskDomainEnums.ShariahPermissibility permissibility,
                                          String reason,
                                          Boolean screened,
                                          IslamicRiskDomainEnums.UnderlyingScreeningResult underlyingResult) {
    }
}
