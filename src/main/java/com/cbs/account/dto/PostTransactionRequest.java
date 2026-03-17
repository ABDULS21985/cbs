package com.cbs.account.dto;

import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostTransactionRequest {

    @NotBlank(message = "Account number is required")
    @Size(max = 20)
    private String accountNumber;

    @NotNull(message = "Transaction type is required")
    private TransactionType transactionType;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    @Digits(integer = 16, fraction = 2)
    private BigDecimal amount;

    @NotBlank(message = "Narration is required")
    @Size(max = 500)
    private String narration;

    private LocalDate valueDate;
    private String contraAccountNumber;
    private TransactionChannel channel;
    private String externalRef;
    private String instrumentNumber;
}
