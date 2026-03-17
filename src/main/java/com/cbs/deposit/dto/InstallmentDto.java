package com.cbs.deposit.dto;

import com.cbs.deposit.entity.InstallmentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InstallmentDto {

    private Long id;
    private Integer installmentNumber;
    private LocalDate dueDate;
    private LocalDate paidDate;
    private BigDecimal amountDue;
    private BigDecimal amountPaid;
    private BigDecimal penaltyAmount;
    private InstallmentStatus status;
    private String transactionRef;
    private Boolean overdue;
}
