package com.cbs.channel.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

@Entity
@Table(name = "service_point")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ServicePoint extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String servicePointCode;

    @Column(nullable = false, length = 200)
    private String servicePointName;

    @Column(nullable = false, length = 20)
    private String servicePointType;

    private Long locationId;

    @Column(length = 80)
    private String deviceId;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> supportedServices;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> operatingHours;

    @Builder.Default
    private Boolean isAccessible = false;

    @Builder.Default
    private Boolean staffRequired = true;

    @Column(length = 80)
    private String assignedStaffId;

    @Builder.Default
    private Integer maxConcurrentCustomers = 1;

    private Integer avgServiceTimeMinutes;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "ONLINE";
}
