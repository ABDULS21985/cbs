package com.cbs.account.dto;

import com.cbs.account.entity.AccountType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OpenAccountRequest {

    @NotNull(message = "Customer ID is required")
    private Long customerId;

    @NotBlank(message = "Product code is required")
    @Size(max = 20)
    private String productCode;

    @NotNull(message = "Account type is required")
    private AccountType accountType;

    @Size(max = 200)
    private String accountName;

    @Size(min = 3, max = 3)
    private String currencyCode;

    @DecimalMin(value = "0.00")
    private BigDecimal initialDeposit;

    @Size(max = 10)
    private String branchCode;

    private String relationshipManager;
    private String statementFrequency;

    // For joint accounts
    @Valid
    private List<SignatoryDto> signatories;

    // Overdraft setup
    @DecimalMin(value = "0.00")
    private BigDecimal overdraftLimit;
}
