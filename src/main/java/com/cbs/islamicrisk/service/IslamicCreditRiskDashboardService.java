package com.cbs.islamicrisk.service;

import com.cbs.islamicrisk.dto.IslamicRiskResponses;
import com.cbs.islamicrisk.entity.IslamicEclCalculation;
import com.cbs.islamicrisk.entity.IslamicFinancingRiskClassification;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import com.cbs.islamicrisk.repository.IslamicEclCalculationRepository;
import com.cbs.islamicrisk.repository.IslamicFinancingRiskClassificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IslamicCreditRiskDashboardService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final IslamicRiskSupport riskSupport;
    private final IslamicEclCalculationRepository eclCalculationRepository;
    private final IslamicFinancingRiskClassificationRepository classificationRepository;
    private final IslamicCollateralService islamicCollateralService;
    private final IslamicRiskClassificationService classificationService;
    private final IslamicEclService islamicEclService;

    public IslamicRiskResponses.IslamicCreditRiskDashboard getDashboard(LocalDate asOfDate) {
        LocalDate asOf = asOfDate != null ? asOfDate : LocalDate.now();
        DashboardFacts facts = collectFacts(asOf);
        return IslamicRiskResponses.IslamicCreditRiskDashboard.builder()
                .asOfDate(asOf)
                .portfolio(buildPortfolioOverview(facts))
                .eclByContractType(buildEclByType(facts))
                .aaoifiDistribution(buildAaoifiDistribution(facts))
                .stageMigration(buildStageMigration(asOf))
                .murabahaRisk(buildMurabahaRisk(facts))
                .ijarahRisk(buildIjarahRisk(facts))
                .musharakahRisk(buildMusharakahRisk(facts))
                .collateral(buildCollateralSummary(facts))
                .topExposures(buildTopExposures(facts))
                .trend(buildTrend(asOf))
                .build();
    }

    public IslamicRiskResponses.PortfolioOverview getPortfolioOverview(LocalDate asOfDate) {
        return buildPortfolioOverview(collectFacts(asOfDate != null ? asOfDate : LocalDate.now()));
    }

    public Map<String, IslamicRiskResponses.EclByType> getEclSummary(LocalDate asOfDate) {
        return buildEclByType(collectFacts(asOfDate != null ? asOfDate : LocalDate.now()));
    }

    public Map<String, Long> getStageDistribution(LocalDate asOfDate) {
        return collectFacts(asOfDate != null ? asOfDate : LocalDate.now()).classifications().stream()
                .collect(Collectors.groupingBy(item -> item.getIfrs9Stage().name(), LinkedHashMap::new, Collectors.counting()));
    }

    public IslamicRiskResponses.AaoifiDistribution getAaoifiClassification(LocalDate asOfDate) {
        return buildAaoifiDistribution(collectFacts(asOfDate != null ? asOfDate : LocalDate.now()));
    }

    public IslamicRiskResponses.CollateralSummaryWidget getCollateralSummary(LocalDate asOfDate) {
        return buildCollateralSummary(collectFacts(asOfDate != null ? asOfDate : LocalDate.now()));
    }

    public List<IslamicRiskResponses.TopExposure> getTopExposures(LocalDate asOfDate) {
        return buildTopExposures(collectFacts(asOfDate != null ? asOfDate : LocalDate.now()));
    }

    public List<IslamicRiskResponses.MonthlyRiskTrend> getTrend(LocalDate asOfDate) {
        return buildTrend(asOfDate != null ? asOfDate : LocalDate.now());
    }

    public Object getContractTypeView(String contractType, LocalDate asOfDate) {
        DashboardFacts facts = collectFacts(asOfDate != null ? asOfDate : LocalDate.now());
        return switch (riskSupport.uppercase(contractType)) {
            case "MURABAHA" -> buildMurabahaRisk(facts);
            case "IJARAH" -> buildIjarahRisk(facts);
            case "MUSHARAKAH" -> buildMusharakahRisk(facts);
            default -> throw new com.cbs.common.exception.BusinessException("Unsupported contract type: " + contractType,
                    "UNSUPPORTED_ISLAMIC_RISK_VIEW");
        };
    }

    private DashboardFacts collectFacts(LocalDate asOfDate) {
        List<ContractFact> facts = new ArrayList<>();
        for (String contractType : List.of("MURABAHA", "IJARAH", "MUSHARAKAH")) {
            for (Long contractId : riskSupport.activeContractIds(contractType)) {
                IslamicRiskSupport.ContractSnapshot snapshot = riskSupport.loadContract(contractId, contractType);
                IslamicEclCalculation ecl = eclCalculationRepository.findTopByContractIdOrderByCalculationDateDesc(contractId)
                        .orElseGet(() -> islamicEclService.calculateEcl(contractId, contractType, asOfDate));
                IslamicFinancingRiskClassification classification = classificationRepository.findTopByContractIdOrderByClassificationDateDesc(contractId)
                        .orElseGet(() -> classificationService.classifyContract(contractId, contractType, asOfDate));
                facts.add(new ContractFact(snapshot, ecl, classification));
            }
        }
        return new DashboardFacts(facts);
    }

    private IslamicRiskResponses.PortfolioOverview buildPortfolioOverview(DashboardFacts facts) {
        Map<String, BigDecimal> byType = new LinkedHashMap<>();
        Map<String, Integer> countByType = new LinkedHashMap<>();
        BigDecimal totalExposure = BigDecimal.ZERO;
        BigDecimal totalEcl = BigDecimal.ZERO;
        BigDecimal stage3Exposure = BigDecimal.ZERO;
        for (ContractFact fact : facts.contractFacts()) {
            BigDecimal exposure = exposureOf(fact);
            byType.merge(fact.snapshot().contractTypeCode(), exposure, BigDecimal::add);
            countByType.merge(fact.snapshot().contractTypeCode(), 1, Integer::sum);
            totalExposure = totalExposure.add(exposure);
            totalEcl = totalEcl.add(fact.ecl().getWeightedEcl() != null ? fact.ecl().getWeightedEcl() : BigDecimal.ZERO);
            if (fact.classification().getIfrs9Stage() == IslamicRiskDomainEnums.Stage.STAGE_3) {
                stage3Exposure = stage3Exposure.add(exposure);
            }
        }
        BigDecimal eclRatio = totalExposure.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO
                : totalEcl.multiply(HUNDRED).divide(totalExposure, 2, RoundingMode.HALF_UP);
        BigDecimal nplRatio = totalExposure.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO
                : stage3Exposure.multiply(HUNDRED).divide(totalExposure, 2, RoundingMode.HALF_UP);

        return IslamicRiskResponses.PortfolioOverview.builder()
                .totalIslamicFinancing(riskSupport.scaleMoney(totalExposure))
                .byContractType(byType)
                .contractCountByType(countByType)
                .totalEcl(riskSupport.scaleMoney(totalEcl))
                .eclAsPercentOfPortfolio(eclRatio)
                .nplRatio(nplRatio)
                .build();
    }

    private Map<String, IslamicRiskResponses.EclByType> buildEclByType(DashboardFacts facts) {
        Map<String, List<ContractFact>> byType = facts.contractFacts().stream()
                .collect(Collectors.groupingBy(item -> item.snapshot().contractTypeCode(), LinkedHashMap::new, Collectors.toList()));
        Map<String, IslamicRiskResponses.EclByType> result = new LinkedHashMap<>();
        for (Map.Entry<String, List<ContractFact>> entry : byType.entrySet()) {
            BigDecimal totalExposure = BigDecimal.ZERO;
            BigDecimal stage1Exposure = BigDecimal.ZERO;
            BigDecimal stage2Exposure = BigDecimal.ZERO;
            BigDecimal stage3Exposure = BigDecimal.ZERO;
            BigDecimal stage1Ecl = BigDecimal.ZERO;
            BigDecimal stage2Ecl = BigDecimal.ZERO;
            BigDecimal stage3Ecl = BigDecimal.ZERO;
            BigDecimal totalEcl = BigDecimal.ZERO;
            for (ContractFact fact : entry.getValue()) {
                BigDecimal exposure = exposureOf(fact);
                BigDecimal ecl = fact.ecl().getWeightedEcl() != null ? fact.ecl().getWeightedEcl() : BigDecimal.ZERO;
                totalExposure = totalExposure.add(exposure);
                totalEcl = totalEcl.add(ecl);
                switch (fact.classification().getIfrs9Stage()) {
                    case STAGE_1 -> {
                        stage1Exposure = stage1Exposure.add(exposure);
                        stage1Ecl = stage1Ecl.add(ecl);
                    }
                    case STAGE_2 -> {
                        stage2Exposure = stage2Exposure.add(exposure);
                        stage2Ecl = stage2Ecl.add(ecl);
                    }
                    case STAGE_3 -> {
                        stage3Exposure = stage3Exposure.add(exposure);
                        stage3Ecl = stage3Ecl.add(ecl);
                    }
                }
            }
            BigDecimal coverage = totalExposure.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO
                    : totalEcl.multiply(HUNDRED).divide(totalExposure, 2, RoundingMode.HALF_UP);
            result.put(entry.getKey(), IslamicRiskResponses.EclByType.builder()
                    .totalExposure(riskSupport.scaleMoney(totalExposure))
                    .stage1Exposure(riskSupport.scaleMoney(stage1Exposure))
                    .stage2Exposure(riskSupport.scaleMoney(stage2Exposure))
                    .stage3Exposure(riskSupport.scaleMoney(stage3Exposure))
                    .stage1Ecl(riskSupport.scaleMoney(stage1Ecl))
                    .stage2Ecl(riskSupport.scaleMoney(stage2Ecl))
                    .stage3Ecl(riskSupport.scaleMoney(stage3Ecl))
                    .totalEcl(riskSupport.scaleMoney(totalEcl))
                    .coverageRatio(coverage)
                    .build());
        }
        return result;
    }

    private IslamicRiskResponses.AaoifiDistribution buildAaoifiDistribution(DashboardFacts facts) {
        return IslamicRiskResponses.AaoifiDistribution.builder()
                .performingExposure(sumExposureByAaoifi(facts, IslamicRiskDomainEnums.AaoifiClassification.PERFORMING))
                .performingCount(countByAaoifi(facts, IslamicRiskDomainEnums.AaoifiClassification.PERFORMING))
                .watchListExposure(sumExposureByAaoifi(facts, IslamicRiskDomainEnums.AaoifiClassification.WATCH_LIST))
                .watchListCount(countByAaoifi(facts, IslamicRiskDomainEnums.AaoifiClassification.WATCH_LIST))
                .substandardExposure(sumExposureByAaoifi(facts, IslamicRiskDomainEnums.AaoifiClassification.SUBSTANDARD))
                .substandardCount(countByAaoifi(facts, IslamicRiskDomainEnums.AaoifiClassification.SUBSTANDARD))
                .doubtfulExposure(sumExposureByAaoifi(facts, IslamicRiskDomainEnums.AaoifiClassification.DOUBTFUL))
                .doubtfulCount(countByAaoifi(facts, IslamicRiskDomainEnums.AaoifiClassification.DOUBTFUL))
                .lossExposure(sumExposureByAaoifi(facts, IslamicRiskDomainEnums.AaoifiClassification.LOSS))
                .lossCount(countByAaoifi(facts, IslamicRiskDomainEnums.AaoifiClassification.LOSS))
                .build();
    }

    private IslamicRiskResponses.StageMigrationSummary buildStageMigration(LocalDate asOfDate) {
        IslamicRiskResponses.StageMigrationMatrix matrix = classificationService.getStageMigration(asOfDate.minusMonths(3), asOfDate);
        Map<String, Long> transitions = matrix.getTransitions() != null ? matrix.getTransitions() : Map.of();
        long stage1To2 = transitions.getOrDefault("STAGE_1->STAGE_2", 0L);
        long stage1To3 = transitions.getOrDefault("STAGE_1->STAGE_3", 0L);
        long stage2To1 = transitions.getOrDefault("STAGE_2->STAGE_1", 0L);
        long stage2To3 = transitions.getOrDefault("STAGE_2->STAGE_3", 0L);
        long stage3To1 = transitions.getOrDefault("STAGE_3->STAGE_1", 0L);
        long stage3To2 = transitions.getOrDefault("STAGE_3->STAGE_2", 0L);
        long deteriorations = stage1To2 + stage1To3 + stage2To3;
        long improvements = stage2To1 + stage3To1 + stage3To2;
        IslamicRiskDomainEnums.MigrationTrend trend = deteriorations > improvements
                ? IslamicRiskDomainEnums.MigrationTrend.DETERIORATING
                : improvements > deteriorations
                ? IslamicRiskDomainEnums.MigrationTrend.IMPROVING
                : IslamicRiskDomainEnums.MigrationTrend.STABLE;
        return IslamicRiskResponses.StageMigrationSummary.builder()
                .stage1To2(stage1To2)
                .stage1To3(stage1To3)
                .stage2To1(stage2To1)
                .stage2To3(stage2To3)
                .stage3To1(stage3To1)
                .stage3To2(stage3To2)
                .migrationTrend(trend)
                .build();
    }

    private IslamicRiskResponses.MurabahaRiskView buildMurabahaRisk(DashboardFacts facts) {
        List<ContractFact> murabaha = facts.byType("MURABAHA");
        BigDecimal totalOutstanding = murabaha.stream()
                .map(fact -> fact.snapshot().outstandingPrincipal())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalDeferredProfit = murabaha.stream()
                .map(fact -> fact.snapshot().deferredProfitOutstanding())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal avgMarkup = average(murabaha, fact -> fact.snapshot().pricingMetric());
        BigDecimal nplRatio = nplRatio(murabaha);
        Map<String, BigDecimal> purposeDistribution = new LinkedHashMap<>();
        for (ContractFact fact : murabaha) {
            purposeDistribution.merge(fact.snapshot().productCategory(), fact.snapshot().outstandingPrincipal(), BigDecimal::add);
        }
        return IslamicRiskResponses.MurabahaRiskView.builder()
                .totalOutstanding(riskSupport.scaleMoney(totalOutstanding))
                .totalDeferredProfit(riskSupport.scaleMoney(totalDeferredProfit))
                .averageMarkupRate(avgMarkup)
                .nplRatio(nplRatio)
                .concentrationByPurpose(purposeDistribution)
                .build();
    }

    private IslamicRiskResponses.IjarahRiskView buildIjarahRisk(DashboardFacts facts) {
        List<ContractFact> ijarah = facts.byType("IJARAH");
        BigDecimal totalAssetNbv = ijarah.stream().map(fact -> fact.snapshot().assetNetBookValue()).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalRental = ijarah.stream().map(fact -> fact.snapshot().rentalReceivable()).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal averageAssetAge = average(ijarah, fact -> BigDecimal.valueOf(
                Math.max(0, fact.snapshot().contractSpecificRisk().get("remainingUsefulLife") instanceof Number number ? number.intValue() : 0)));
        Map<String, BigDecimal> distribution = new LinkedHashMap<>();
        for (ContractFact fact : ijarah) {
            distribution.merge(fact.snapshot().productCategory(), fact.snapshot().assetNetBookValue(), BigDecimal::add);
        }
        return IslamicRiskResponses.IjarahRiskView.builder()
                .totalAssetNbv(riskSupport.scaleMoney(totalAssetNbv))
                .totalRentalReceivable(riskSupport.scaleMoney(totalRental))
                .averageAssetAge(averageAssetAge)
                .nplRatio(nplRatio(ijarah))
                .assetCategoryDistribution(distribution)
                .build();
    }

    private IslamicRiskResponses.MusharakahRiskView buildMusharakahRisk(DashboardFacts facts) {
        List<ContractFact> musharakah = facts.byType("MUSHARAKAH");
        BigDecimal totalBankShare = musharakah.stream().map(fact -> fact.snapshot().bankShareValue()).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal averageBankOwnership = average(musharakah, fact -> fact.snapshot().bankOwnershipPercentage());
        BigDecimal averageCustomerEquity = average(musharakah, fact -> HUNDRED.subtract(fact.snapshot().bankOwnershipPercentage()));
        BigDecimal propertyTrend = average(musharakah, fact -> riskSupport.asBigDecimal(fact.snapshot().contractSpecificRisk().get("propertyValueTrend")));
        return IslamicRiskResponses.MusharakahRiskView.builder()
                .totalBankShare(riskSupport.scaleMoney(totalBankShare))
                .averageBankOwnership(averageBankOwnership)
                .averageCustomerEquity(averageCustomerEquity)
                .nplRatio(nplRatio(musharakah))
                .propertyValueTrend(propertyTrend)
                .build();
    }

    private IslamicRiskResponses.CollateralSummaryWidget buildCollateralSummary(DashboardFacts facts) {
        BigDecimal totalExposure = BigDecimal.ZERO;
        BigDecimal totalCollateral = BigDecimal.ZERO;
        Map<String, BigDecimal> byType = new LinkedHashMap<>();
        int uncollateralizedCount = 0;
        BigDecimal uncollateralizedExposure = BigDecimal.ZERO;
        for (ContractFact fact : facts.contractFacts()) {
            IslamicRiskResponses.CollateralCoverageResult coverage = islamicCollateralService.calculateCoverage(
                    fact.snapshot().contractId(), fact.snapshot().contractTypeCode());
            totalExposure = totalExposure.add(coverage.getEad());
            totalCollateral = totalCollateral.add(coverage.getTotalCollateralValue());
            if (coverage.getTotalCollateralValue().compareTo(BigDecimal.ZERO) == 0) {
                uncollateralizedCount++;
                uncollateralizedExposure = uncollateralizedExposure.add(coverage.getEad());
            }
            coverage.getByCollateralType().forEach((key, value) -> byType.merge(key, value, BigDecimal::add));
        }
        BigDecimal coverageRatio = totalExposure.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO
                : totalCollateral.multiply(HUNDRED).divide(totalExposure, 2, RoundingMode.HALF_UP);
        return IslamicRiskResponses.CollateralSummaryWidget.builder()
                .totalCollateralValue(riskSupport.scaleMoney(totalCollateral))
                .totalExposure(riskSupport.scaleMoney(totalExposure))
                .overallCoverageRatio(coverageRatio)
                .byCollateralType(byType)
                .uncollateralizedContractCount(uncollateralizedCount)
                .uncollateralizedExposure(riskSupport.scaleMoney(uncollateralizedExposure))
                .build();
    }

    private List<IslamicRiskResponses.TopExposure> buildTopExposures(DashboardFacts facts) {
        return facts.contractFacts().stream()
                .sorted((left, right) -> exposureOf(right).compareTo(exposureOf(left)))
                .limit(10)
                .map(fact -> IslamicRiskResponses.TopExposure.builder()
                        .contractRef(fact.snapshot().contractRef())
                        .contractType(fact.snapshot().contractTypeCode())
                        .customerId(fact.snapshot().customerId())
                        .outstanding(riskSupport.scaleMoney(exposureOf(fact)))
                        .stage(fact.classification().getIfrs9Stage())
                        .eclAmount(riskSupport.scaleMoney(fact.ecl().getWeightedEcl()))
                        .build())
                .toList();
    }

    private List<IslamicRiskResponses.MonthlyRiskTrend> buildTrend(LocalDate asOfDate) {
        List<IslamicRiskResponses.MonthlyRiskTrend> trend = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM");
        for (int i = 11; i >= 0; i--) {
            YearMonth month = YearMonth.from(asOfDate.minusMonths(i));
            List<IslamicEclCalculation> ecls = eclCalculationRepository.findAll().stream()
                    .filter(item -> YearMonth.from(item.getCalculationDate()).equals(month))
                    .toList();
            BigDecimal totalExposure = ecls.stream().map(IslamicEclCalculation::getEad).filter(value -> value != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalEcl = ecls.stream().map(IslamicEclCalculation::getWeightedEcl).filter(value -> value != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            List<IslamicFinancingRiskClassification> classifications = classificationRepository.findAll().stream()
                    .filter(item -> YearMonth.from(item.getClassificationDate()).equals(month))
                    .toList();
            BigDecimal stage3Exposure = classifications.stream()
                    .filter(item -> item.getIfrs9Stage() == IslamicRiskDomainEnums.Stage.STAGE_3)
                    .map(IslamicFinancingRiskClassification::getOutstandingExposure)
                    .filter(value -> value != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalClassificationExposure = classifications.stream()
                    .map(IslamicFinancingRiskClassification::getOutstandingExposure)
                    .filter(value -> value != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal nplRatio = totalClassificationExposure.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO
                    : stage3Exposure.multiply(HUNDRED).divide(totalClassificationExposure, 2, RoundingMode.HALF_UP);
            BigDecimal coverageRatio = totalExposure.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO
                    : totalEcl.multiply(HUNDRED).divide(totalExposure, 2, RoundingMode.HALF_UP);
            trend.add(IslamicRiskResponses.MonthlyRiskTrend.builder()
                    .month(month.format(formatter))
                    .totalExposure(riskSupport.scaleMoney(totalExposure))
                    .nplRatio(nplRatio)
                    .totalEcl(riskSupport.scaleMoney(totalEcl))
                    .coverageRatio(coverageRatio)
                    .build());
        }
        return trend;
    }

    private BigDecimal sumExposureByAaoifi(DashboardFacts facts, IslamicRiskDomainEnums.AaoifiClassification classification) {
        return facts.contractFacts().stream()
                .filter(item -> item.classification().getAaoifiClassification() == classification)
                .map(this::exposureOf)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private long countByAaoifi(DashboardFacts facts, IslamicRiskDomainEnums.AaoifiClassification classification) {
        return facts.contractFacts().stream()
                .filter(item -> item.classification().getAaoifiClassification() == classification)
                .count();
    }

    private BigDecimal nplRatio(List<ContractFact> facts) {
        BigDecimal total = facts.stream().map(this::exposureOf).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal impaired = facts.stream()
                .filter(item -> item.classification().getIfrs9Stage() == IslamicRiskDomainEnums.Stage.STAGE_3)
                .map(this::exposureOf)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO
                : impaired.multiply(HUNDRED).divide(total, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal average(List<ContractFact> facts, Function<ContractFact, BigDecimal> extractor) {
        if (facts.isEmpty()) {
            return BigDecimal.ZERO;
        }
        BigDecimal total = facts.stream()
                .map(extractor)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.divide(BigDecimal.valueOf(facts.size()), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal exposureOf(ContractFact fact) {
        return fact.ecl().getEad() != null ? fact.ecl().getEad() : BigDecimal.ZERO;
    }

    private record ContractFact(IslamicRiskSupport.ContractSnapshot snapshot,
                                IslamicEclCalculation ecl,
                                IslamicFinancingRiskClassification classification) {
    }

    private record DashboardFacts(List<ContractFact> contractFacts) {
        List<ContractFact> byType(String contractType) {
            return contractFacts.stream().filter(item -> contractType.equals(item.snapshot().contractTypeCode())).toList();
        }

        List<IslamicFinancingRiskClassification> classifications() {
            return contractFacts.stream().map(ContractFact::classification).toList();
        }
    }
}
