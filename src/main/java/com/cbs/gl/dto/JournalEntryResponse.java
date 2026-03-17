package com.cbs.gl.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record JournalEntryResponse(
        Long id,
        String journalNumber,
        String journalType,
        String description,
        String sourceModule,
        String sourceRef,
        LocalDate valueDate,
        LocalDate postingDate,
        String status,
        BigDecimal totalDebit,
        BigDecimal totalCredit,
        String createdBy,
        String approvedBy,
        Instant postedAt,
        Instant reversedAt,
        Long reversalJournalId,
        Instant createdAt,
        List<JournalLineResponse> lines
) {
}
