package com.cbs.account.dto;

import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.AccountType;
import com.cbs.account.entity.ProductCategory;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountResponse {

    private Long id;
    private String accountNumber;
    private String accountName;
    private Long customerId;
    private String customerCifNumber;
    private String customerDisplayName;
    private String productCode;
    private String productName;
    private ProductCategory productCategory;
    private String currencyCode;
    private AccountType accountType;
    private AccountStatus status;

    // Balances
    private BigDecimal bookBalance;
    private BigDecimal availableBalance;
    private BigDecimal lienAmount;
    private BigDecimal overdraftLimit;

    // Interest
    private BigDecimal accruedInterest;
    private BigDecimal applicableInterestRate;
    private LocalDate lastInterestCalcDate;
    private LocalDate lastInterestPostDate;

    // Dates
    private LocalDate openedDate;
    private LocalDate activatedDate;
    private LocalDate lastTransactionDate;
    private LocalDate dormancyDate;
    private LocalDate closedDate;
    private LocalDate maturityDate;

    // Operational
    private String branchCode;
    private String relationshipManager;
    private String statementFrequency;
    private Boolean allowDebit;
    private Boolean allowCredit;

    // Signatories
    private List<SignatoryDto> signatories;

    private Map<String, Object> metadata;
    private Instant createdAt;
}
