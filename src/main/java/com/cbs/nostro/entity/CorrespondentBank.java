package com.cbs.nostro.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "correspondent_bank", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CorrespondentBank extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bank_code", nullable = false, unique = true, length = 20)
    private String bankCode;

    @Column(name = "bank_name", nullable = false, length = 200)
    private String bankName;

    @Column(name = "swift_bic", length = 11)
    private String swiftBic;

    @Column(name = "country", nullable = false, length = 3)
    private String country;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "relationship_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private CorrespondentRelationshipType relationshipType;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "contact_name", length = 100)
    private String contactName;

    @Column(name = "contact_email", length = 150)
    private String contactEmail;

    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();
}
