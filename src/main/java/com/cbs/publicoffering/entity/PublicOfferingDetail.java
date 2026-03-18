package com.cbs.publicoffering.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import java.math.BigDecimal;
import java.time.LocalDate;
@Entity @Table(name = "public_offering_detail") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class PublicOfferingDetail extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long dealId;
    @Column(nullable = false, length = 15) private String offeringType;
    @Column(nullable = false, length = 60) private String exchangeMarket;
    @Column(nullable = false) private Long sharesOffered;
    private BigDecimal parValue;
    private BigDecimal offerPrice;
    @Column(columnDefinition = "JSONB") private String priceRange;
    @Builder.Default private Boolean greenShoeOption = false;
    private Long greenShoeShares;
    private Integer lockUpPeriodDays;
    private LocalDate prospectusSubmittedDate;
    private LocalDate prospectusApprovalDate;
    @Column(length = 80) private String secApprovalRef;
    @Column(length = 80) private String nseApprovalRef;
    private LocalDate applicationOpenDate;
    private LocalDate applicationCloseDate;
    @Column(columnDefinition = "TEXT") private String basisOfAllotment;
    private LocalDate refundStartDate;
    private LocalDate listingDate;
    private BigDecimal openingPrice;
    @Column(name = "closing_price_day1") private BigDecimal closingPriceDay1;
    @Column(name = "price_performance_30_days") private BigDecimal pricePerformance30Days;
    private BigDecimal retailAllocationPct;
    private BigDecimal institutionalAllocationPct;
    private Long totalApplications;
    private BigDecimal totalAmountReceived;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "PLANNING";
}
