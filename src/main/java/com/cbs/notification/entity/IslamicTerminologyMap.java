package com.cbs.notification.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "islamic_terminology_map", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IslamicTerminologyMap extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conventional_term", nullable = false, length = 120)
    private String conventionalTerm;

    @Column(name = "islamic_term_en", nullable = false, length = 120)
    private String islamicTermEn;

    @Column(name = "islamic_term_ar", nullable = false, length = 120)
    private String islamicTermAr;

    @Column(name = "context", nullable = false, length = 60)
    private String context;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private TerminologyStatus status = TerminologyStatus.ACTIVE;

    @Column(name = "tenant_id")
    private Long tenantId;
}
