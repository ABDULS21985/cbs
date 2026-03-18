package com.cbs.projectfinance.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "project_milestone")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ProjectMilestone extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String milestoneCode;

    @Column(nullable = false)
    private Long facilityId;

    @Column(nullable = false, length = 200)
    private String milestoneName;

    @Column(nullable = false, length = 20)
    private String milestoneType;

    private String description;

    @Column(nullable = false)
    private LocalDate dueDate;

    private LocalDate completedDate;

    @Builder.Default
    private Boolean disbursementLinked = false;

    private BigDecimal disbursementAmount;

    @Column(length = 200)
    private String evidenceRef;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "PENDING";
}
