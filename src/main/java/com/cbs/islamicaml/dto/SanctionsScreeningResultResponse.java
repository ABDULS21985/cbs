package com.cbs.islamicaml.dto;

import com.cbs.islamicaml.entity.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SanctionsScreeningResultResponse {
    private Long id;
    private String screeningRef;
    private SanctionsScreeningType screeningType;
    private String entityName;
    private SanctionsEntityType entityType;
    private Map<String, Object> entityIdentifiers;
    private String entityCountry;
    private List<String> listsScreened;
    private LocalDateTime screeningTimestamp;
    private long screeningDurationMs;
    private SanctionsOverallResult overallResult;
    private List<Map<String, Object>> matchDetails;
    private BigDecimal highestMatchScore;
    private int matchCount;
    private SanctionsDispositionStatus dispositionStatus;
    private String reviewedBy;
    private LocalDateTime reviewedAt;
    private String reviewNotes;
    private Long customerId;
    private String transactionRef;
    private String contractRef;
    private Long alertId;
    private Long tenantId;
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;
}
