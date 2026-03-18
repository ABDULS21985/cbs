package com.cbs.productdeploy.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.time.LocalDate; import java.util.List;
@Entity @Table(name = "product_deployment") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ProductDeployment extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String deploymentCode;
    @Column(nullable = false, length = 30) private String productCode;
    @Column(nullable = false, length = 200) private String productName;
    @Column(nullable = false, length = 15) private String deploymentType;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> targetChannels;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> targetBranches;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> targetRegions;
    @Column(nullable = false) private LocalDate plannedDate;
    private LocalDate actualDate;
    @Column(columnDefinition = "TEXT") private String rollbackPlan;
    private Integer adoptionTarget;
    @Builder.Default private Integer adoptionActual = 0;
    @Builder.Default private Integer issuesCount = 0;
    @Column(length = 80) private String approvedBy;
    @Column(length = 30) private String changeRequestRef;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "PLANNED";
}
