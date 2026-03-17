package com.cbs.standing.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "standing_instruction", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class StandingInstruction extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "instruction_ref", nullable = false, unique = true, length = 30)
    private String instructionRef;

    @Column(name = "instruction_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private InstructionType instructionType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debit_account_id", nullable = false)
    private Account debitAccount;

    @Column(name = "credit_account_number", nullable = false, length = 34)
    private String creditAccountNumber;

    @Column(name = "credit_account_name", length = 200)
    private String creditAccountName;

    @Column(name = "credit_bank_code", length = 20)
    private String creditBankCode;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "frequency", nullable = false, length = 20)
    private String frequency;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "next_execution_date", nullable = false)
    private LocalDate nextExecutionDate;

    @Column(name = "last_execution_date")
    private LocalDate lastExecutionDate;

    @Column(name = "total_executions", nullable = false)
    @Builder.Default private Integer totalExecutions = 0;

    @Column(name = "successful_executions", nullable = false)
    @Builder.Default private Integer successfulExecutions = 0;

    @Column(name = "failed_executions", nullable = false)
    @Builder.Default private Integer failedExecutions = 0;

    @Column(name = "max_executions")
    private Integer maxExecutions;

    @Column(name = "max_retries", nullable = false)
    @Builder.Default private Integer maxRetries = 3;

    @Column(name = "retry_count", nullable = false)
    @Builder.Default private Integer retryCount = 0;

    @Column(name = "mandate_ref", length = 50)
    private String mandateRef;

    @Column(name = "mandate_holder_name", length = 200)
    private String mandateHolderName;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private StandingStatus status = StandingStatus.ACTIVE;

    @Column(name = "narration", length = 300)
    private String narration;

    public LocalDate calculateNextDate() {
        return switch (frequency.toUpperCase()) {
            case "WEEKLY" -> nextExecutionDate.plusWeeks(1);
            case "BI_WEEKLY" -> nextExecutionDate.plusWeeks(2);
            case "MONTHLY" -> nextExecutionDate.plusMonths(1);
            case "QUARTERLY" -> nextExecutionDate.plusMonths(3);
            case "ANNUALLY" -> nextExecutionDate.plusYears(1);
            default -> nextExecutionDate.plusMonths(1);
        };
    }

    public boolean isCompleted() {
        if (endDate != null && LocalDate.now().isAfter(endDate)) return true;
        if (maxExecutions != null && totalExecutions >= maxExecutions) return true;
        return false;
    }
}
