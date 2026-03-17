package com.cbs.escrow.dto;

import com.cbs.escrow.entity.EscrowStatus;
import com.cbs.escrow.entity.EscrowType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateEscrowRequest {

    @NotNull private Long accountId;
    @NotNull private EscrowType escrowType;
    @NotBlank @Size(max = 500) private String purpose;
    private Long depositorCustomerId;
    private Long beneficiaryCustomerId;
    private List<String> releaseConditions;
    private Boolean requiresMultiSign;
    private Integer requiredSignatories;
    @NotNull @DecimalMin("0.01") private BigDecimal mandatedAmount;
    @Size(min = 3, max = 3) private String currencyCode;
    private LocalDate expiryDate;
}
