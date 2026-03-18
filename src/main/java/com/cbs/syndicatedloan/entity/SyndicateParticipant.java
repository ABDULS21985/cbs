package com.cbs.syndicatedloan.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Entity
@Table(name = "syndicate_participant")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class SyndicateParticipant extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long facilityId;

    @Column(nullable = false, length = 200)
    private String participantName;

    @Column(length = 11)
    private String participantBic;

    @Column(nullable = false, length = 20)
    private String role;

    @Column(nullable = false)
    private BigDecimal commitmentAmount;

    @Column(nullable = false)
    private BigDecimal sharePct;

    @Builder.Default
    private BigDecimal fundedAmount = BigDecimal.ZERO;

    @Column(length = 30)
    private String settlementAccount;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "COMMITTED";
}
