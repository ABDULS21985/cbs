package com.cbs.governance.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "parameter_audit")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ParameterAudit {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long parameterId;
    @Column(columnDefinition = "TEXT") private String oldValue;
    @Column(nullable = false, columnDefinition = "TEXT") private String newValue;
    @Column(nullable = false, length = 80) private String changedBy;
    @Column(columnDefinition = "TEXT") private String changeReason;
    @Builder.Default private Instant createdAt = Instant.now();
}
