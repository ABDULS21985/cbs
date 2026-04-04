package com.cbs.islamicaml.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "sanctions_list_configuration", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class SanctionsListConfiguration extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "list_code", nullable = false, unique = true, length = 50)
    private String listCode;

    @Column(name = "list_name", nullable = false, length = 300)
    private String listName;

    @Column(name = "list_provider", length = 300)
    private String listProvider;

    @Column(name = "list_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private SanctionsListType listType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "applicable_countries", columnDefinition = "jsonb")
    private List<String> applicableCountries;

    @Column(name = "update_frequency", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default private ListUpdateFrequency updateFrequency = ListUpdateFrequency.DAILY;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    @Column(name = "data_source_url", length = 500)
    private String dataSourceUrl;

    @Column(name = "total_entries", nullable = false)
    @Builder.Default private int totalEntries = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default private boolean isActive = true;

    @Column(name = "priority", nullable = false)
    @Builder.Default private int priority = 100;

    @Column(name = "tenant_id")
    private Long tenantId;
}
