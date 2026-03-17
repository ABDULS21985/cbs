package com.cbs.loyalty.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
@Entity @Table(name = "loyalty_program")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoyaltyProgram {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String programCode;
    @Column(nullable = false, length = 200) private String programName;
    @Column(nullable = false, length = 20) private String programType;
    @Builder.Default private BigDecimal pointsPerCurrency = BigDecimal.ONE;
    @Builder.Default private BigDecimal pointsValueCurrency = new BigDecimal("0.01");
    @Builder.Default private Integer minRedemptionPoints = 100;
    private Integer pointsExpiryMonths;
    @JdbcTypeCode(SqlTypes.JSON) private List<Map<String, Object>> tierLevels;
    @Builder.Default private Boolean isActive = true;
    @Builder.Default private Instant createdAt = Instant.now();
}
