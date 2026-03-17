package com.cbs.nostro.dto;

import com.cbs.nostro.entity.MatchStatus;
import com.cbs.nostro.entity.ReconItemType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReconciliationItemDto {

    private Long id;

    @NotNull private ReconItemType itemType;
    @NotBlank private String reference;
    @NotNull @DecimalMin("0.01") private BigDecimal amount;
    private String currencyCode;
    @NotNull private LocalDate valueDate;
    private String narration;
    private String matchReference;
    private MatchStatus matchStatus;
    private LocalDate resolvedDate;
    private String resolvedBy;
    private String notes;
}
