package com.cbs.account.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountHoldDto {

    private Long id;
    private String reference;
    private BigDecimal amount;
    private String reason;
    private String placedBy;
    private String holdType;
    private String status;
    private LocalDate releaseDate;
    private String releasedBy;
    private String releaseReason;
}