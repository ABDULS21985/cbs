package com.cbs.gl.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record JournalLineResponse(
        Long id,
        Integer lineNumber,
        String glCode,
        BigDecimal debitAmount,
        BigDecimal creditAmount,
        String currencyCode,
        BigDecimal localDebit,
        BigDecimal localCredit,
        BigDecimal fxRate,
        String narration,
        String costCentre,
        String branchCode,
        Long accountId,
        Long customerId,
        Instant createdAt
) {
}
