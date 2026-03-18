package com.cbs.contactcenter.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
@Entity @Table(name = "contact_center")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContactCenter {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String centerCode;
    @Column(nullable = false, length = 200) private String centerName;
    @Column(nullable = false, length = 20) private String centerType;
    @Column(nullable = false, length = 40) @Builder.Default private String timezone = "UTC";
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> operatingHours;
    @Builder.Default private Integer totalAgents = 0;
    @Builder.Default private Integer activeAgents = 0;
    @Builder.Default private Integer queueCapacity = 100;
    @Builder.Default private Integer avgWaitTimeSec = 0;
    @Builder.Default private Integer avgHandleTimeSec = 0;
    @Builder.Default private BigDecimal serviceLevelTarget = new BigDecimal("80.00");
    @Builder.Default private BigDecimal currentServiceLevel = BigDecimal.ZERO;
    @Builder.Default private Boolean isActive = true;
    @Builder.Default private Instant createdAt = Instant.now();
}
