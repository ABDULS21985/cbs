package com.cbs.cashpool.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "cash_pool_participant")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashPoolParticipant {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long poolId;
    @Column(nullable = false) private Long accountId;
    @Column(nullable = false, length = 200) private String participantName;
    @Column(nullable = false, length = 20) @Builder.Default private String participantRole = "PARTICIPANT";
    @Column(nullable = false, length = 20) @Builder.Default private String sweepDirection = "BIDIRECTIONAL";
    @Builder.Default private BigDecimal targetBalance = BigDecimal.ZERO;
    @Builder.Default private Integer priority = 100;
    @Builder.Default private Boolean isActive = true;
    @Builder.Default private Instant createdAt = Instant.now();
}
