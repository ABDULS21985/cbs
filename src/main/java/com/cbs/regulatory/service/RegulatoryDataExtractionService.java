package com.cbs.regulatory.service;

import com.cbs.gl.entity.GlBalance;
import com.cbs.gl.islamic.dto.AaoifiBalanceSheet;
import com.cbs.gl.islamic.entity.PoolStatus;
import com.cbs.gl.islamic.entity.PoolType;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.gl.islamic.service.IslamicChartOfAccountsService;
import com.cbs.gl.repository.GlBalanceRepository;
import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.islamicaml.dto.IslamicAmlDashboard;
import com.cbs.islamicaml.service.IslamicAmlDashboardService;
import com.cbs.islamicrisk.dto.IslamicRiskResponses;
import com.cbs.islamicrisk.entity.IslamicEclCalculation;
import com.cbs.islamicrisk.entity.IslamicFinancingRiskClassification;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import com.cbs.islamicrisk.repository.IslamicEclCalculationRepository;
import com.cbs.islamicrisk.repository.IslamicFinancingRiskClassificationRepository;
import com.cbs.islamicrisk.service.IslamicCollateralService;
import com.cbs.islamicrisk.service.IslamicCreditRiskDashboardService;
import com.cbs.islamicrisk.service.IslamicRiskSupport;
import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.repository.MurabahaContractRepository;
import com.cbs.musharakah.entity.MusharakahContract;
import com.cbs.musharakah.repository.MusharakahContractRepository;
import com.cbs.profitdistribution.entity.CalculationStatus;
import com.cbs.profitdistribution.entity.PoolProfitCalculation;
import com.cbs.profitdistribution.repository.PoolProfitCalculationRepository;
import com.cbs.regulatory.dto.RegulatoryResponses;
import com.cbs.shariahcompliance.entity.QuarantineStatus;
import com.cbs.shariahcompliance.entity.RemediationStatus;
import com.cbs.shariahcompliance.entity.ScreeningOverallResult;
import com.cbs.shariahcompliance.repository.ShariahAuditFindingRepository;
import com.cbs.shariahcompliance.repository.ShariahScreeningResultRepository;
import com.cbs.shariahcompliance.repository.SnciRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RegulatoryDataExtractionService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal DEFAULT_ALPHA_FACTOR = new BigDecimal("0.30");
    private static final Collection<String> ACTIVE_MURABAHA_STATUSES = List.of("ACTIVE", "EXECUTED", "DEFAULTED");
    private static final Collection<String> ACTIVE_IJARAH_STATUSES = List.of("ACTIVE", "RENTAL_ARREARS", "DEFAULTED");
    private static final Collection<String> ACTIVE_MUSHARAKAH_STATUSES = List.of("ACTIVE", "RENTAL_ARREARS", "BUYOUT_ARREARS", "DEFAULTED");

    private final GlBalanceRepository glBalanceRepository;
    private final IslamicChartOfAccountsService islamicChartOfAccountsService;
    private final IslamicRiskSupport islamicRiskSupport;
    private final MurabahaContractRepository murabahaContractRepository;
    private final IjarahContractRepository ijarahContractRepository;
    private final MusharakahContractRepository musharakahContractRepository;
    private final IslamicEclCalculationRepository eclCalculationRepository;
    private final IslamicFinancingRiskClassificationRepository classificationRepository;
    private final InvestmentPoolRepository investmentPoolRepository;
    private final PoolProfitCalculationRepository poolProfitCalculationRepository;
    private final IslamicCreditRiskDashboardService dashboardService;
    private final IslamicCollateralService collateralService;
    private final SnciRecordRepository snciRecordRepository;
    private final ShariahScreeningResultRepository shariahScreeningResultRepository;
    private final ShariahAuditFindingRepository shariahAuditFindingRepository;
    private final IslamicAmlDashboardService islamicAmlDashboardService;

    public BigDecimal extractGlBalance(List<String> glAccountCodes, LocalDate asOfDate, String balanceType) {
        if (glAccountCodes == null || glAccountCodes.isEmpty()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        List<GlBalance> balances = glBalanceRepository.findByGlCodeInAndBalanceDate(glAccountCodes, safeDate(asOfDate));
        String normalizedType = normalize(balanceType, "CLOSING");
        BigDecimal total = BigDecimal.ZERO;
        for (GlBalance balance : balances) {
            BigDecimal amount = switch (normalizedType) {
                case "OPENING" -> balance.getOpeningBalance();
                case "AVERAGE" -> balance.getOpeningBalance().add(balance.getClosingBalance())
                        .divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                default -> balance.getClosingBalance();
            };
            total = total.add(amount != null ? amount : BigDecimal.ZERO);
        }
        return scale(total);
    }

    public BigDecimal extractGlMovement(List<String> glAccountCodes, LocalDate periodFrom, LocalDate periodTo, String movementType) {
        if (glAccountCodes == null || glAccountCodes.isEmpty()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal total = BigDecimal.ZERO;
        String normalizedType = normalize(movementType, "NET");
        for (String glCode : glAccountCodes) {
            List<GlBalance> balances = glBalanceRepository.findByGlCodeAndBalanceDateBetweenOrderByBalanceDateAsc(
                    glCode, safeDate(periodFrom), safeDate(periodTo));
            for (GlBalance balance : balances) {
                BigDecimal amount = switch (normalizedType) {
                    case "DEBIT" -> balance.getDebitTotal();
                    case "CREDIT" -> balance.getCreditTotal();
                    default -> balance.getClosingBalance().subtract(balance.getOpeningBalance());
                };
                total = total.add(amount != null ? amount : BigDecimal.ZERO);
            }
        }
        return scale(total);
    }

    public BigDecimal extractFinancingTotal(String contractType, String status, String field, LocalDate asOfDate) {
        return contractSnapshots(contractType, status).stream()
                .map(snapshot -> snapshotMetric(snapshot, field))
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    public int extractFinancingCount(String contractType, String filter) {
        FinancingFilter financingFilter = parseFilter(filter);
        return (int) contractSnapshots(contractType, financingFilter.status()).stream()
                .filter(snapshot -> snapshot.getDaysPastDue() >= financingFilter.minimumDaysPastDue())
                .count();
    }

    public Map<String, BigDecimal> extractFinancingBySector(String contractType, LocalDate asOfDate) {
        Map<String, BigDecimal> bySector = new LinkedHashMap<>();
        for (IslamicRiskSupport.ContractSnapshot snapshot : contractSnapshots(contractType, null)) {
            String sector = StringUtils.hasText(snapshot.productCategory()) ? snapshot.productCategory() : "UNSPECIFIED";
            bySector.merge(sector, snapshotMetric(snapshot, "OUTSTANDING"), BigDecimal::add);
        }
        return scaleMap(bySector);
    }

    public Map<String, BigDecimal> extractFinancingByMaturity(String contractType, LocalDate asOfDate) {
        LocalDate effectiveDate = safeDate(asOfDate);
        Map<String, BigDecimal> buckets = new LinkedHashMap<>();
        buckets.put("0-1M", BigDecimal.ZERO);
        buckets.put("1-3M", BigDecimal.ZERO);
        buckets.put("3-12M", BigDecimal.ZERO);
        buckets.put("1-5Y", BigDecimal.ZERO);
        buckets.put(">5Y", BigDecimal.ZERO);
        for (IslamicRiskSupport.ContractSnapshot snapshot : contractSnapshots(contractType, null)) {
            LocalDate maturityDate = resolveMaturityDate(snapshot.contractTypeCode(), snapshot.contractId());
            long months = maturityDate == null ? 999 : Math.max(0, ChronoUnit.MONTHS.between(effectiveDate.withDayOfMonth(1), maturityDate.withDayOfMonth(1)));
            String bucket = months < 1 ? "0-1M"
                    : months < 3 ? "1-3M"
                    : months < 12 ? "3-12M"
                    : months <= 60 ? "1-5Y"
                    : ">5Y";
            buckets.merge(bucket, snapshotMetric(snapshot, "OUTSTANDING"), BigDecimal::add);
        }
        return scaleMap(buckets);
    }

    public Map<String, BigDecimal> extractFinancingByStage(String contractType, LocalDate asOfDate) {
        Map<String, BigDecimal> byStage = new LinkedHashMap<>();
        byStage.put("STAGE_1", BigDecimal.ZERO);
        byStage.put("STAGE_2", BigDecimal.ZERO);
        byStage.put("STAGE_3", BigDecimal.ZERO);
        for (IslamicRiskSupport.ContractSnapshot snapshot : contractSnapshots(contractType, null)) {
            IslamicFinancingRiskClassification classification = classificationRepository
                    .findTopByContractIdOrderByClassificationDateDesc(snapshot.contractId())
                    .orElse(null);
            String stage = classification != null ? classification.getIfrs9Stage().name() : "STAGE_1";
            byStage.merge(stage, snapshotMetric(snapshot, "OUTSTANDING"), BigDecimal::add);
        }
        return scaleMap(byStage);
    }

    public BigDecimal extractPoolBalance(String poolType, LocalDate asOfDate) {
        PoolType resolvedType = "RESTRICTED".equalsIgnoreCase(poolType) ? PoolType.RESTRICTED : PoolType.UNRESTRICTED;
        return investmentPoolRepository.findByPoolTypeAndStatus(resolvedType, PoolStatus.ACTIVE).stream()
                .map(InvestmentPool::getTotalPoolBalance)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal extractPerBalance(LocalDate asOfDate) {
        return extractGlBalance(List.of("3200-000-001"), asOfDate, "CLOSING");
    }

    public BigDecimal extractIrrBalance(LocalDate asOfDate) {
        return extractGlBalance(List.of("3300-000-001"), asOfDate, "CLOSING");
    }

    public Map<String, BigDecimal> extractPoolProfitDistribution(String poolCode, LocalDate periodFrom, LocalDate periodTo) {
        Optional<InvestmentPool> pool = investmentPoolRepository.findByPoolCode(poolCode);
        Map<String, BigDecimal> result = new LinkedHashMap<>();
        result.put("GROSS_INCOME", BigDecimal.ZERO);
        result.put("EXPENSES", BigDecimal.ZERO);
        result.put("BANK_SHARE", BigDecimal.ZERO);
        result.put("DEPOSITOR_SHARE", BigDecimal.ZERO);
        result.put("PER", BigDecimal.ZERO);
        result.put("IRR", BigDecimal.ZERO);
        if (pool.isEmpty()) {
            return scaleMap(result);
        }
        PoolProfitCalculation calculation = poolProfitCalculationRepository
                .findByPoolIdAndPeriodFromAndPeriodToAndCalculationStatus(pool.get().getId(), periodFrom, periodTo, CalculationStatus.APPROVED)
                .orElseGet(() -> poolProfitCalculationRepository.findTop12ByPoolIdOrderByPeriodFromDesc(pool.get().getId()).stream()
                        .findFirst()
                        .orElse(null));
        if (calculation == null) {
            return scaleMap(result);
        }
        result.put("GROSS_INCOME", safe(calculation.getGrossIncome()));
        result.put("EXPENSES", safe(calculation.getTotalExpenses()));
        result.put("BANK_SHARE", safe(calculation.getBankMudaribShare()));
        result.put("DEPOSITOR_SHARE", safe(calculation.getDepositorPool()));
        result.put("PER", extractPerBalance(periodTo));
        result.put("IRR", extractIrrBalance(periodTo));
        return scaleMap(result);
    }

    public BigDecimal extractTotalEcl(String contractType, LocalDate asOfDate) {
        return eclCalculations(contractType, asOfDate).stream()
                .map(IslamicEclCalculation::getWeightedEcl)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal extractEclByStage(String contractType, String stage, LocalDate asOfDate) {
        String normalizedStage = normalize(stage, "ALL");
        return eclCalculations(contractType, asOfDate).stream()
                .filter(item -> "ALL".equals(normalizedStage) || item.getCurrentStage().name().equals(normalizedStage))
                .map(IslamicEclCalculation::getWeightedEcl)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal extractProvisionCoverage(String contractType, LocalDate asOfDate) {
        List<IslamicEclCalculation> calculations = eclCalculations(contractType, asOfDate);
        BigDecimal totalEcl = calculations.stream().map(IslamicEclCalculation::getWeightedEcl)
                .filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalExposure = calculations.stream().map(IslamicEclCalculation::getEad)
                .filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        return percentage(totalEcl, totalExposure);
    }

    public RegulatoryResponses.CapitalAdequacyData extractCapitalAdequacyData(LocalDate asOfDate) {
        LocalDate effectiveDate = safeDate(asOfDate);
        AaoifiBalanceSheet sheet = islamicChartOfAccountsService.generateAaoifiBalanceSheet(effectiveDate);
        IslamicRiskResponses.PortfolioOverview portfolioOverview = dashboardService.getPortfolioOverview(effectiveDate);
        BigDecimal tier1 = safe(sheet.getOwnersEquity().getTotalOwnersEquity());
        BigDecimal tier2 = safe(sheet.getOwnersEquity().getReserves()).multiply(new BigDecimal("0.25"));
        BigDecimal rwa = safe(portfolioOverview.getTotalIslamicFinancing()).multiply(new BigDecimal("0.80"));
        BigDecimal iahFunds = safe(sheet.getUnrestrictedInvestmentAccounts().getNetUnrestrictedInvestmentAccounts());
        BigDecimal share = rwa.add(iahFunds).compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : iahFunds.divide(rwa.add(iahFunds), 6, RoundingMode.HALF_UP);
        BigDecimal adjustedRwa = rwa.multiply(BigDecimal.ONE.subtract(DEFAULT_ALPHA_FACTOR.multiply(share)))
                .max(BigDecimal.ONE);
        BigDecimal car = tier1.add(tier2).multiply(HUNDRED).divide(adjustedRwa, 2, RoundingMode.HALF_UP);
        return RegulatoryResponses.CapitalAdequacyData.builder()
                .tier1Capital(scale(tier1))
                .tier2Capital(scale(tier2))
                .riskWeightedAssets(scale(rwa))
                .iahFunds(scale(iahFunds))
                .alphaFactor(DEFAULT_ALPHA_FACTOR)
                .adjustedRiskWeightedAssets(scale(adjustedRwa))
                .capitalAdequacyRatio(car)
                .build();
    }

    public RegulatoryResponses.ShariahComplianceData extractShariahComplianceData(LocalDate periodFrom, LocalDate periodTo) {
        LocalDateTime fromDateTime = safeDate(periodFrom).atStartOfDay();
        LocalDateTime toDateTime = safeDate(periodTo).atTime(23, 59, 59);
        long totalScreenings = shariahScreeningResultRepository.countByScreenedAtBetween(fromDateTime, toDateTime);
        long blocked = shariahScreeningResultRepository.findByOverallResultAndScreenedAtAfter(ScreeningOverallResult.FAIL, fromDateTime).stream()
                .filter(item -> !item.getScreenedAt().isAfter(toDateTime))
                .count();
        long alerts = shariahScreeningResultRepository.findByOverallResultAndScreenedAtAfter(ScreeningOverallResult.ALERT, fromDateTime).stream()
                .filter(item -> !item.getScreenedAt().isAfter(toDateTime))
                .count();
        return RegulatoryResponses.ShariahComplianceData.builder()
                .snciDetected(snciRecordRepository.countByQuarantineStatus(QuarantineStatus.QUARANTINED)
                        + snciRecordRepository.countByQuarantineStatus(QuarantineStatus.PENDING_PURIFICATION))
                .charityFundBalance(extractGlBalance(List.of("2300-000-001"), periodTo, "CLOSING"))
                .screeningsTotal(totalScreenings)
                .screeningsBlocked(blocked)
                .screeningsAlerted(alerts)
                .openAuditFindings(shariahAuditFindingRepository.countByRemediationStatus(RemediationStatus.OPEN)
                        + shariahAuditFindingRepository.countByRemediationStatus(RemediationStatus.IN_PROGRESS))
                .closedAuditFindings(shariahAuditFindingRepository.countByRemediationStatus(RemediationStatus.CLOSED))
                .build();
    }

    public BigDecimal extractTotalCollateralValue(String contractType, LocalDate asOfDate) {
        BigDecimal total = BigDecimal.ZERO;
        for (IslamicRiskSupport.ContractSnapshot snapshot : contractSnapshots(contractType, null)) {
            total = total.add(safe(collateralService.calculateCoverage(snapshot.contractId(), snapshot.contractTypeCode())
                    .getTotalCollateralValue()));
        }
        return scale(total);
    }

    public BigDecimal extractCollateralCoverage(String contractType, LocalDate asOfDate) {
        BigDecimal collateral = BigDecimal.ZERO;
        BigDecimal ead = BigDecimal.ZERO;
        for (IslamicRiskSupport.ContractSnapshot snapshot : contractSnapshots(contractType, null)) {
            IslamicRiskResponses.CollateralCoverageResult coverage = collateralService.calculateCoverage(
                    snapshot.contractId(), snapshot.contractTypeCode());
            collateral = collateral.add(safe(coverage.getTotalCollateralValue()));
            ead = ead.add(safe(coverage.getEad()));
        }
        return percentage(collateral, ead);
    }

    public RegulatoryResponses.AmlStatisticalData extractAmlData(LocalDate periodFrom, LocalDate periodTo) {
        IslamicAmlDashboard dashboard = islamicAmlDashboardService.getDashboard(periodFrom, periodTo);
        return RegulatoryResponses.AmlStatisticalData.builder()
                .totalSarsFiled(dashboard.getSarWidget() != null ? dashboard.getSarWidget().getFiledCount() : 0)
                .sarsByJurisdiction(dashboard.getSarWidget() != null ? dashboard.getSarWidget().getByJurisdiction() : Map.of())
                .sanctionsMatches(dashboard.getSanctionsWidget() != null
                        ? dashboard.getSanctionsWidget().getPotentialMatches() + dashboard.getSanctionsWidget().getConfirmedMatches()
                        : 0)
                .islamicAlerts(dashboard.getAlertSummary() != null ? dashboard.getAlertSummary().getTotalAlerts() : 0)
                .build();
    }

    private List<IslamicRiskSupport.ContractSnapshot> contractSnapshots(String contractType, String status) {
        String normalizedType = normalize(contractType, null);
        if (normalizedType == null) {
            return List.of();
        }
        List<Long> ids = switch (normalizedType) {
            case "MURABAHA" -> murabahaIds(status);
            case "IJARAH" -> ijarahIds(status);
            case "MUSHARAKAH" -> musharakahIds(status);
            default -> List.of();
        };
        List<IslamicRiskSupport.ContractSnapshot> snapshots = new ArrayList<>();
        for (Long id : ids) {
            snapshots.add(islamicRiskSupport.loadContract(id, normalizedType));
        }
        return snapshots;
    }

    private List<Long> murabahaIds(String status) {
        if (!StringUtils.hasText(status)) {
            return murabahaContractRepository.findAll().stream().map(MurabahaContract::getId).toList();
        }
        return murabahaContractRepository.findByStatusIn(ACTIVE_MURABAHA_STATUSES.stream()
                        .map(value -> com.cbs.murabaha.entity.MurabahaDomainEnums.ContractStatus.valueOf(value))
                        .toList()).stream()
                .filter(contract -> contract.getStatus().name().equals(normalize(status, status)))
                .map(MurabahaContract::getId)
                .toList();
    }

    private List<Long> ijarahIds(String status) {
        if (!StringUtils.hasText(status)) {
            return ijarahContractRepository.findAll().stream().map(IjarahContract::getId).toList();
        }
        return ijarahContractRepository.findAll().stream()
                .filter(contract -> contract.getStatus().name().equals(normalize(status, status)))
                .map(IjarahContract::getId)
                .toList();
    }

    private List<Long> musharakahIds(String status) {
        if (!StringUtils.hasText(status)) {
            return musharakahContractRepository.findAll().stream().map(MusharakahContract::getId).toList();
        }
        return musharakahContractRepository.findAll().stream()
                .filter(contract -> contract.getStatus().name().equals(normalize(status, status)))
                .map(MusharakahContract::getId)
                .toList();
    }

    private LocalDate resolveMaturityDate(String contractType, Long contractId) {
        return switch (normalize(contractType, null)) {
            case "MURABAHA" -> murabahaContractRepository.findById(contractId).map(MurabahaContract::getMaturityDate).orElse(null);
            case "IJARAH" -> ijarahContractRepository.findById(contractId).map(IjarahContract::getLeaseEndDate).orElse(null);
            case "MUSHARAKAH" -> musharakahContractRepository.findById(contractId).map(MusharakahContract::getMaturityDate).orElse(null);
            default -> null;
        };
    }

    private BigDecimal snapshotMetric(IslamicRiskSupport.ContractSnapshot snapshot, String field) {
        String metric = normalize(field, "OUTSTANDING");
        return switch (metric) {
            case "FINANCED_AMOUNT", "OUTSTANDING", "OUTSTANDING_PRINCIPAL" -> safe(snapshot.outstandingPrincipal())
                    .add(safe(snapshot.assetNetBookValue()))
                    .add(safe(snapshot.rentalReceivable()))
                    .add(safe(snapshot.bankShareValue()));
            case "DEFERRED_PROFIT" -> safe(snapshot.deferredProfitOutstanding());
            case "ASSET_NBV" -> safe(snapshot.assetNetBookValue());
            case "RENTAL_RECEIVABLE" -> safe(snapshot.rentalReceivable());
            case "BANK_SHARE", "SHARE_VALUE" -> safe(snapshot.bankShareValue());
            case "COLLATERAL" -> safe(snapshot.explicitCollateralValue());
            default -> safe(snapshot.outstandingPrincipal()).add(safe(snapshot.assetNetBookValue()))
                    .add(safe(snapshot.rentalReceivable())).add(safe(snapshot.bankShareValue()));
        };
    }

    private List<IslamicEclCalculation> eclCalculations(String contractType, LocalDate asOfDate) {
        LocalDate effectiveDate = safeDate(asOfDate);
        List<IslamicEclCalculation> calculations = StringUtils.hasText(contractType)
                ? eclCalculationRepository.findByContractTypeCodeAndCalculationDate(normalize(contractType, contractType), effectiveDate)
                : eclCalculationRepository.findByCalculationDate(effectiveDate);
        if (!calculations.isEmpty()) {
            return calculations;
        }
        return StringUtils.hasText(contractType)
                ? eclCalculationRepository.findAll().stream()
                    .filter(item -> normalize(contractType, contractType).equals(item.getContractTypeCode()))
                    .toList()
                : eclCalculationRepository.findAll();
    }

    private FinancingFilter parseFilter(String filter) {
        String normalized = filter != null ? filter.toUpperCase(Locale.ROOT) : "";
        String status = null;
        int minimumDaysPastDue = 0;
        if (normalized.contains("STATUS=")) {
            status = normalized.substring(normalized.indexOf("STATUS=") + 7).split("AND")[0].trim();
        }
        if (normalized.contains("DAYSPASTDUE >")) {
            String raw = normalized.substring(normalized.indexOf("DAYSPASTDUE >") + 12).trim().split(" ")[0];
            minimumDaysPastDue = Integer.parseInt(raw);
        } else if (normalized.contains("DAYSPASTDUE >=")) {
            String raw = normalized.substring(normalized.indexOf("DAYSPASTDUE >=") + 13).trim().split(" ")[0];
            minimumDaysPastDue = Integer.parseInt(raw);
        }
        return new FinancingFilter(status, minimumDaysPastDue);
    }

    private Map<String, BigDecimal> scaleMap(Map<String, BigDecimal> values) {
        Map<String, BigDecimal> scaled = new LinkedHashMap<>();
        values.forEach((key, value) -> scaled.put(key, scale(value)));
        return scaled;
    }

    private BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private BigDecimal scale(BigDecimal value) {
        return safe(value).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal percentage(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return numerator.multiply(HUNDRED).divide(denominator, 2, RoundingMode.HALF_UP);
    }

    private LocalDate safeDate(LocalDate date) {
        return date != null ? date : LocalDate.now();
    }

    private String normalize(String value, String defaultValue) {
        return StringUtils.hasText(value) ? value.trim().toUpperCase(Locale.ROOT) : defaultValue;
    }

    private record FinancingFilter(String status, int minimumDaysPastDue) {
    }
}
