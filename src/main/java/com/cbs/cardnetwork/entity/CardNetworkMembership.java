package com.cbs.cardnetwork.entity;
import jakarta.persistence.*; import lombok.*;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate; import java.util.List; import java.util.Map;
@Entity @Table(name = "card_network_membership") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CardNetworkMembership {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 20) private String network;
    @Column(nullable = false, length = 20) private String membershipType;
    @Column(nullable = false, length = 40) private String memberId;
    @Column(nullable = false, length = 200) private String institutionName;
    @JdbcTypeCode(SqlTypes.JSON) private List<Map<String, Object>> binRanges;
    @Builder.Default private Boolean issuingEnabled = true; @Builder.Default private Boolean acquiringEnabled = true;
    private String settlementBic; @Column(nullable = false, length = 3) @Builder.Default private String settlementCurrency = "USD";
    @Builder.Default private Boolean pciDssCompliant = true; private LocalDate pciExpiryDate;
    private BigDecimal annualFee;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ACTIVE";
    @Column(nullable = false) private LocalDate effectiveFrom; private LocalDate effectiveTo;
    @Builder.Default private Instant createdAt = Instant.now();
}
