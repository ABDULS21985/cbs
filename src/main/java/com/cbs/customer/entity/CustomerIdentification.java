package com.cbs.customer.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "customer_identification", schema = "cbs",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_customer_id_type_number",
                columnNames = {"customer_id", "id_type", "id_number"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CustomerIdentification extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "id_type", nullable = false, length = 30)
    private String idType;

    @Column(name = "id_number", nullable = false, length = 50)
    private String idNumber;

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "issuing_authority", length = 100)
    private String issuingAuthority;

    @Column(name = "issuing_country", length = 3)
    private String issuingCountry;

    @Column(name = "is_primary", nullable = false)
    @Builder.Default
    private Boolean isPrimary = false;

    @Column(name = "is_verified", nullable = false)
    @Builder.Default
    private Boolean isVerified = false;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "verification_provider", length = 50)
    private String verificationProvider;

    @Column(name = "verification_ref", length = 100)
    private String verificationRef;

    @Column(name = "document_url", length = 500)
    private String documentUrl;

    public boolean isExpired() {
        return expiryDate != null && expiryDate.isBefore(LocalDate.now());
    }
}
