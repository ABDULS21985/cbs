package com.cbs.shariahcompliance.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "shariah_exclusion_list", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ShariahExclusionList extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "list_code", nullable = false, unique = true, length = 50)
    private String listCode;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "list_type", nullable = false, length = 30)
    private ExclusionListType listType;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "last_updated_at")
    private LocalDateTime lastUpdatedAt;

    @Column(name = "last_updated_by", length = 100)
    private String lastUpdatedBy;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "tenant_id")
    private Long tenantId;
}
