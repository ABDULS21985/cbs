package com.cbs.zakat.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.marketdata.entity.MarketPrice;
import com.cbs.marketdata.service.MarketDataService;
import com.cbs.zakat.dto.ZakatResponses;
import com.cbs.zakat.entity.ZakatDomainEnums;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ZakatCalculationEngine {

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal HIJRI_RATE = new BigDecimal("2.500000");
    private static final BigDecimal GREGORIAN_RATE = new BigDecimal("2.577000");

    private final MarketDataService marketDataService;

    @Value("${zakat.nisab.gold-price-per-gram-sar:320}")
    private BigDecimal fallbackGoldPricePerGramSar;

    @Value("${zakat.nisab.silver-price-per-gram-sar:4}")
    private BigDecimal fallbackSilverPricePerGramSar;

    @Value("${zakat.nisab.fixed-sar:20000}")
    private BigDecimal fallbackFixedNisabSar;

    public ZakatResponses.ZakatCalculationResult calculate(List<ZakatResponses.ZakatClassificationResult> classifiedAccounts,
                                                           CalculationParameters params) {
        BigDecimal zakatableAssets = BigDecimal.ZERO;
        BigDecimal nonZakatableAssets = BigDecimal.ZERO;
        BigDecimal deductibleLiabilities = BigDecimal.ZERO;
        BigDecimal nonDeductibleLiabilities = BigDecimal.ZERO;
        Map<String, BigDecimal> assetBreakdown = new LinkedHashMap<>();
        Map<String, BigDecimal> liabilityBreakdown = new LinkedHashMap<>();
        Map<String, BigDecimal> excludedAssetBreakdown = new LinkedHashMap<>();

        for (ZakatResponses.ZakatClassificationResult item : classifiedAccounts) {
            if (!StringUtils.hasText(item.getZakatClassification())
                    || "UNCLASSIFIED".equalsIgnoreCase(item.getZakatClassification())) {
                continue;
            }
            BigDecimal adjusted = convertCurrency(item.getAdjustedAmount(), item.getCurrencyCode(), params.getTargetCurrency());
            switch (ZakatDomainEnums.ZakatClassification.valueOf(item.getZakatClassification())) {
                case ZAKATABLE_ASSET -> {
                    zakatableAssets = zakatableAssets.add(adjusted);
                    assetBreakdown.merge(item.getSubCategory(), adjusted, BigDecimal::add);
                }
                case NON_ZAKATABLE_ASSET -> {
                    nonZakatableAssets = nonZakatableAssets.add(adjusted);
                    excludedAssetBreakdown.merge(item.getSubCategory(), adjusted, BigDecimal::add);
                }
                case DEDUCTIBLE_LIABILITY -> {
                    deductibleLiabilities = deductibleLiabilities.add(adjusted);
                    liabilityBreakdown.merge(item.getSubCategory(), adjusted, BigDecimal::add);
                }
                case NON_DEDUCTIBLE_LIABILITY -> nonDeductibleLiabilities = nonDeductibleLiabilities.add(adjusted);
            }
        }

        BigDecimal totalAssetsFromClassification = zakatableAssets.add(nonZakatableAssets);
        BigDecimal expectedTotalAssets = ZakatSupport.money(params.getExpectedTotalAssets());
        if (params.getExpectedTotalAssets() != null
                && totalAssetsFromClassification.subtract(expectedTotalAssets).abs().compareTo(new BigDecimal("0.01")) > 0) {
            throw new BusinessException(
                    "Classification totals do not match GL totals: classified=" + totalAssetsFromClassification
                            + ", gl=" + expectedTotalAssets,
                    "ZAKAT_CLASSIFICATION_TOTAL_MISMATCH");
        }

        BigDecimal zakatBase = zakatableAssets.subtract(deductibleLiabilities);
        if (zakatBase.compareTo(BigDecimal.ZERO) < 0) {
            zakatBase = BigDecimal.ZERO;
        }

        if (Boolean.TRUE.equals(params.getCheckNisab()) && params.getNisabThreshold() != null
                && zakatBase.compareTo(params.getNisabThreshold()) < 0) {
            return ZakatResponses.ZakatCalculationResult.builder()
                    .zakatableAssets(ZakatSupport.money(zakatableAssets))
                    .nonZakatableAssets(ZakatSupport.money(nonZakatableAssets))
                    .deductibleLiabilities(ZakatSupport.money(deductibleLiabilities))
                    .nonDeductibleLiabilities(ZakatSupport.money(nonDeductibleLiabilities))
                    .totalAssetsFromClassification(ZakatSupport.money(totalAssetsFromClassification))
                    .totalAssetsFromGl(expectedTotalAssets)
                    .zakatBase(ZakatSupport.money(zakatBase))
                    .belowNisab(true)
                    .noZakatDueReason("Below Nisab threshold")
                    .assetBreakdown(assetBreakdown)
                    .liabilityBreakdown(liabilityBreakdown)
                    .excludedAssetBreakdown(excludedAssetBreakdown)
                    .build();
        }

        BigDecimal rate = params.getRateBasis() == ZakatDomainEnums.ZakatRateBasis.GREGORIAN_YEAR
                ? GREGORIAN_RATE
                : HIJRI_RATE;
        BigDecimal zakatAmount = zakatBase.multiply(rate)
                .divide(HUNDRED, 2, RoundingMode.HALF_UP);

        BigDecimal totalAdjustments = params.getAdjustments().stream()
                .map(ZakatSupport::signedAdjustment)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal adjustedAmount = zakatAmount.add(totalAdjustments).setScale(2, RoundingMode.HALF_UP);
        if (adjustedAmount.compareTo(BigDecimal.ZERO) < 0) {
            adjustedAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return ZakatResponses.ZakatCalculationResult.builder()
                .zakatableAssets(ZakatSupport.money(zakatableAssets))
                .nonZakatableAssets(ZakatSupport.money(nonZakatableAssets))
                .deductibleLiabilities(ZakatSupport.money(deductibleLiabilities))
                .nonDeductibleLiabilities(ZakatSupport.money(nonDeductibleLiabilities))
                .totalAssetsFromClassification(ZakatSupport.money(totalAssetsFromClassification))
                .totalAssetsFromGl(expectedTotalAssets)
                .zakatBase(ZakatSupport.money(zakatBase))
                .zakatRate(ZakatSupport.rate(rate))
                .zakatAmount(ZakatSupport.money(zakatAmount))
                .totalAdjustments(ZakatSupport.money(totalAdjustments))
                .adjustedZakatAmount(ZakatSupport.money(adjustedAmount))
                .assetBreakdown(assetBreakdown)
                .liabilityBreakdown(liabilityBreakdown)
                .excludedAssetBreakdown(excludedAssetBreakdown)
                .appliedAdjustments(new ArrayList<>(params.getAdjustments()))
                .build();
    }

    public BigDecimal calculateNisab(LocalDate asOfDate, String currency, ZakatDomainEnums.NisabBasis basis) {
        String targetCurrency = StringUtils.hasText(currency) ? currency.toUpperCase(Locale.ROOT) : "SAR";
        return switch (basis) {
            case GOLD_85G -> resolveMetalPricePerGram(targetCurrency, asOfDate, true)
                    .multiply(new BigDecimal("85"))
                    .setScale(2, RoundingMode.HALF_UP);
            case SILVER_595G -> resolveMetalPricePerGram(targetCurrency, asOfDate, false)
                    .multiply(new BigDecimal("595"))
                    .setScale(2, RoundingMode.HALF_UP);
            case ZATCA_FIXED -> convertCurrency(fallbackFixedNisabSar, "SAR", targetCurrency);
        };
    }

    public BigDecimal resolveRate(ZakatDomainEnums.ZakatRateBasis rateBasis) {
        return rateBasis == ZakatDomainEnums.ZakatRateBasis.GREGORIAN_YEAR ? GREGORIAN_RATE : HIJRI_RATE;
    }

    BigDecimal convertCurrency(BigDecimal amount, String sourceCurrency, String targetCurrency) {
        BigDecimal normalizedAmount = ZakatSupport.money(amount);
        String source = StringUtils.hasText(sourceCurrency) ? sourceCurrency.toUpperCase(Locale.ROOT) : targetCurrency;
        String target = StringUtils.hasText(targetCurrency) ? targetCurrency.toUpperCase(Locale.ROOT) : source;
        if (source.equals(target) || normalizedAmount.compareTo(BigDecimal.ZERO) == 0) {
            return normalizedAmount;
        }

        BigDecimal directRate = resolveFxRate(source, target);
        if (directRate != null) {
            return normalizedAmount.multiply(directRate).setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal inverseRate = resolveFxRate(target, source);
        if (inverseRate != null && inverseRate.compareTo(BigDecimal.ZERO) > 0) {
            return normalizedAmount.divide(inverseRate, 2, RoundingMode.HALF_UP);
        }
        throw new BusinessException("FX conversion rate not available for " + source + " to " + target,
                "ZAKAT_FX_RATE_MISSING");
    }

    private BigDecimal resolveMetalPricePerGram(String currency, LocalDate asOfDate, boolean gold) {
        List<String> candidateCodes = gold
                ? List.of("GOLD-1G-" + currency, "XAU-" + currency, "XAU" + currency, "GOLD-SAR-GRAM")
                : List.of("SILVER-1G-" + currency, "XAG-" + currency, "XAG" + currency, "SILVER-SAR-GRAM");
        for (String candidate : candidateCodes) {
            List<MarketPrice> prices = marketDataService.getLatestPrice(candidate);
            if (!prices.isEmpty()) {
                return prices.getFirst().getPrice();
            }
        }
        BigDecimal fallback = gold ? fallbackGoldPricePerGramSar : fallbackSilverPricePerGramSar;
        return convertCurrency(fallback, "SAR", currency);
    }

    private BigDecimal resolveFxRate(String source, String target) {
        for (String candidate : List.of(source + target, source + "-" + target, "FX-" + source + "-" + target,
                source + "/" + target)) {
            List<MarketPrice> prices = marketDataService.getLatestPrice(candidate);
            if (!prices.isEmpty()) {
                return prices.getFirst().getPrice();
            }
        }
        return null;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class CalculationParameters {
        private final ZakatDomainEnums.ZakatRateBasis rateBasis;
        private final Boolean checkNisab;
        private final BigDecimal nisabThreshold;
        @Builder.Default
        private final List<Map<String, Object>> adjustments = List.of();
        private final BigDecimal expectedTotalAssets;
        @Builder.Default
        private final String targetCurrency = "SAR";
    }
}