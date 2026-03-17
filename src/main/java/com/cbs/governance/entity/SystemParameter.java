package com.cbs.governance.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "system_parameter")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SystemParameter {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 200) private String paramKey;
    @Column(nullable = false, length = 60) private String paramCategory;
    @Column(nullable = false, columnDefinition = "TEXT") private String paramValue;
    @Column(nullable = false, length = 20) @Builder.Default private String valueType = "STRING";
    @Column(columnDefinition = "TEXT") private String description;
    @Column(nullable = false) @Builder.Default private Instant effectiveFrom = Instant.now();
    private Instant effectiveTo;
    private Long tenantId;
    private Long branchId;
    @Builder.Default private Boolean isEncrypted = false;
    @Builder.Default private Boolean isActive = true;
    private String lastModifiedBy;
    @Column(nullable = false, length = 20) @Builder.Default private String approvalStatus = "APPROVED";
    private String approvedBy;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();

    public Object getTypedValue() {
        return switch (valueType) {
            case "INTEGER" -> Integer.parseInt(paramValue);
            case "DECIMAL" -> Double.parseDouble(paramValue);
            case "BOOLEAN" -> Boolean.parseBoolean(paramValue);
            default -> paramValue;
        };
    }
}
