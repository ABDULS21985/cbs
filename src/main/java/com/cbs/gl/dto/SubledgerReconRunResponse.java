package com.cbs.gl.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record SubledgerReconRunResponse(
        Long id,
        LocalDate reconDate,
        String subledgerType,
        String glCode,
        BigDecimal glBalance,
        BigDecimal subledgerBalance,
        BigDecimal difference,
        Boolean balanced,
        Integer exceptionCount,
        String status,
        String resolvedBy,
        Instant resolvedAt,
        Instant createdAt
) {
}
