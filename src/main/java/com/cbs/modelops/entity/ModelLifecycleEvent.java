package com.cbs.modelops.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.time.LocalDate; import java.util.Map;
@Entity @Table(name = "model_lifecycle_event") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ModelLifecycleEvent extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String eventCode;
    @Column(nullable = false, length = 30) private String modelCode;
    @Column(nullable = false, length = 200) private String modelName;
    @Column(nullable = false, length = 25) private String eventType;
    @Column(nullable = false) private LocalDate eventDate;
    @Column(length = 200) private String performedBy;
    @Column(columnDefinition = "TEXT") private String description;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> findings;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> metricsSnapshot;
    @Column(length = 100) private String approvalCommittee;
    @Column(length = 30) private String riskTierChange;
    @Builder.Default private Boolean regulatoryNotification = false;
    @Column(length = 200) private String documentationRef;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "RECORDED";
}
