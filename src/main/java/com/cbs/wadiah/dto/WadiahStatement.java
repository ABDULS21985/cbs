package com.cbs.wadiah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WadiahStatement {

    private String statementRef;
    private String accountNumber;
    private String accountName;
    private String customerName;
    private String customerNameAr;
    private String branchName;
    private String statementPeriod;
    private String statementPeriodAr;
    private String statementPeriodHijri;
    private String contractType;
    private String contractTypeAr;
    private String productName;
    private String productNameAr;
    private String currencyCode;
    private BigDecimal openingBalance;
    private BigDecimal closingBalance;
    private BigDecimal totalDeposits;
    private BigDecimal totalWithdrawals;
    private BigDecimal totalHibahReceived;
    private BigDecimal averageBalance;
    private Integer transactionCount;

    @Builder.Default
    private List<WadiahStatementLine> transactions = new ArrayList<>();

    private ZakatSummary zakatSummary;
    private String hibahDisclaimer;
    private String hibahDisclaimerAr;
    private String bankName;
    private String bankNameAr;
    private String shariahDisclosure;
    private String shariahDisclosureAr;
    private String generatedDate;
    private String generatedDateHijri;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WadiahStatementLine {
        private String date;
        private String dateHijri;
        private String description;
        private String descriptionAr;
        private String reference;
        private BigDecimal debit;
        private BigDecimal credit;
        private BigDecimal balance;
        private String transactionType;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ZakatSummary {
        private BigDecimal zakatableBalance;
        private BigDecimal estimatedZakat;
        private String zakatDisclaimer;
        private String zakatDisclaimerAr;
    }
}
