package com.cbs.contactcenter.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(name = "contact_queue")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ContactQueue extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String queueName;

    private Long centerId;

    @Column(length = 20)
    private String queueType;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> skillRequired;

    @Builder.Default
    private Integer currentWaiting = 0;

    @Builder.Default
    private Integer longestWaitSeconds = 0;

    private Integer slaTargetSeconds;

    private BigDecimal slaAchievementPct;

    private Integer maxCapacity;

    private Long overflowQueueId;

    @Builder.Default
    private String priorityLevel = "NORMAL";

    @Builder.Default
    private Integer agentsAssigned = 0;

    @Builder.Default
    private Integer agentsAvailable = 0;

    @Builder.Default
    private String status = "ACTIVE";
}
