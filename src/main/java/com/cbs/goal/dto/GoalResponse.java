package com.cbs.goal.dto;

import com.cbs.goal.entity.GoalStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GoalResponse {

    private Long id;
    private String goalNumber;
    private Long accountId;
    private String accountNumber;
    private Long customerId;
    private String customerDisplayName;
    private String goalName;
    private String goalDescription;
    private String goalIcon;
    private BigDecimal targetAmount;
    private LocalDate targetDate;
    private BigDecimal currentAmount;
    private BigDecimal progressPercentage;
    private Boolean autoDebitEnabled;
    private BigDecimal autoDebitAmount;
    private String autoDebitFrequency;
    private LocalDate nextAutoDebitDate;
    private Boolean interestBearing;
    private BigDecimal interestRate;
    private BigDecimal accruedInterest;
    private GoalStatus status;
    private LocalDate completedDate;
    private Boolean isLocked;
    private Boolean allowWithdrawalBeforeTarget;
    private String currencyCode;
    private Map<String, Object> metadata;
    private Instant createdAt;
}
