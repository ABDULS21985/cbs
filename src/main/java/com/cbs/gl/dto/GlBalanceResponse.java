package com.cbs.gl.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record GlBalanceResponse(
        Long id,
        String glCode,
        String branchCode,
        String currencyCode,
        LocalDate balanceDate,
        BigDecimal openingBalance,
        BigDecimal debitTotal,
        BigDecimal creditTotal,
        BigDecimal closingBalance,
        Integer transactionCount,
        Instant createdAt,
        Instant updatedAt
) {
}
