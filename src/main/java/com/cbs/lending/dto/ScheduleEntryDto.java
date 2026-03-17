package com.cbs.lending.dto;

import com.cbs.lending.entity.ScheduleInstallmentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ScheduleEntryDto {
    private Long id;
    private Integer installmentNumber;
    private LocalDate dueDate;
    private BigDecimal principalDue;
    private BigDecimal interestDue;
    private BigDecimal totalDue;
    private BigDecimal principalPaid;
    private BigDecimal interestPaid;
    private BigDecimal penaltyDue;
    private BigDecimal penaltyPaid;
    private BigDecimal totalPaid;
    private BigDecimal outstanding;
    private LocalDate paidDate;
    private ScheduleInstallmentStatus status;
    private Boolean overdue;
}
