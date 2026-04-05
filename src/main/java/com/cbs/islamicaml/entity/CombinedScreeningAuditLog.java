package com.cbs.islamicaml.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "combined_screening_audit_log", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CombinedScreeningAuditLog extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entity_name", nullable = false, length = 300)
    private String entityName;

    @Column(name = "outcome", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private CombinedScreeningOutcome outcome;

    @Column(name = "shariah_clear", nullable = false)
    private boolean shariahClear;

    @Column(name = "sanctions_clear", nullable = false)
    private boolean sanctionsClear;

    @Column(name = "shariah_screening_ref", length = 50)
    private String shariahScreeningRef;

    @Column(name = "sanctions_screening_ref", length = 50)
    private String sanctionsScreeningRef;

    @Column(name = "action_required", length = 100)
    private String actionRequired;

    @Column(name = "screened_at")
    private LocalDateTime screenedAt;

    @Column(name = "tenant_id")
    private Long tenantId;
}
