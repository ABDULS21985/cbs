package com.cbs.account.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WalletResponse {
    private Long id;
    private Long accountId;
    private String currencyCode;
    private BigDecimal bookBalance;
    private BigDecimal availableBalance;
    private BigDecimal lienAmount;
    private Boolean isPrimary;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;
    private Long version;
}
