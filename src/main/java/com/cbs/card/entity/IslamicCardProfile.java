package com.cbs.card.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Entity
@Table(name = "islamic_card_profile", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IslamicCardProfile extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "profile_code", nullable = false, unique = true, length = 40)
    private String profileCode;

    @Column(name = "profile_name", nullable = false, length = 120)
    private String profileName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "restricted_mccs", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<String> restrictedMccs = new ArrayList<>();

    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "tenant_id")
    private Long tenantId;

    public boolean blocks(String merchantCategoryCode) {
        if (merchantCategoryCode == null) {
            return false;
        }
        String normalized = merchantCategoryCode.trim().toUpperCase(Locale.ROOT);
        return restrictedMccs.stream()
                .filter(code -> code != null && !code.isBlank())
                .map(code -> code.trim().toUpperCase(Locale.ROOT))
                .anyMatch(normalized::equals);
    }
}