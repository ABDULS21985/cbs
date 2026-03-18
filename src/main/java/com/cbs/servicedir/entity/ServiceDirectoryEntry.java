package com.cbs.servicedir.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
@Entity @Table(name = "service_directory_entry")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ServiceDirectoryEntry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 40) private String serviceCode;
    @Column(nullable = false, length = 200) private String serviceName;
    @Column(nullable = false, length = 30) private String serviceCategory;
    @Column(columnDefinition = "TEXT") private String description;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> availableChannels;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> eligibilityRules;
    @Builder.Default private Boolean requiresAppointment = false;
    private Integer slaMinutes;
    @Builder.Default private Boolean feeApplicable = false;
    private BigDecimal feeAmount;
    private String documentationUrl;
    @Builder.Default private Boolean isActive = true;
    @Builder.Default private Instant createdAt = Instant.now();
}
