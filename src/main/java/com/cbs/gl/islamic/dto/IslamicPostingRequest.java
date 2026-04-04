package com.cbs.gl.islamic.dto;

import com.cbs.gl.islamic.entity.IslamicTransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IslamicPostingRequest {
    @NotBlank
    private String contractTypeCode;
    @NotNull
    private IslamicTransactionType txnType;
    private Long productId;
    private Long accountId;
    private Long poolId;
    @NotNull
    private BigDecimal amount;
    private BigDecimal principal;
    private BigDecimal profit;
    private BigDecimal markup;
    private BigDecimal rental;
    private BigDecimal penalty;
    private BigDecimal depreciation;
    @Builder.Default
    private LocalDate valueDate = LocalDate.now();
    private String reference;
    private String narration;
    @Builder.Default
    private Map<String, Object> additionalContext = new HashMap<>();
}
