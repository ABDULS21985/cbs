package com.cbs.almfull.service;

import com.cbs.almfull.entity.AlmPosition;
import com.cbs.almfull.repository.AlmPositionRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AlmFullService {

    private final AlmPositionRepository positionRepository;
    private final CurrentActorProvider actorProvider;

    private static final List<String> VALID_TIME_BUCKETS = List.of(
            "OVERNIGHT", "1-7D", "8-30D", "1-3M", "3-6M", "6-12M", ">1Y"
    );

    private static final BigDecimal BPS_100 = new BigDecimal("0.01");
    private static final BigDecimal BPS_200 = new BigDecimal("0.02");

    @Transactional
    public AlmPosition calculatePosition(AlmPosition pos) {
        validatePosition(pos);

        pos.setTotalAssets(pos.getCashAndEquivalents().add(pos.getInterbankPlacements()).add(pos.getSecuritiesHeld())
                .add(pos.getLoansAndAdvances()).add(pos.getFixedAssets()).add(pos.getOtherAssets()));
        pos.setTotalLiabilities(pos.getDemandDeposits().add(pos.getTermDeposits()).add(pos.getInterbankBorrowings())
                .add(pos.getBondsIssued()).add(pos.getOtherLiabilities()));
        pos.setGapAmount(pos.getTotalAssets().subtract(pos.getTotalLiabilities()));

        if (pos.getTotalAssets().signum() != 0) {
            pos.setGapRatio(pos.getGapAmount().divide(pos.getTotalAssets(), 4, RoundingMode.HALF_UP));
        }

        if (pos.getDurationAssets() != null && pos.getDurationLiabilities() != null) {
            pos.setDurationGap(pos.getDurationAssets().subtract(pos.getDurationLiabilities()));
        }

        // NII sensitivity: estimate impact of rate shifts on the gap
        calculateNiiSensitivity(pos);

        // EVE impact estimation using duration gap
        calculateEveSensitivity(pos);

        AlmPosition saved = positionRepository.save(pos);
        String actor = actorProvider.getCurrentActor();
        log.info("ALM position calculated by {}: date={}, bucket={}, gap={}, ratio={}, niiUp100bp={}, niiDown100bp={}",
                actor, pos.getPositionDate(), pos.getTimeBucket(), pos.getGapAmount(), pos.getGapRatio(),
                pos.getNiiImpactUp100bp(), pos.getNiiImpactDown100bp());
        return saved;
    }

    /**
     * Performs time-bucket gap analysis across all buckets for a given date and currency.
     * Returns positions ordered by bucket with cumulative gap computed.
     */
    public Map<String, Object> runGapAnalysis(LocalDate date, String currency) {
        if (date == null || currency == null || currency.isBlank()) {
            throw new BusinessException("Date and currency are required for gap analysis");
        }

        List<AlmPosition> positions = positionRepository.findByPositionDateAndCurrencyOrderByTimeBucketAsc(date, currency);
        if (positions.isEmpty()) {
            throw new BusinessException("No ALM positions found for date=" + date + " currency=" + currency);
        }

        BigDecimal cumulativeGap = BigDecimal.ZERO;
        List<Map<String, Object>> bucketResults = new ArrayList<>();

        for (AlmPosition pos : positions) {
            cumulativeGap = cumulativeGap.add(pos.getGapAmount() != null ? pos.getGapAmount() : BigDecimal.ZERO);
            pos.setCumulativeGap(cumulativeGap);

            Map<String, Object> bucket = new LinkedHashMap<>();
            bucket.put("timeBucket", pos.getTimeBucket());
            bucket.put("totalAssets", pos.getTotalAssets());
            bucket.put("totalLiabilities", pos.getTotalLiabilities());
            bucket.put("gap", pos.getGapAmount());
            bucket.put("cumulativeGap", cumulativeGap);
            bucket.put("gapRatio", pos.getGapRatio());
            bucketResults.add(bucket);
        }

        BigDecimal totalAssets = positions.stream()
                .map(AlmPosition::getTotalAssets)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalLiabilities = positions.stream()
                .map(AlmPosition::getTotalLiabilities)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date", date);
        result.put("currency", currency);
        result.put("totalAssets", totalAssets);
        result.put("totalLiabilities", totalLiabilities);
        result.put("netGap", cumulativeGap);
        result.put("buckets", bucketResults);

        log.info("Gap analysis completed by {}: date={}, currency={}, netGap={}",
                actorProvider.getCurrentActor(), date, currency, cumulativeGap);
        return result;
    }

    /**
     * Calculates NII sensitivity for a given date/currency under parallel rate shifts.
     * The NII impact is approximated as gap * shift for each repricing bucket.
     */
    public Map<String, BigDecimal> calculateNiiSensitivity(LocalDate date, String currency) {
        List<AlmPosition> positions = positionRepository.findByPositionDateAndCurrencyOrderByTimeBucketAsc(date, currency);
        if (positions.isEmpty()) {
            throw new BusinessException("No ALM positions found for NII sensitivity calculation");
        }

        BigDecimal totalNiiUp100 = BigDecimal.ZERO;
        BigDecimal totalNiiDown100 = BigDecimal.ZERO;

        for (AlmPosition pos : positions) {
            BigDecimal bucketWeight = getBucketWeightForNii(pos.getTimeBucket());
            BigDecimal gap = pos.getGapAmount() != null ? pos.getGapAmount() : BigDecimal.ZERO;
            BigDecimal niiUp = gap.multiply(BPS_100).multiply(bucketWeight).setScale(2, RoundingMode.HALF_UP);
            BigDecimal niiDown = gap.multiply(BPS_100.negate()).multiply(bucketWeight).setScale(2, RoundingMode.HALF_UP);
            totalNiiUp100 = totalNiiUp100.add(niiUp);
            totalNiiDown100 = totalNiiDown100.add(niiDown);
        }

        Map<String, BigDecimal> result = new LinkedHashMap<>();
        result.put("niiImpactUp100bp", totalNiiUp100);
        result.put("niiImpactDown100bp", totalNiiDown100);
        result.put("niiImpactUp200bp", totalNiiUp100.multiply(BigDecimal.valueOf(2)));
        result.put("niiImpactDown200bp", totalNiiDown100.multiply(BigDecimal.valueOf(2)));

        log.info("NII sensitivity by {}: date={}, currency={}, up100bp={}, down100bp={}",
                actorProvider.getCurrentActor(), date, currency, totalNiiUp100, totalNiiDown100);
        return result;
    }

    /**
     * Runs stress testing under base, adverse, and severe scenarios.
     * Each scenario applies different rate shock magnitudes and behavioral assumptions.
     */
    public Map<String, Map<String, BigDecimal>> runStressTest(LocalDate date, String currency) {
        List<AlmPosition> positions = positionRepository.findByPositionDateAndCurrencyOrderByTimeBucketAsc(date, currency);
        if (positions.isEmpty()) {
            throw new BusinessException("No ALM positions found for stress testing");
        }

        BigDecimal totalGap = positions.stream()
                .map(p -> p.getGapAmount() != null ? p.getGapAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalAssets = positions.stream()
                .map(AlmPosition::getTotalAssets)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Base scenario: +50bp parallel shift
        Map<String, BigDecimal> base = computeScenario("BASE", totalGap, totalAssets,
                new BigDecimal("0.005"), BigDecimal.ONE);

        // Adverse scenario: +150bp parallel shift with 10% deposit runoff
        Map<String, BigDecimal> adverse = computeScenario("ADVERSE", totalGap, totalAssets,
                new BigDecimal("0.015"), new BigDecimal("0.90"));

        // Severe scenario: +300bp parallel shift with 25% deposit runoff
        Map<String, BigDecimal> severe = computeScenario("SEVERE", totalGap, totalAssets,
                new BigDecimal("0.030"), new BigDecimal("0.75"));

        Map<String, Map<String, BigDecimal>> results = new LinkedHashMap<>();
        results.put("BASE", base);
        results.put("ADVERSE", adverse);
        results.put("SEVERE", severe);

        log.info("Stress test completed by {}: date={}, currency={}, baseNiiImpact={}, adverseNiiImpact={}, severeNiiImpact={}",
                actorProvider.getCurrentActor(), date, currency,
                base.get("niiImpact"), adverse.get("niiImpact"), severe.get("niiImpact"));
        return results;
    }

    public List<AlmPosition> getPositions(LocalDate date, String currency) {
        return positionRepository.findByPositionDateAndCurrencyOrderByTimeBucketAsc(date, currency);
    }

    public List<AlmPosition> getAllPositions() {
        return positionRepository.findAll();
    }

    // ---- private helpers ----

    private void validatePosition(AlmPosition pos) {
        if (pos.getPositionDate() == null) {
            throw new BusinessException("Position date is required");
        }
        if (pos.getCurrency() == null || pos.getCurrency().isBlank()) {
            throw new BusinessException("Currency is required");
        }
        if (pos.getCurrency().length() != 3) {
            throw new BusinessException("Currency must be a 3-letter ISO code");
        }
        if (pos.getTimeBucket() == null || pos.getTimeBucket().isBlank()) {
            throw new BusinessException("Time bucket is required");
        }
        if (!VALID_TIME_BUCKETS.contains(pos.getTimeBucket().toUpperCase())) {
            throw new BusinessException("Invalid time bucket: " + pos.getTimeBucket()
                    + ". Valid values: " + VALID_TIME_BUCKETS);
        }
    }

    private void calculateNiiSensitivity(AlmPosition pos) {
        if (pos.getGapAmount() == null) return;
        BigDecimal bucketWeight = getBucketWeightForNii(pos.getTimeBucket());
        pos.setNiiImpactUp100bp(pos.getGapAmount().multiply(BPS_100).multiply(bucketWeight)
                .setScale(2, RoundingMode.HALF_UP));
        pos.setNiiImpactDown100bp(pos.getGapAmount().multiply(BPS_100.negate()).multiply(bucketWeight)
                .setScale(2, RoundingMode.HALF_UP));
    }

    private void calculateEveSensitivity(AlmPosition pos) {
        if (pos.getDurationGap() == null || pos.getTotalAssets() == null) return;
        // EVE impact ~ -durationGap * rateShift * totalAssets
        BigDecimal eveUp200 = pos.getDurationGap().negate().multiply(BPS_200).multiply(pos.getTotalAssets())
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal eveDown200 = pos.getDurationGap().multiply(BPS_200).multiply(pos.getTotalAssets())
                .setScale(2, RoundingMode.HALF_UP);
        pos.setEveImpactUp200bp(eveUp200);
        pos.setEveImpactDown200bp(eveDown200);
    }

    /**
     * Returns a weighting factor (0-1) representing the proportion of the year
     * the bucket's gap is exposed to a rate change, used for NII approximation.
     */
    private BigDecimal getBucketWeightForNii(String bucket) {
        if (bucket == null) return BigDecimal.ONE;
        return switch (bucket.toUpperCase()) {
            case "OVERNIGHT" -> new BigDecimal("1.00");
            case "1-7D" -> new BigDecimal("0.98");
            case "8-30D" -> new BigDecimal("0.92");
            case "1-3M" -> new BigDecimal("0.83");
            case "3-6M" -> new BigDecimal("0.63");
            case "6-12M" -> new BigDecimal("0.25");
            case ">1Y" -> BigDecimal.ZERO;
            default -> new BigDecimal("0.50");
        };
    }

    private Map<String, BigDecimal> computeScenario(String name, BigDecimal totalGap,
                                                     BigDecimal totalAssets, BigDecimal rateShock,
                                                     BigDecimal depositRetentionFactor) {
        BigDecimal niiImpact = totalGap.multiply(rateShock).setScale(2, RoundingMode.HALF_UP);
        BigDecimal depositStress = totalAssets.multiply(BigDecimal.ONE.subtract(depositRetentionFactor))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal stressedGap = totalGap.subtract(depositStress);
        BigDecimal stressedNiiImpact = stressedGap.multiply(rateShock).setScale(2, RoundingMode.HALF_UP);

        Map<String, BigDecimal> scenario = new LinkedHashMap<>();
        scenario.put("rateShockBps", rateShock.multiply(BigDecimal.valueOf(10000)).setScale(0, RoundingMode.HALF_UP));
        scenario.put("depositRetentionPct", depositRetentionFactor.multiply(BigDecimal.valueOf(100)));
        scenario.put("niiImpact", niiImpact);
        scenario.put("depositRunoff", depositStress);
        scenario.put("stressedGap", stressedGap);
        scenario.put("stressedNiiImpact", stressedNiiImpact);
        return scenario;
    }
}
