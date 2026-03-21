package com.cbs.card.dto;

import com.cbs.card.entity.CardScheme;
import com.cbs.card.entity.CardType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IssueCardRequest {

    @NotNull(message = "accountId is required")
    private Long accountId;

    @NotNull(message = "cardType is required")
    private CardType cardType;

    @NotNull(message = "cardScheme is required")
    private CardScheme cardScheme;

    private String cardTier;

    @NotBlank(message = "cardholderName is required")
    private String cardholderName;

    private LocalDate expiryDate;
    private BigDecimal dailyPosLimit;
    private BigDecimal dailyAtmLimit;
    private BigDecimal dailyOnlineLimit;
    private BigDecimal singleTxnLimit;
    private BigDecimal creditLimit;
}
