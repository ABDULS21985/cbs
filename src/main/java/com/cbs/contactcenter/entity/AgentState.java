package com.cbs.contactcenter.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.util.List;

@Entity
@Table(name = "agent_state")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class AgentState extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String agentId;

    private String agentName;

    private Long centerId;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> skillGroups;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> languages;

    @Builder.Default
    private String currentState = "OFFLINE";

    private Instant stateChangedAt;

    private Long currentInteractionId;

    @Builder.Default
    private Integer dailyHandled = 0;

    @Builder.Default
    private Integer dailyAvgHandleTime = 0;

    @Builder.Default
    private BigDecimal dailyFirstContactResolution = BigDecimal.ZERO;

    private BigDecimal qualityScore;

    @Builder.Default
    private Integer maxConcurrentChats = 1;

    @Builder.Default
    private Integer activeChatCount = 0;

    private LocalTime shiftStart;

    private LocalTime shiftEnd;
}
