package com.cbs.leasingitem.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate;
@Entity @Table(name = "leased_asset") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class LeasedAsset extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String assetCode;
    private Long leaseContractId;
    @Column(nullable = false, length = 25) private String assetType;
    @Column(nullable = false, length = 300) private String description;
    @Column(length = 100) private String manufacturer;
    @Column(length = 100) private String model;
    @Column(unique = true, length = 80) private String serialNumber;
    private Integer yearOfManufacture;
    @Column(nullable = false) private BigDecimal originalCost;
    private BigDecimal currentBookValue; private BigDecimal residualValue;
    @Column(length = 15) private String depreciationMethod;
    private BigDecimal monthlyDepreciation;
    @Column(columnDefinition = "TEXT") private String currentLocation;
    @Column(length = 10) @Builder.Default private String condition = "GOOD";
    private LocalDate lastInspectionDate; private LocalDate nextInspectionDue;
    @Column(length = 80) private String insurancePolicyRef;
    private LocalDate insuranceExpiry;
    @Column(length = 10) private String returnCondition;
    @Column(length = 200) private String returnInspectionRef;
    private Instant returnedAt;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ACTIVE";
}
