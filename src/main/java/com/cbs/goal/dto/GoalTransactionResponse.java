package com.cbs.goal.dto;

import com.cbs.goal.entity.GoalTransactionType;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Read-only response DTO for a single savings_goal_transaction row.
 * Exposes sourceAccountId as a flat Long instead of the raw Account entity
 * so the frontend GoalTransaction type aligns exactly with this response.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GoalTransactionResponse {

    private Long id;
    private GoalTransactionType transactionType;
    private BigDecimal amount;
    private BigDecimal runningBalance;
    private String narration;
    private Long sourceAccountId;
    private String transactionRef;
    private Instant createdAt;
    private String createdBy;
}
