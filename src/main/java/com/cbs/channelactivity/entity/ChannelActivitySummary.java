package com.cbs.channelactivity.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity @Table(name = "channel_activity_summary")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ChannelActivitySummary extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false, length = 20) private String channel;
    @Column(nullable = false, length = 10) private String periodType;
    @Column(nullable = false) private LocalDate periodDate;
    @Builder.Default private Integer totalSessions = 0;
    @Builder.Default private Integer totalTransactions = 0;
    @Builder.Default private BigDecimal totalAmount = BigDecimal.ZERO;
    @Builder.Default private Integer avgResponseTimeMs = 0;
    @Builder.Default private Integer failureCount = 0;
    @Builder.Default private Integer uniqueActivities = 0;
    @Column(length = 30) private String mostUsedActivity;
}
