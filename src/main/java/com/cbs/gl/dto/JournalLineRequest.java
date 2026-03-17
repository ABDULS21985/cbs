package com.cbs.gl.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record JournalLineRequest(
        @NotBlank String glCode,
        @NotNull BigDecimal debitAmount,
        @NotNull BigDecimal creditAmount,
        String currencyCode,
        BigDecimal fxRate,
        String narration,
        String costCentre,
        String branchCode,
        Long accountId,
        Long customerId
) {
}
