package com.cbs.nostro.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BreakDto {
    private Long id;
    private Long positionId;
    private Long reconItemId;
    private String accountNumber;
    private String bankName;
    private String currency;
    private BigDecimal amount;
    private String direction;
    private LocalDate detectedDate;
    private int agingDays;
    private String assignedTo;
    private String status;
    private String escalationLevel;
    private Instant slaDeadline;
    private String resolutionType;
    private String resolutionNotes;
    private LocalDate resolvedDate;
    private String resolvedBy;
    private Instant createdAt;
}
