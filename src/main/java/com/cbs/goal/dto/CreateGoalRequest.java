package com.cbs.goal.dto;

import com.cbs.goal.entity.GoalStatus;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateGoalRequest {

    private Long customerId;

    @NotNull(message = "Account ID is required")
    private Long accountId;

    @NotBlank(message = "Goal name is required")
    @Size(max = 100)
    private String goalName;

    private String goalDescription;
    private String goalIcon;

    @NotNull(message = "Target amount is required")
    @DecimalMin(value = "0.01")
    private BigDecimal targetAmount;

    private LocalDate targetDate;
    private Boolean autoDebitEnabled;
    private BigDecimal autoDebitAmount;
    private String autoDebitFrequency;
    private Long autoDebitAccountId;
    private Boolean interestBearing;
    private BigDecimal interestRate;
    private Boolean isLocked;
    private Boolean allowWithdrawalBeforeTarget;

    @Size(min = 3, max = 3)
    private String currencyCode;

    private Map<String, Object> metadata;
}
