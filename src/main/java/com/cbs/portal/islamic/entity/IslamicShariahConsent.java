package com.cbs.portal.islamic.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.Instant;

@Entity
@Table(name = "islamic_shariah_consent", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class IslamicShariahConsent extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private Long customerId;
    private String applicationRef;
    private String productCode;
    @Column(nullable = false) private String contractType;
    @Builder.Default private String disclosureVersion = "v1";
    @Builder.Default private boolean allItemsConsented = false;
    private Instant consentTimestamp;
    private String consentMethod;
    private String ipAddress;
    @Column(length = 500) private String deviceInfo;
    @Column(length = 500) private String userAgent;
}
