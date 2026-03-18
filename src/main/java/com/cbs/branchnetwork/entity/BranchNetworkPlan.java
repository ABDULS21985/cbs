package com.cbs.branchnetwork.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import java.math.BigDecimal; import java.time.LocalDate;
@Entity @Table(name = "branch_network_plan") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class BranchNetworkPlan extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String planCode;
    @Column(nullable = false, length = 200) private String planName;
    @Column(nullable = false, length = 20) private String planType;
    @Column(nullable = false, length = 60) private String region;
    @Column(columnDefinition = "TEXT") private String targetLocation;
    private BigDecimal latitude; private BigDecimal longitude;
    private BigDecimal estimatedCost; private BigDecimal estimatedRevenueAnnual;
    private Integer paybackMonths; private Integer targetCustomers;
    private Long catchmentPopulation; private Integer competitiveDensity;
    private LocalDate plannedStart; private LocalDate plannedCompletion; private LocalDate actualCompletion;
    @Column(length = 80) private String approvedBy;
    @Column(length = 60) private String boardApprovalRef;
    @Column(length = 60) private String regulatoryApprovalRef;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "PROPOSED";
}
