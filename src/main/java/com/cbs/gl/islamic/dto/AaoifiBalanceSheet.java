package com.cbs.gl.islamic.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AaoifiBalanceSheet {
    private LocalDate asOfDate;
    private String currencyCode;
    @Builder.Default
    private AssetsSection assets = new AssetsSection();
    @Builder.Default
    private LiabilitiesSection liabilities = new LiabilitiesSection();
    @Builder.Default
    private UnrestrictedInvestmentAccountsSection unrestrictedInvestmentAccounts =
            new UnrestrictedInvestmentAccountsSection();
    @Builder.Default
    private RestrictedInvestmentAccountsSection restrictedInvestmentAccounts =
            new RestrictedInvestmentAccountsSection();
    @Builder.Default
    private OwnersEquitySection ownersEquity = new OwnersEquitySection();
    @Builder.Default
    private BigDecimal totalLiabilitiesAndEquity = BigDecimal.ZERO;
    @Builder.Default
    private Boolean isBalanced = false;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AssetsSection {
        @Builder.Default
        private BigDecimal cashAndEquivalents = BigDecimal.ZERO;
        @Builder.Default
        private Map<String, BigDecimal> financingReceivablesByContractType = new LinkedHashMap<>();
        @Builder.Default
        private BigDecimal totalFinancingReceivables = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal investmentsInSukuk = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal investmentsInEquity = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal ijarahAssetsNet = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal musharakahInvestments = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal mudarabahInvestments = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal otherAssets = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal totalAssets = BigDecimal.ZERO;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LiabilitiesSection {
        @Builder.Default
        private BigDecimal currentAccountsWadiah = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal currentAccountsQard = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal zakatPayable = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal charityFund = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal otherLiabilities = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal totalLiabilities = BigDecimal.ZERO;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UnrestrictedInvestmentAccountsSection {
        @Builder.Default
        private BigDecimal grossBalance = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal lessPerReserve = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal lessIrrReserve = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal netUnrestrictedInvestmentAccounts = BigDecimal.ZERO;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RestrictedInvestmentAccountsSection {
        @Builder.Default
        private BigDecimal totalRestrictedInvestments = BigDecimal.ZERO;
        @Builder.Default
        private List<PoolSummary> restrictedPoolBreakdown = new ArrayList<>();
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OwnersEquitySection {
        @Builder.Default
        private BigDecimal paidUpCapital = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal reserves = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal retainedEarnings = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal fairValueReserve = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal totalOwnersEquity = BigDecimal.ZERO;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PoolSummary {
        private String poolCode;
        private String name;
        @Builder.Default
        private BigDecimal balance = BigDecimal.ZERO;
    }
}
