package com.cbs.nostro.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ParsedStatementDto {

    private StatementHeader header;
    private List<StatementEntry> entries;
    private boolean isDuplicate;
    private List<String> parseWarnings;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class StatementHeader {
        private String accountNumber;
        private String statementDate;
        private BigDecimal openingBalance;
        private BigDecimal closingBalance;
        private String currency;
        private String bankName;
        private BigDecimal totalCredits;
        private BigDecimal totalDebits;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class StatementEntry {
        private String id;
        private String date;
        private String valueDate;
        private BigDecimal amount;
        private String direction;   // D or C
        private String reference;
        private String narration;
        private BigDecimal balance;
    }
}
