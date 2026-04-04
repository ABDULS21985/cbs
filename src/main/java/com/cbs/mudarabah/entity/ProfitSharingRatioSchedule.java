package com.cbs.mudarabah.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "psr_schedule", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ProfitSharingRatioSchedule extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_template_id")
    private Long productTemplateId;

    @Column(name = "schedule_name", length = 200, nullable = false)
    private String scheduleName;

    @Enumerated(EnumType.STRING)
    @Column(name = "schedule_type", nullable = false)
    private PsrScheduleType scheduleType;

    @Column(name = "flat_psr_customer", precision = 8, scale = 4)
    private BigDecimal flatPsrCustomer;

    @Column(name = "flat_psr_bank", precision = 8, scale = 4)
    private BigDecimal flatPsrBank;

    @Column(name = "decision_table_code", length = 100)
    private String decisionTableCode;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Builder.Default
    @Column(name = "status", length = 20)
    private String status = "ACTIVE";

    @Column(name = "tenant_id")
    private Long tenantId;
}
