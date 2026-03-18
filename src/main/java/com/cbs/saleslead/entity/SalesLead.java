package com.cbs.saleslead.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
@Entity @Table(name = "sales_lead")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SalesLead {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String leadNumber;
    private Long customerId;
    @Column(nullable = false, length = 200) private String prospectName;
    private String prospectPhone;
    private String prospectEmail;
    @Column(nullable = false, length = 30) private String leadSource;
    private String productInterest;
    private BigDecimal estimatedValue;
    private String assignedTo;
    @Builder.Default private Integer leadScore = 0;
    @Column(nullable = false, length = 20) @Builder.Default private String stage = "NEW";
    private String lostReason;
    private LocalDate nextFollowUp;
    @Column(columnDefinition = "TEXT") private String notes;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
