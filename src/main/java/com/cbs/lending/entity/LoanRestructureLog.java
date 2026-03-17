package com.cbs.lending.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "loan_restructure_log", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoanRestructureLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "loan_account_id", nullable = false)
    private Long loanAccountId;

    @Column(name = "restructure_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private RestructureType restructureType;

    @Column(name = "old_interest_rate", precision = 8, scale = 4)
    private BigDecimal oldInterestRate;

    @Column(name = "old_tenure_months")
    private Integer oldTenureMonths;

    @Column(name = "old_emi_amount", precision = 18, scale = 2)
    private BigDecimal oldEmiAmount;

    @Column(name = "old_outstanding", precision = 18, scale = 2)
    private BigDecimal oldOutstanding;

    @Column(name = "old_next_due_date")
    private LocalDate oldNextDueDate;

    @Column(name = "old_schedule_type", length = 30)
    private String oldScheduleType;

    @Column(name = "new_interest_rate", precision = 8, scale = 4)
    private BigDecimal newInterestRate;

    @Column(name = "new_tenure_months")
    private Integer newTenureMonths;

    @Column(name = "new_emi_amount", precision = 18, scale = 2)
    private BigDecimal newEmiAmount;

    @Column(name = "new_outstanding", precision = 18, scale = 2)
    private BigDecimal newOutstanding;

    @Column(name = "new_next_due_date")
    private LocalDate newNextDueDate;

    @Column(name = "new_schedule_type", length = 30)
    private String newScheduleType;

    @Column(name = "moratorium_months")
    private Integer moratoriumMonths;

    @Column(name = "moratorium_end_date")
    private LocalDate moratoriumEndDate;

    @Column(name = "interest_during_moratorium", length = 20)
    private String interestDuringMoratorium;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Version
    @Column(name = "version")
    private Long version;
}
