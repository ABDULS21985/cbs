package com.cbs.islamicrisk.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.islamicrisk.dto.IslamicRiskResponses;
import com.cbs.islamicrisk.entity.IslamicCreditAssessment;
import com.cbs.islamicrisk.entity.IslamicEclCalculation;
import com.cbs.islamicrisk.entity.IslamicEclConfiguration;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import com.cbs.islamicrisk.repository.IslamicEclCalculationRepository;
import com.cbs.islamicrisk.repository.IslamicEclConfigurationRepository;
import com.cbs.profitdistribution.dto.RecordPoolExpenseRequest;
import com.cbs.profitdistribution.entity.ExpenseType;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IslamicEclService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final IslamicEclConfigurationRepository configurationRepository;
    private final IslamicEclCalculationRepository calculationRepository;
    private final IslamicRiskSupport riskSupport;
    private final GeneralLedgerService generalLedgerService;
    private final PoolAssetManagementService poolAssetManagementService;

    @Transactional
    public IslamicEclCalculation calculateEcl(Long contractId, String contractTypeCode, LocalDate calculationDate) {
        LocalDate asOf = calculationDate != null ? calculationDate : LocalDate.now();
        IslamicRiskSupport.ContractSnapshot snapshot = riskSupport.loadContract(contractId, contractTypeCode);
        IslamicEclConfiguration config = getConfig(snapshot.contractTypeCode(), snapshot.productCategory());
        IslamicCreditAssessment assessment = riskSupport.latestAssessment(snapshot.customerId(), snapshot.contractTypeCode());
        IslamicEclCalculation previous = calculationRepository.findTopByContractIdOrderByCalculationDateDesc(contractId).orElse(null);

        BigDecimal pd12 = resolvePd12(config, assessment);
        BigDecimal pdLifetime = resolvePdLifetime(config, assessment);
        IslamicRiskDomainEnums.Stage currentStage = determineStage(snapshot.daysPastDue(), config, assessment);
        BigDecimal appliedPd = currentStage == IslamicRiskDomainEnums.Stage.STAGE_1 ? pd12 : pdLifetime;

        EadResult eadResult = calculateEad(snapshot, config);
        LgdResult lgdResult = calculateLgd(snapshot, config, eadResult.ead(), eadResult.collateralValue());
        ScenarioBundle scenarioBundle = calculateScenarioBundle(appliedPd, lgdResult.lgd(), eadResult.ead(), config);

        BigDecimal previousWeightedEcl = previous != null && previous.getWeightedEcl() != null ? previous.getWeightedEcl() : BigDecimal.ZERO;
        BigDecimal weightedEcl = riskSupport.scaleMoney(scenarioBundle.weightedEcl());
        BigDecimal change = riskSupport.scaleMoney(weightedEcl.subtract(previousWeightedEcl));

        IslamicEclCalculation calculation = IslamicEclCalculation.builder()
                .calculationRef(riskSupport.nextRef("IECL"))
                .calculationDate(asOf)
                .contractId(snapshot.contractId())
                .contractRef(snapshot.contractRef())
                .contractTypeCode(snapshot.contractTypeCode())
                .configId(config.getId())
                .currentStage(currentStage)
                .previousStage(previous != null ? previous.getCurrentStage() : null)
                .stagingReason(buildStageReason(snapshot.daysPastDue(), currentStage, assessment, config))
                .daysPastDue(snapshot.daysPastDue())
                .stageChanged(previous == null || previous.getCurrentStage() != currentStage)
                .pd12Month(pd12)
                .pdLifetime(pdLifetime)
                .appliedPd(appliedPd)
                .lgd(lgdResult.lgd())
                .ead(eadResult.ead())
                .eadBreakdown(eadResult.breakdown())
                .eclAmount(riskSupport.scaleMoney(appliedPd.multiply(lgdResult.lgd()).multiply(eadResult.ead())))
                .eclAmountPrevious(previous != null ? previous.getWeightedEcl() : BigDecimal.ZERO)
                .eclChange(change)
                .scenarioResults(scenarioBundle.results())
                .weightedEcl(weightedEcl)
                .collateralValue(eadResult.collateralValue())
                .collateralHaircut(lgdResult.collateralHaircut())
                .collateralAdjustedLgd(lgdResult.lgd())
                .provisionAmount(weightedEcl)
                .provisionChange(change)
                .calculatedBy(riskSupport.currentActor())
                .calculatedAt(LocalDateTime.now())
                .tenantId(riskSupport.currentTenantId())
                .build();
        return calculationRepository.save(calculation);
    }

    @Transactional
    public IslamicRiskResponses.EclBatchResult calculateEclBatch(String contractTypeCode, LocalDate calculationDate) {
        String normalizedType = riskSupport.uppercase(contractTypeCode);
        List<Long> contractIds = riskSupport.activeContractIds(normalizedType);
        Map<String, BigDecimal> eclByStage = new LinkedHashMap<>();
        Map<String, Long> countByStage = new LinkedHashMap<>();
        BigDecimal totalEcl = BigDecimal.ZERO;
        BigDecimal totalExposure = BigDecimal.ZERO;

        for (Long contractId : contractIds) {
            IslamicEclCalculation calculation = calculateEcl(contractId, normalizedType, calculationDate);
            totalEcl = totalEcl.add(calculation.getWeightedEcl() != null ? calculation.getWeightedEcl() : BigDecimal.ZERO);
            totalExposure = totalExposure.add(calculation.getEad() != null ? calculation.getEad() : BigDecimal.ZERO);
            eclByStage.merge(calculation.getCurrentStage().name(), calculation.getWeightedEcl(), BigDecimal::add);
            countByStage.merge(calculation.getCurrentStage().name(), 1L, Long::sum);
        }

        return IslamicRiskResponses.EclBatchResult.builder()
                .contractTypeCode(normalizedType)
                .calculationDate(calculationDate != null ? calculationDate : LocalDate.now())
                .contractsProcessed(contractIds.size())
                .totalEcl(riskSupport.scaleMoney(totalEcl))
                .totalExposure(riskSupport.scaleMoney(totalExposure))
                .eclByStage(eclByStage)
                .countByStage(countByStage)
                .build();
    }

    @Transactional
    public List<IslamicRiskResponses.EclBatchResult> calculateAllEcl(LocalDate calculationDate) {
        return List.of(
                calculateEclBatch("MURABAHA", calculationDate),
                calculateEclBatch("IJARAH", calculationDate),
                calculateEclBatch("MUSHARAKAH", calculationDate)
        );
    }

    @Transactional
    public void postProvisions(LocalDate calculationDate) {
        LocalDate asOf = calculationDate != null ? calculationDate : LocalDate.now();
        for (IslamicEclCalculation calculation : calculationRepository.findByCalculationDate(asOf)) {
            BigDecimal change = calculation.getProvisionChange() != null ? calculation.getProvisionChange() : BigDecimal.ZERO;
            if (change.compareTo(BigDecimal.ZERO) == 0 || StringUtils.hasText(calculation.getProvisionJournalRef())) {
                continue;
            }

            boolean increase = change.compareTo(BigDecimal.ZERO) > 0;
            BigDecimal amount = riskSupport.scaleMoney(change.abs());
            GlCodes glCodes = glCodes(calculation.getContractTypeCode());
            List<GeneralLedgerService.JournalLineRequest> lines = increase
                    ? List.of(
                    new GeneralLedgerService.JournalLineRequest(glCodes.expenseGl(), amount, BigDecimal.ZERO, "SAR",
                            BigDecimal.ONE, "Islamic ECL provision expense", null, "HEAD", null, null),
                    new GeneralLedgerService.JournalLineRequest(glCodes.provisionGl(), BigDecimal.ZERO, amount, "SAR",
                            BigDecimal.ONE, "Islamic ECL provision", null, "HEAD", null, null))
                    : List.of(
                    new GeneralLedgerService.JournalLineRequest(glCodes.provisionGl(), amount, BigDecimal.ZERO, "SAR",
                            BigDecimal.ONE, "Islamic ECL provision release", null, "HEAD", null, null),
                    new GeneralLedgerService.JournalLineRequest(glCodes.reversalIncomeGl(), BigDecimal.ZERO, amount, "SAR",
                            BigDecimal.ONE, "Islamic ECL provision reversal", null, "HEAD", null, null));

            JournalEntry journal = generalLedgerService.postJournal(
                    increase ? "ISLAMIC_ECL_PROVISION" : "ISLAMIC_ECL_RELEASE",
                    "Islamic ECL movement for " + calculation.getContractRef(),
                    "ISLAMIC_RISK",
                    calculation.getCalculationRef(),
                    asOf,
                    lines
            );
            calculation.setProvisionJournalRef(journal.getJournalNumber());
            calculationRepository.save(calculation);

            IslamicRiskSupport.ContractSnapshot snapshot = riskSupport.loadContract(calculation.getContractId(), calculation.getContractTypeCode());
            if (increase && snapshot.investmentPoolId() != null) {
                poolAssetManagementService.recordExpense(snapshot.investmentPoolId(), RecordPoolExpenseRequest.builder()
                        .poolId(snapshot.investmentPoolId())
                        .expenseType(ExpenseType.IMPAIRMENT_PROVISION.name())
                        .amount(amount)
                        .currencyCode("SAR")
                        .expenseDate(asOf)
                        .periodFrom(asOf.withDayOfMonth(1))
                        .periodTo(asOf)
                        .journalRef(journal.getJournalNumber())
                        .description("Islamic ECL provision for " + calculation.getContractRef())
                        .allocationMethod("DIRECT")
                        .build());
            }
        }
    }

    public IslamicEclCalculation getLatestEcl(Long contractId) {
        return calculationRepository.findTopByContractIdOrderByCalculationDateDesc(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicEclCalculation", "contractId", contractId));
    }

    public List<IslamicEclCalculation> getEclHistory(Long contractId) {
        return calculationRepository.findByContractIdOrderByCalculationDateDesc(contractId);
    }

    public IslamicRiskResponses.EclPortfolioSummary getEclSummary(LocalDate calculationDate) {
        LocalDate asOf = calculationDate != null ? calculationDate : LocalDate.now();
        List<IslamicEclCalculation> calculations = calculationRepository.findByCalculationDate(asOf);
        Map<String, BigDecimal> exposureByStage = new LinkedHashMap<>();
        Map<String, Long> countByStage = new LinkedHashMap<>();
        BigDecimal murabaha = BigDecimal.ZERO;
        BigDecimal ijarah = BigDecimal.ZERO;
        BigDecimal musharakah = BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;
        for (IslamicEclCalculation calculation : calculations) {
            BigDecimal weighted = calculation.getWeightedEcl() != null ? calculation.getWeightedEcl() : BigDecimal.ZERO;
            total = total.add(weighted);
            switch (calculation.getContractTypeCode()) {
                case "MURABAHA" -> murabaha = murabaha.add(weighted);
                case "IJARAH" -> ijarah = ijarah.add(weighted);
                case "MUSHARAKAH" -> musharakah = musharakah.add(weighted);
                default -> {
                }
            }
            exposureByStage.merge(calculation.getCurrentStage().name(), calculation.getEad(), BigDecimal::add);
            countByStage.merge(calculation.getCurrentStage().name(), 1L, Long::sum);
        }
        return IslamicRiskResponses.EclPortfolioSummary.builder()
                .calculationDate(asOf)
                .totalEcl(riskSupport.scaleMoney(total))
                .murabahaEcl(riskSupport.scaleMoney(murabaha))
                .ijarahEcl(riskSupport.scaleMoney(ijarah))
                .musharakahEcl(riskSupport.scaleMoney(musharakah))
                .exposureByStage(exposureByStage)
                .countByStage(countByStage)
                .build();
    }

    public IslamicRiskResponses.EclMovementReport getEclMovement(LocalDate from, LocalDate to) {
        List<IslamicEclCalculation> calculations = calculationRepository.findAll().stream()
                .filter(item -> !item.getCalculationDate().isBefore(from) && !item.getCalculationDate().isAfter(to))
                .toList();
        BigDecimal additional = calculations.stream()
                .map(IslamicEclCalculation::getProvisionChange)
                .filter(value -> value != null && value.compareTo(BigDecimal.ZERO) > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal releases = calculations.stream()
                .map(IslamicEclCalculation::getProvisionChange)
                .filter(value -> value != null && value.compareTo(BigDecimal.ZERO) < 0)
                .map(BigDecimal::abs)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal closing = calculations.stream()
                .filter(item -> item.getCalculationDate().equals(to))
                .map(IslamicEclCalculation::getWeightedEcl)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal opening = calculations.stream()
                .filter(item -> item.getCalculationDate().equals(from))
                .map(IslamicEclCalculation::getWeightedEcl)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return IslamicRiskResponses.EclMovementReport.builder()
                .from(from)
                .to(to)
                .openingEcl(riskSupport.scaleMoney(opening))
                .additionalProvisions(riskSupport.scaleMoney(additional))
                .releases(riskSupport.scaleMoney(releases))
                .writeOffs(BigDecimal.ZERO)
                .closingEcl(riskSupport.scaleMoney(closing))
                .build();
    }

    public IslamicRiskResponses.StageDistribution getStageDistribution(String contractTypeCode) {
        String normalizedType = riskSupport.uppercase(contractTypeCode);
        List<IslamicEclCalculation> calculations = calculationRepository.findAll().stream()
                .filter(item -> normalizedType.equals(item.getContractTypeCode()))
                .toList();
        Map<String, Long> countByStage = new LinkedHashMap<>();
        Map<String, BigDecimal> exposureByStage = new LinkedHashMap<>();
        for (IslamicEclCalculation calculation : calculations) {
            countByStage.merge(calculation.getCurrentStage().name(), 1L, Long::sum);
            exposureByStage.merge(calculation.getCurrentStage().name(), calculation.getEad(), BigDecimal::add);
        }
        return IslamicRiskResponses.StageDistribution.builder()
                .contractTypeCode(normalizedType)
                .contractCountByStage(countByStage)
                .exposureByStage(exposureByStage)
                .build();
    }

    public List<IslamicEclConfiguration> getConfigs() {
        return configurationRepository.findAll();
    }

    @Transactional
    public IslamicEclConfiguration createConfig(com.cbs.islamicrisk.dto.IslamicRiskRequests.EclConfigRequest request) {
        IslamicEclConfiguration config = IslamicEclConfiguration.builder()
                .configCode(request.getConfigCode())
                .name(request.getName())
                .contractTypeCode(riskSupport.uppercase(request.getContractTypeCode()))
                .productCategory(StringUtils.hasText(request.getProductCategory()) ? riskSupport.uppercase(request.getProductCategory()) : null)
                .pdModel(request.getPdModel())
                .pdCalibrationData(new LinkedHashMap<>(request.getPdCalibrationData()))
                .pdTermStructure(new LinkedHashMap<>(request.getPdTermStructure()))
                .pdForwardLookingAdjustment(request.getPdForwardLookingAdjustment())
                .pdScenarioWeights(new LinkedHashMap<>(request.getPdScenarioWeights()))
                .lgdModel(request.getLgdModel())
                .baseLgd(request.getBaseLgd())
                .murabahaLgdFactors(new LinkedHashMap<>(request.getMurabahaLgdFactors()))
                .ijarahLgdFactors(new LinkedHashMap<>(request.getIjarahLgdFactors()))
                .musharakahLgdFactors(new LinkedHashMap<>(request.getMusharakahLgdFactors()))
                .eadCalculationMethod(request.getEadCalculationMethod())
                .excludeDeferredProfit(request.getExcludeDeferredProfit())
                .includeAssetOwnership(request.getIncludeAssetOwnership())
                .useCurrentShareNotOriginal(request.getUseCurrentShareNotOriginal())
                .includePer(request.getIncludePer())
                .includeIrr(request.getIncludeIrr())
                .stage1DpdThreshold(request.getStage1DpdThreshold())
                .stage2DpdThreshold(request.getStage2DpdThreshold())
                .stage3DpdThreshold(request.getStage3DpdThreshold())
                .significantIncreasePdThreshold(request.getSignificantIncreasePdThreshold())
                .effectiveFrom(request.getEffectiveFrom())
                .status(request.getStatus())
                .approvedBy(request.getApprovedBy())
                .tenantId(riskSupport.currentTenantId())
                .build();
        return configurationRepository.save(config);
    }

    @Transactional
    public IslamicEclConfiguration updateConfig(Long configId, com.cbs.islamicrisk.dto.IslamicRiskRequests.EclConfigRequest request) {
        IslamicEclConfiguration config = configurationRepository.findById(configId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicEclConfiguration", "id", configId));
        config.setName(request.getName());
        config.setContractTypeCode(riskSupport.uppercase(request.getContractTypeCode()));
        config.setProductCategory(StringUtils.hasText(request.getProductCategory()) ? riskSupport.uppercase(request.getProductCategory()) : null);
        config.setPdModel(request.getPdModel());
        config.setPdCalibrationData(new LinkedHashMap<>(request.getPdCalibrationData()));
        config.setPdTermStructure(new LinkedHashMap<>(request.getPdTermStructure()));
        config.setPdForwardLookingAdjustment(request.getPdForwardLookingAdjustment());
        config.setPdScenarioWeights(new LinkedHashMap<>(request.getPdScenarioWeights()));
        config.setLgdModel(request.getLgdModel());
        config.setBaseLgd(request.getBaseLgd());
        config.setMurabahaLgdFactors(new LinkedHashMap<>(request.getMurabahaLgdFactors()));
        config.setIjarahLgdFactors(new LinkedHashMap<>(request.getIjarahLgdFactors()));
        config.setMusharakahLgdFactors(new LinkedHashMap<>(request.getMusharakahLgdFactors()));
        config.setEadCalculationMethod(request.getEadCalculationMethod());
        config.setExcludeDeferredProfit(request.getExcludeDeferredProfit());
        config.setIncludeAssetOwnership(request.getIncludeAssetOwnership());
        config.setUseCurrentShareNotOriginal(request.getUseCurrentShareNotOriginal());
        config.setIncludePer(request.getIncludePer());
        config.setIncludeIrr(request.getIncludeIrr());
        config.setStage1DpdThreshold(request.getStage1DpdThreshold());
        config.setStage2DpdThreshold(request.getStage2DpdThreshold());
        config.setStage3DpdThreshold(request.getStage3DpdThreshold());
        config.setSignificantIncreasePdThreshold(request.getSignificantIncreasePdThreshold());
        config.setEffectiveFrom(request.getEffectiveFrom());
        config.setStatus(request.getStatus());
        config.setApprovedBy(request.getApprovedBy());
        return configurationRepository.save(config);
    }

    public IslamicEclConfiguration getConfig(String contractTypeCode, String productCategory) {
        String normalizedType = riskSupport.uppercase(contractTypeCode);
        String normalizedCategory = StringUtils.hasText(productCategory) ? riskSupport.uppercase(productCategory) : null;
        if (normalizedCategory != null) {
            return configurationRepository.findFirstByContractTypeCodeAndProductCategoryAndStatusOrderByEffectiveFromDesc(
                            normalizedType, normalizedCategory, IslamicRiskDomainEnums.EclConfigStatus.ACTIVE)
                    .orElseGet(() -> configurationRepository.findFirstByContractTypeCodeAndStatusOrderByEffectiveFromDesc(
                                    normalizedType, IslamicRiskDomainEnums.EclConfigStatus.ACTIVE)
                            .orElseThrow(() -> new ResourceNotFoundException("IslamicEclConfiguration", "contractTypeCode", normalizedType)));
        }
        return configurationRepository.findFirstByContractTypeCodeAndStatusOrderByEffectiveFromDesc(
                        normalizedType, IslamicRiskDomainEnums.EclConfigStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicEclConfiguration", "contractTypeCode", normalizedType));
    }

    private IslamicRiskDomainEnums.Stage determineStage(Integer dpd,
                                                        IslamicEclConfiguration config,
                                                        IslamicCreditAssessment assessment) {
        int daysPastDue = dpd != null ? dpd : 0;
        int stage2Threshold = config.getStage2DpdThreshold() != null ? config.getStage2DpdThreshold() : 30;
        int stage3Threshold = config.getStage3DpdThreshold() != null ? config.getStage3DpdThreshold() : 90;
        if (daysPastDue >= stage3Threshold) {
            return IslamicRiskDomainEnums.Stage.STAGE_3;
        }
        if (daysPastDue > stage2Threshold) {
            return IslamicRiskDomainEnums.Stage.STAGE_2;
        }
        if (assessment != null && assessment.getInputData() != null) {
            BigDecimal originationPd = riskSupport.asBigDecimal(assessment.getInputData().get("originationPd"));
            BigDecimal currentPd = assessment.getEstimatedPd() != null ? assessment.getEstimatedPd() : BigDecimal.ZERO;
            BigDecimal threshold = config.getSignificantIncreasePdThreshold() != null
                    ? config.getSignificantIncreasePdThreshold() : new BigDecimal("0.050000");
            if (currentPd.subtract(originationPd).compareTo(threshold) > 0) {
                return IslamicRiskDomainEnums.Stage.STAGE_2;
            }
        }
        return IslamicRiskDomainEnums.Stage.STAGE_1;
    }

    private String buildStageReason(Integer dpd, IslamicRiskDomainEnums.Stage stage,
                                    IslamicCreditAssessment assessment, IslamicEclConfiguration config) {
        if (stage == IslamicRiskDomainEnums.Stage.STAGE_3) {
            return "DPD > " + (config.getStage3DpdThreshold() != null ? config.getStage3DpdThreshold() : 90);
        }
        if (stage == IslamicRiskDomainEnums.Stage.STAGE_2) {
            BigDecimal originationPd = assessment != null && assessment.getInputData() != null
                    ? riskSupport.asBigDecimal(assessment.getInputData().get("originationPd")) : BigDecimal.ZERO;
            BigDecimal currentPd = assessment != null && assessment.getEstimatedPd() != null
                    ? assessment.getEstimatedPd() : BigDecimal.ZERO;
            BigDecimal threshold = config.getSignificantIncreasePdThreshold() != null
                    ? config.getSignificantIncreasePdThreshold() : new BigDecimal("0.050000");
            if (currentPd.subtract(originationPd).compareTo(threshold) > 0) {
                return "Significant increase in PD since origination";
            }
            return "DPD > " + (config.getStage2DpdThreshold() != null ? config.getStage2DpdThreshold() : 30);
        }
        return "Performing exposure (DPD=" + (dpd != null ? dpd : 0) + ")";
    }

    private BigDecimal resolvePd12(IslamicEclConfiguration config, IslamicCreditAssessment assessment) {
        BigDecimal base = assessment != null && assessment.getEstimatedPd() != null
                ? assessment.getEstimatedPd()
                : nearestTermPd(config.getPdTermStructure(), 12);
        return applyForwardLookingAdjustment(base, config.getPdForwardLookingAdjustment());
    }

    private BigDecimal resolvePdLifetime(IslamicEclConfiguration config, IslamicCreditAssessment assessment) {
        BigDecimal termPd = config.getPdTermStructure().isEmpty()
                ? resolvePd12(config, assessment)
                : config.getPdTermStructure().entrySet().stream()
                .sorted((left, right) -> Integer.compare(Integer.parseInt(left.getKey()), Integer.parseInt(right.getKey())))
                .map(entry -> riskSupport.asBigDecimal(entry.getValue()))
                .reduce((first, second) -> second)
                .orElse(resolvePd12(config, assessment));
        if (assessment != null && assessment.getEstimatedPd() != null) {
            termPd = termPd.max(assessment.getEstimatedPd());
        }
        return applyForwardLookingAdjustment(termPd, config.getPdForwardLookingAdjustment());
    }

    private BigDecimal nearestTermPd(Map<String, Object> termStructure, int months) {
        if (termStructure == null || termStructure.isEmpty()) {
            return BigDecimal.ZERO;
        }
        return termStructure.entrySet().stream()
                .min((left, right) -> Integer.compare(Math.abs(Integer.parseInt(left.getKey()) - months),
                        Math.abs(Integer.parseInt(right.getKey()) - months)))
                .map(entry -> riskSupport.asBigDecimal(entry.getValue()))
                .orElse(BigDecimal.ZERO);
    }

    private BigDecimal applyForwardLookingAdjustment(BigDecimal pd, BigDecimal adjustment) {
        BigDecimal basePd = pd != null ? pd : BigDecimal.ZERO;
        if (adjustment == null) {
            return basePd.setScale(6, RoundingMode.HALF_UP);
        }
        return basePd.multiply(BigDecimal.ONE.add(adjustment)).setScale(6, RoundingMode.HALF_UP);
    }

    private EadResult calculateEad(IslamicRiskSupport.ContractSnapshot snapshot, IslamicEclConfiguration config) {
        Map<String, Object> breakdown = new LinkedHashMap<>();
        BigDecimal ead;
        BigDecimal collateralValue;
        switch (snapshot.contractTypeCode()) {
            case "MURABAHA" -> {
                ead = snapshot.outstandingPrincipal();
                collateralValue = snapshot.explicitCollateralValue();
                breakdown.put("outstandingPrincipal", snapshot.outstandingPrincipal());
                breakdown.put("deferredProfitExcluded", config.getExcludeDeferredProfit());
                breakdown.put("deferredProfitOutstanding", snapshot.deferredProfitOutstanding());
                breakdown.put("netReceivable", ead);
            }
            case "IJARAH" -> {
                ead = snapshot.assetNetBookValue().add(snapshot.rentalReceivable());
                collateralValue = snapshot.assetNetBookValue().add(snapshot.explicitCollateralValue());
                breakdown.put("assetNbv", snapshot.assetNetBookValue());
                breakdown.put("rentalReceivable", snapshot.rentalReceivable());
                breakdown.put("totalEad", ead);
            }
            case "MUSHARAKAH" -> {
                ead = snapshot.bankShareValue();
                collateralValue = snapshot.bankShareValue().add(snapshot.explicitCollateralValue());
                breakdown.put("bankCurrentUnits", snapshot.contractSpecificRisk().get("bankSharePercentage"));
                breakdown.put("unitValue", snapshot.currentMarketValue());
                breakdown.put("bankShareValue", snapshot.bankShareValue());
            }
            default -> throw new BusinessException("Unsupported Islamic contract type: " + snapshot.contractTypeCode(),
                    "UNSUPPORTED_ISLAMIC_ECL_TYPE");
        }
        return new EadResult(riskSupport.scaleMoney(ead), breakdown, riskSupport.scaleMoney(collateralValue));
    }

    private LgdResult calculateLgd(IslamicRiskSupport.ContractSnapshot snapshot,
                                   IslamicEclConfiguration config,
                                   BigDecimal ead,
                                   BigDecimal collateralValue) {
        BigDecimal baseLgd = normalizeRate(config.getBaseLgd());
        Map<String, Object> factors = switch (snapshot.contractTypeCode()) {
            case "MURABAHA" -> config.getMurabahaLgdFactors();
            case "IJARAH" -> config.getIjarahLgdFactors();
            case "MUSHARAKAH" -> config.getMusharakahLgdFactors();
            default -> Map.of();
        };
        BigDecimal haircut = normalizeRate(riskSupport.asBigDecimal(factors.getOrDefault("collateralHaircut",
                factors.getOrDefault("assetLiquidationHaircut",
                        factors.getOrDefault("partialOwnershipDiscount", BigDecimal.ZERO)))));
        BigDecimal effectiveCollateral = collateralValue.multiply(BigDecimal.ONE.subtract(haircut));

        BigDecimal lgd;
        switch (snapshot.contractTypeCode()) {
            case "MURABAHA" -> {
                BigDecimal recoveryRate = normalizeRate(riskSupport.asBigDecimal(factors.getOrDefault("collateralRecoveryRate", 70)));
                BigDecimal coverage = ead.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO
                        : effectiveCollateral.divide(ead, 6, RoundingMode.HALF_UP).min(BigDecimal.ONE);
                lgd = baseLgd.multiply(BigDecimal.ONE.subtract(coverage.multiply(recoveryRate)));
            }
            case "IJARAH" -> {
                BigDecimal assetRecoveryRate = normalizeRate(riskSupport.asBigDecimal(factors.getOrDefault("assetRecoveryRate", 80)));
                lgd = baseLgd.multiply(BigDecimal.ONE.subtract(assetRecoveryRate.multiply(BigDecimal.ONE.subtract(haircut))));
            }
            case "MUSHARAKAH" -> {
                BigDecimal recoveryRate = normalizeRate(riskSupport.asBigDecimal(factors.getOrDefault("forcedSaleRecovery", 65)));
                lgd = baseLgd.multiply(BigDecimal.ONE.subtract(recoveryRate.multiply(BigDecimal.ONE.subtract(haircut))));
            }
            default -> lgd = baseLgd;
        }
        return new LgdResult(lgd.max(BigDecimal.ZERO).setScale(6, RoundingMode.HALF_UP), haircut);
    }

    private ScenarioBundle calculateScenarioBundle(BigDecimal appliedPd,
                                                   BigDecimal lgd,
                                                   BigDecimal ead,
                                                   IslamicEclConfiguration config) {
        Map<String, Object> weights = config.getPdScenarioWeights() != null && !config.getPdScenarioWeights().isEmpty()
                ? config.getPdScenarioWeights()
                : defaultScenarioWeights();
        Map<String, Object> results = new LinkedHashMap<>();
        BigDecimal weightedEcl = BigDecimal.ZERO;
        for (String scenario : List.of("BASE", "UPSIDE", "DOWNSIDE")) {
            BigDecimal weight = normalizeRate(riskSupport.asBigDecimal(weights.getOrDefault(scenario, scenario.equals("BASE") ? 50 : 25)));
            BigDecimal scenarioPd = switch (scenario) {
                case "UPSIDE" -> appliedPd.multiply(new BigDecimal("0.80"));
                case "DOWNSIDE" -> appliedPd.multiply(new BigDecimal("1.25"));
                default -> appliedPd;
            };
            BigDecimal scenarioLgd = switch (scenario) {
                case "UPSIDE" -> lgd.multiply(new BigDecimal("0.90"));
                case "DOWNSIDE" -> lgd.multiply(new BigDecimal("1.15"));
                default -> lgd;
            };
            BigDecimal scenarioEcl = riskSupport.scaleMoney(scenarioPd.multiply(scenarioLgd).multiply(ead));

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("pd", scenarioPd.setScale(6, RoundingMode.HALF_UP));
            payload.put("lgd", scenarioLgd.setScale(6, RoundingMode.HALF_UP));
            payload.put("ead", ead);
            payload.put("ecl", scenarioEcl);
            payload.put("weight", weight);
            results.put(scenario, payload);

            weightedEcl = weightedEcl.add(scenarioEcl.multiply(weight));
        }
        return new ScenarioBundle(results, weightedEcl);
    }

    private Map<String, Object> defaultScenarioWeights() {
        Map<String, Object> weights = new LinkedHashMap<>();
        weights.put("BASE", new BigDecimal("50"));
        weights.put("UPSIDE", new BigDecimal("20"));
        weights.put("DOWNSIDE", new BigDecimal("30"));
        return weights;
    }

    private BigDecimal normalizeRate(BigDecimal value) {
        BigDecimal raw = value != null ? value : BigDecimal.ZERO;
        if (raw.compareTo(BigDecimal.ONE) > 0) {
            return raw.divide(HUNDRED, 6, RoundingMode.HALF_UP);
        }
        return raw.setScale(6, RoundingMode.HALF_UP);
    }

    private GlCodes glCodes(String contractTypeCode) {
        return switch (riskSupport.uppercase(contractTypeCode)) {
            case "MURABAHA" -> new GlCodes("6300-000-001", "1700-MRB-001", "6300-000-001");
            case "IJARAH" -> new GlCodes("6230-IJR-001", "1700-IJR-001", "6230-IJR-001");
            case "MUSHARAKAH" -> new GlCodes("6270-MSH-001", "1700-MSH-001", "6270-MSH-001");
            default -> throw new BusinessException("Unsupported contract type for provision posting: " + contractTypeCode,
                    "UNSUPPORTED_PROVISION_TYPE");
        };
    }

    private record EadResult(BigDecimal ead, Map<String, Object> breakdown, BigDecimal collateralValue) {
    }

    private record LgdResult(BigDecimal lgd, BigDecimal collateralHaircut) {
    }

    private record ScenarioBundle(Map<String, Object> results, BigDecimal weightedEcl) {
    }

    private record GlCodes(String expenseGl, String provisionGl, String reversalIncomeGl) {
    }
}
