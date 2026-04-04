package com.cbs.mudarabah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PsrScheduleResponse {

    private Long id;
    private Long productTemplateId;
    private String scheduleName;
    private String scheduleType;
    private BigDecimal flatPsrCustomer;
    private BigDecimal flatPsrBank;
    private String decisionTableCode;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private String status;
}
