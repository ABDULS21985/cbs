package com.cbs.nostro.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StatementImportDto {
    private Long id;
    private Long positionId;
    private String accountNumber;
    private String bankName;
    private String filename;
    private String format;
    private LocalDate statementDate;
    private BigDecimal openingBalance;
    private BigDecimal closingBalance;
    private String currency;
    private BigDecimal totalCredits;
    private BigDecimal totalDebits;
    private Integer entriesCount;
    private String status;
    private String importedBy;
    private String errors;
    private Instant createdAt;
}
