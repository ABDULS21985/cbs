package com.cbs.portal.islamic.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "islamic_portal_config", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class IslamicPortalConfig extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long tenantId;
    @Builder.Default private String defaultLanguage = "EN";
    @Builder.Default private boolean hijriDatesEnabled = true;
    @Builder.Default private boolean bilingualEnabled = true;
    private String terminologyVersion;
    @Builder.Default private boolean marketplaceEnabled = true;
    @Builder.Default private boolean onlineApplicationsEnabled = true;
}
