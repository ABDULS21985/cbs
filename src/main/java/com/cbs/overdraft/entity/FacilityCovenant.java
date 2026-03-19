package com.cbs.overdraft.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "facility_covenant", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class FacilityCovenant extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facility_id", nullable = false)
    private CreditFacility facility;

    @Column(name = "covenant_name", nullable = false, length = 200)
    private String covenantName;

    @Column(name = "threshold", nullable = false, length = 100)
    private String threshold;

    @Column(name = "current_value", length = 100)
    private String currentValue;

    @Column(name = "compliance", nullable = false, length = 20)
    @Builder.Default
    private String compliance = "COMPLIANT";

    @Column(name = "next_test_date")
    private LocalDate nextTestDate;

    @Column(name = "last_tested_date")
    private LocalDate lastTestedDate;
}
