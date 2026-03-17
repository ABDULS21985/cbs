package com.cbs.agreement.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
@Entity @Table(name = "customer_agreement")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerAgreement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String agreementNumber;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false, length = 30) private String agreementType;
    @Column(nullable = false, length = 300) private String title;
    @Column(columnDefinition = "TEXT") private String description;
    private String documentRef;
    @Column(nullable = false) private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    @Builder.Default private Boolean autoRenew = false;
    private Integer renewalTermMonths;
    private Integer noticePeriodDays;
    private String signedByCustomer;
    private String signedByBank;
    private LocalDate signedDate;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "DRAFT";
    @Column(columnDefinition = "TEXT") private String terminationReason;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
