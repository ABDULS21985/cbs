package com.cbs.wealthmgmt.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "wealth_advisor")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class WealthAdvisor extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String advisorCode;

    @Column(nullable = false, length = 200)
    private String fullName;

    @Column(nullable = false, length = 200)
    private String email;

    @Column(length = 40)
    private String phone;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> specializations;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<Map<String, Object>> certifications;

    @Builder.Default
    private Integer maxClients = 30;

    @Builder.Default
    @Column(precision = 6, scale = 4)
    private BigDecimal managementFeePct = new BigDecimal("0.0125");

    @Builder.Default
    @Column(precision = 6, scale = 4)
    private BigDecimal advisoryFeePct = new BigDecimal("0.0075");

    @Builder.Default
    @Column(precision = 6, scale = 4)
    private BigDecimal performanceFeePct = new BigDecimal("0.0020");

    private LocalDate joinDate;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "ACTIVE";
}
