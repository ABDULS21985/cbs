package com.cbs.account.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WalletTransactionResponse {
    private Long id;
    private Long walletId;
    private String type;
    private BigDecimal amount;
    private BigDecimal balanceAfter;
    private String narration;
    private String reference;
    private Instant createdAt;
}
