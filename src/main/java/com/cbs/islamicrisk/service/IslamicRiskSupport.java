package com.cbs.islamicrisk.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.ijarah.entity.IjarahAsset;
import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.entity.IjarahRentalInstallment;
import com.cbs.ijarah.repository.IjarahAssetRepository;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.ijarah.repository.IjarahRentalInstallmentRepository;
import com.cbs.islamicrisk.entity.IslamicCollateralExtension;
import com.cbs.islamicrisk.entity.IslamicCreditAssessment;
import com.cbs.islamicrisk.repository.IslamicCollateralExtensionRepository;
import com.cbs.islamicrisk.repository.IslamicCreditAssessmentRepository;
import com.cbs.lending.entity.Collateral;
import com.cbs.lending.repository.CollateralRepository;
import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.murabaha.entity.MurabahaInstallment;
import com.cbs.murabaha.repository.MurabahaContractRepository;
import com.cbs.murabaha.repository.MurabahaInstallmentRepository;
import com.cbs.musharakah.entity.MusharakahBuyoutInstallment;
import com.cbs.musharakah.entity.MusharakahContract;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.entity.MusharakahOwnershipUnit;
import com.cbs.musharakah.entity.MusharakahRentalInstallment;
import com.cbs.musharakah.repository.MusharakahBuyoutInstallmentRepository;
import com.cbs.musharakah.repository.MusharakahContractRepository;
import com.cbs.musharakah.repository.MusharakahOwnershipUnitRepository;
import com.cbs.musharakah.repository.MusharakahRentalInstallmentRepository;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.shariahcompliance.dto.ShariahScreeningRequest;
import com.cbs.shariahcompliance.dto.ShariahScreeningResultResponse;
import com.cbs.shariahcompliance.entity.ScreeningActionTaken;
import com.cbs.shariahcompliance.service.ShariahScreeningService;
import com.cbs.tenant.service.CurrentTenantResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IslamicRiskSupport {

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final AtomicLong REF_SEQUENCE = new AtomicLong(System.currentTimeMillis() % 100000);

    private final MurabahaContractRepository murabahaContractRepository;
    private final MurabahaInstallmentRepository murabahaInstallmentRepository;
    private final IjarahContractRepository ijarahContractRepository;
    private final IjarahAssetRepository ijarahAssetRepository;
    private final IjarahRentalInstallmentRepository ijarahRentalInstallmentRepository;
    private final MusharakahContractRepository musharakahContractRepository;
    private final MusharakahOwnershipUnitRepository musharakahOwnershipUnitRepository;
    private final MusharakahRentalInstallmentRepository musharakahRentalInstallmentRepository;
    private final MusharakahBuyoutInstallmentRepository musharakahBuyoutInstallmentRepository;
    private final IslamicCollateralExtensionRepository islamicCollateralExtensionRepository;
    private final CollateralRepository collateralRepository;
    private final IslamicProductTemplateRepository islamicProductTemplateRepository;
    private final IslamicCreditAssessmentRepository islamicCreditAssessmentRepository;
    private final ShariahScreeningService shariahScreeningService;
    private final CurrentActorProvider actorProvider;
    private final CurrentTenantResolver tenantResolver;

    public String nextRef(String prefix) {
        return prefix + "-" + LocalDate.now().getYear() + "-" + String.format("%06d", REF_SEQUENCE.incrementAndGet());
    }

    public String currentActor() {
        try {
            return actorProvider.getCurrentActor();
        } catch (Exception ex) {
            return "SYSTEM";
        }
    }

    public Long currentTenantId() {
        return tenantResolver.getCurrentTenantIdOrDefault(1L);
    }

    public ContractSnapshot loadContract(Long contractId, String contractTypeCode) {
        String type = uppercase(contractTypeCode);
        return switch (type) {
            case "MURABAHA" -> murabahaSnapshot(contractId);
            case "IJARAH" -> ijarahSnapshot(contractId);
            case "MUSHARAKAH" -> musharakahSnapshot(contractId);
            default -> throw new BusinessException("Unsupported Islamic contract type: " + contractTypeCode,
                    "UNSUPPORTED_ISLAMIC_CONTRACT_TYPE");
        };
    }

    public List<Long> activeContractIds(String contractTypeCode) {
        String type = uppercase(contractTypeCode);
        return switch (type) {
            case "MURABAHA" -> murabahaContractRepository.findByStatusIn(List.of(
                    MurabahaDomainEnums.ContractStatus.ACTIVE,
                    MurabahaDomainEnums.ContractStatus.DEFAULTED,
                    MurabahaDomainEnums.ContractStatus.EXECUTED
            )).stream().map(MurabahaContract::getId).toList();
            case "IJARAH" -> ijarahContractRepository.findByStatusIn(List.of(
                            IjarahDomainEnums.ContractStatus.ACTIVE,
                            IjarahDomainEnums.ContractStatus.RENTAL_ARREARS,
                            IjarahDomainEnums.ContractStatus.DEFAULTED
                    )).stream()
                    .map(IjarahContract::getId)
                    .toList();
            case "MUSHARAKAH" -> musharakahContractRepository.findByStatusIn(List.of(
                            MusharakahDomainEnums.ContractStatus.ACTIVE,
                            MusharakahDomainEnums.ContractStatus.RENTAL_ARREARS,
                            MusharakahDomainEnums.ContractStatus.BUYOUT_ARREARS,
                            MusharakahDomainEnums.ContractStatus.DEFAULTED
                    )).stream()
                    .map(MusharakahContract::getId)
                    .toList();
            default -> List.of();
        };
    }

    public IslamicProductTemplate loadProductTemplate(String productCode) {
        return islamicProductTemplateRepository.findByProductCodeIgnoreCase(productCode)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductTemplate", "productCode", productCode));
    }

    public boolean hasActiveFatwa(String productCode) {
        IslamicProductTemplate template = loadProductTemplate(productCode);
        return Boolean.FALSE.equals(template.getFatwaRequired()) || template.getActiveFatwaId() != null;
    }

    public BigDecimal explicitCollateralValue(Long contractId) {
        return islamicCollateralExtensionRepository.findByContractId(contractId).stream()
                .filter(extension -> extension.getStatus() == com.cbs.islamicrisk.entity.IslamicRiskDomainEnums.IslamicCollateralStatus.ACTIVE)
                .map(this::resolveNetCollateralValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public List<IslamicCollateralExtension> collateralByContract(Long contractId) {
        return islamicCollateralExtensionRepository.findByContractId(contractId);
    }

    public BigDecimal resolveNetCollateralValue(IslamicCollateralExtension extension) {
        if (extension.getNetCollateralValue() != null) {
            return scaleMoney(extension.getNetCollateralValue());
        }
        return collateralRepository.findById(extension.getBaseCollateralId())
                .map(Collateral::getMarketValue)
                .map(this::scaleMoney)
                .orElse(BigDecimal.ZERO);
    }

    public IslamicCreditAssessment latestAssessment(Long customerId, String contractTypeCode) {
        return islamicCreditAssessmentRepository.findTopByCustomerIdAndContractTypeCodeOrderByAssessmentDateDesc(
                        customerId, uppercase(contractTypeCode))
                .orElse(null);
    }

    public ShariahScreeningResultResponse preScreenIssuer(String issuerName, String reference) {
        if (!StringUtils.hasText(issuerName)) {
            return null;
        }
        return shariahScreeningService.preScreenTransaction(ShariahScreeningRequest.builder()
                .transactionRef(reference != null ? reference : nextRef("COLL-SCR"))
                .transactionType("COLLATERAL")
                .counterpartyName(issuerName)
                .purpose("Collateral issuer screening")
                .currencyCode("SAR")
                .amount(BigDecimal.ZERO)
                .additionalContext(Map.of("collateralIssuer", issuerName))
                .build());
    }

    public boolean blocked(ShariahScreeningResultResponse result) {
        return result != null && result.getActionTaken() == ScreeningActionTaken.BLOCKED;
    }

    public BigDecimal asBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        if (value instanceof String text && StringUtils.hasText(text)) {
            try {
                return new BigDecimal(text.replace("%", "").trim());
            } catch (NumberFormatException ex) {
                return BigDecimal.ZERO;
            }
        }
        return BigDecimal.ZERO;
    }

    public Integer asInteger(Object value) {
        if (value == null) {
            return 0;
        }
        if (value instanceof Integer integer) {
            return integer;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && StringUtils.hasText(text)) {
            try {
                return Integer.parseInt(text.trim());
            } catch (NumberFormatException ex) {
                return 0;
            }
        }
        return 0;
    }

    public String uppercase(String value) {
        return value == null ? null : value.toUpperCase(Locale.ROOT);
    }

    public BigDecimal percentage(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO.setScale(6, RoundingMode.HALF_UP);
        }
        return numerator.multiply(HUNDRED).divide(denominator, 6, RoundingMode.HALF_UP);
    }

    public BigDecimal scaleMoney(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : value.setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal scaleRate(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(6, RoundingMode.HALF_UP)
                : value.setScale(6, RoundingMode.HALF_UP);
    }

    @SuppressWarnings("unchecked")
    public Object extractValue(Map<String, Object> inputData, String path) {
        if (inputData == null || !StringUtils.hasText(path)) {
            return null;
        }
        Object current = inputData;
        for (String part : path.split("\\.")) {
            if (current instanceof Map<?, ?> map) {
                current = ((Map<String, Object>) map).get(part);
            } else {
                return null;
            }
        }
        return current;
    }

    private ContractSnapshot murabahaSnapshot(Long contractId) {
        MurabahaContract contract = murabahaContractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("MurabahaContract", "id", contractId));
        List<MurabahaInstallment> installments = murabahaInstallmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);

        BigDecimal principalPaid = installments.stream()
                .map(MurabahaInstallment::getPaidPrincipal)
                .map(this::scaleMoney)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal outstandingPrincipal = scaleMoney(contract.getFinancedAmount()).subtract(principalPaid).max(BigDecimal.ZERO);
        BigDecimal profitPaid = installments.stream()
                .map(MurabahaInstallment::getPaidProfit)
                .map(this::scaleMoney)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal deferredProfitOutstanding = scaleMoney(contract.getTotalDeferredProfit()).subtract(profitPaid).max(BigDecimal.ZERO);
        int dpd = maxDaysPastDue(installments.stream().map(MurabahaInstallment::getDaysOverdue).toList());

        Map<String, Object> specificRisk = new LinkedHashMap<>();
        specificRisk.put("deferredProfitRemaining", deferredProfitOutstanding);
        specificRisk.put("installmentsRemaining", installments.stream()
                .filter(inst -> inst.getStatus() != MurabahaDomainEnums.InstallmentStatus.PAID).count());
        specificRisk.put("markupRate", contract.getMarkupRate());

        return new ContractSnapshot(
                contract.getId(),
                contract.getContractRef(),
                "MURABAHA",
                contract.getProductCode(),
                contract.getCustomerId(),
                contract.getIslamicProductTemplateId(),
                contract.getInvestmentPoolId(),
                normalizeCategory(contract.getAssetCategory() != null ? contract.getAssetCategory().name() : null),
                outstandingPrincipal,
                deferredProfitOutstanding,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                contract.getMarkupRate(),
                BigDecimal.ZERO,
                explicitCollateralValue(contractId),
                dpd,
                specificRisk
        );
    }

    private ContractSnapshot ijarahSnapshot(Long contractId) {
        IjarahContract contract = ijarahContractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahContract", "id", contractId));
        IjarahAsset asset = contract.getIjarahAssetId() != null
                ? ijarahAssetRepository.findById(contract.getIjarahAssetId()).orElse(null)
                : ijarahAssetRepository.findByIjarahContractId(contractId).orElse(null);
        List<IjarahRentalInstallment> installments = ijarahRentalInstallmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);

        BigDecimal rentalReceivable = installments.stream()
                .filter(inst -> inst.getStatus() != IjarahDomainEnums.RentalInstallmentStatus.PAID)
                .map(inst -> scaleMoney(inst.getNetRentalAmount()).subtract(scaleMoney(inst.getPaidAmount())).max(BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal assetNbv = asset != null ? scaleMoney(asset.getNetBookValue()) : scaleMoney(contract.getAssetAcquisitionCost());
        int dpd = maxDaysPastDue(installments.stream().map(IjarahRentalInstallment::getDaysOverdue).toList());

        Map<String, Object> specificRisk = new LinkedHashMap<>();
        specificRisk.put("assetNbv", assetNbv);
        specificRisk.put("assetCondition", asset != null && asset.getCurrentCondition() != null ? asset.getCurrentCondition().name() : null);
        specificRisk.put("remainingUsefulLife", asset != null ? asset.getUsefulLifeMonths() : null);
        specificRisk.put("insuranceStatus", contract.getInsuranceExpiryDate());

        return new ContractSnapshot(
                contract.getId(),
                contract.getContractRef(),
                "IJARAH",
                contract.getProductCode(),
                contract.getCustomerId(),
                contract.getIslamicProductTemplateId(),
                contract.getInvestmentPoolId(),
                normalizeCategory(contract.getAssetCategory() != null ? contract.getAssetCategory().name() : null),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                assetNbv,
                rentalReceivable,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                contract.getBankReturnOnAsset(),
                asset != null ? scaleMoney(asset.getLastValuationAmount()) : scaleMoney(contract.getAssetResidualValue()),
                explicitCollateralValue(contractId),
                dpd,
                specificRisk
        );
    }

    private ContractSnapshot musharakahSnapshot(Long contractId) {
        MusharakahContract contract = musharakahContractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("MusharakahContract", "id", contractId));
        MusharakahOwnershipUnit ownershipUnit = musharakahOwnershipUnitRepository.findByContractId(contractId)
                .orElse(null);
        List<MusharakahRentalInstallment> rentals = musharakahRentalInstallmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
        List<MusharakahBuyoutInstallment> buyouts = musharakahBuyoutInstallmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);

        BigDecimal bankShareValue = ownershipUnit != null
                ? scaleMoney(ownershipUnit.getBankShareValue())
                : scaleMoney(contract.getBankCapitalContribution());
        BigDecimal bankOwnership = ownershipUnit != null
                ? scaleRate(ownershipUnit.getBankPercentage())
                : scaleRate(contract.getBankOwnershipPercentage());
        int dpd = maxDaysPastDue(new ArrayList<Integer>() {{
            addAll(rentals.stream().map(MusharakahRentalInstallment::getDaysOverdue).toList());
            addAll(buyouts.stream().map(b -> b.getPaidDate() == null && b.getDueDate() != null && b.getDueDate().isBefore(LocalDate.now())
                    ? (int) java.time.temporal.ChronoUnit.DAYS.between(b.getDueDate(), LocalDate.now()) : 0).toList());
        }});

        Map<String, Object> specificRisk = new LinkedHashMap<>();
        specificRisk.put("bankSharePercentage", bankOwnership);
        specificRisk.put("customerBuyoutProgress", ownershipUnit != null ? ownershipUnit.getTotalUnitsTransferred() : contract.getCustomerCurrentUnits());
        specificRisk.put("propertyValueTrend", contract.getAssetCurrentMarketValue());

        return new ContractSnapshot(
                contract.getId(),
                contract.getContractRef(),
                "MUSHARAKAH",
                contract.getProductCode(),
                contract.getCustomerId(),
                contract.getIslamicProductTemplateId(),
                contract.getInvestmentPoolId(),
                normalizeCategory(contract.getAssetCategory() != null ? contract.getAssetCategory().name() : null),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                bankShareValue,
                bankOwnership,
                contract.getBaseRentalRate(),
                scaleMoney(contract.getAssetCurrentMarketValue()),
                explicitCollateralValue(contractId),
                dpd,
                specificRisk
        );
    }

    private int maxDaysPastDue(Collection<Integer> values) {
        return values.stream()
                .filter(v -> v != null)
                .max(Integer::compareTo)
                .orElse(0);
    }

    private String normalizeCategory(String rawCategory) {
        if (!StringUtils.hasText(rawCategory)) {
            return "ALL";
        }
        return switch (uppercase(rawCategory)) {
            case "RESIDENTIAL_PROPERTY", "HOME", "HOME_PURCHASE", "PROPERTY" -> "HOME_FINANCING";
            case "COMMERCIAL_PROPERTY" -> "COMMERCIAL_PROPERTY";
            case "VEHICLE" -> "VEHICLE";
            case "EQUIPMENT", "MACHINERY" -> "EQUIPMENT";
            default -> uppercase(rawCategory);
        };
    }

    public record ContractSnapshot(Long contractId,
                                   String contractRef,
                                   String contractTypeCode,
                                   String productCode,
                                   Long customerId,
                                   Long productTemplateId,
                                   Long investmentPoolId,
                                   String productCategory,
                                   BigDecimal outstandingPrincipal,
                                   BigDecimal deferredProfitOutstanding,
                                   BigDecimal assetNetBookValue,
                                   BigDecimal rentalReceivable,
                                   BigDecimal bankShareValue,
                                   BigDecimal bankOwnershipPercentage,
                                   BigDecimal pricingMetric,
                                   BigDecimal currentMarketValue,
                                   BigDecimal explicitCollateralValue,
                                   Integer daysPastDue,
                                   Map<String, Object> contractSpecificRisk) {
    }
}
