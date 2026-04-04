package com.cbs.shariahcompliance.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "charity_recipient", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CharityRecipient extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient_code", nullable = false, unique = true, length = 50)
    private String recipientCode;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "name_ar", length = 200)
    private String nameAr;

    @Column(name = "registration_number", length = 100)
    private String registrationNumber;

    @Column(name = "country", length = 3)
    private String country;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 30)
    private CharityCategory category;

    @Column(name = "bank_account_number", length = 50)
    private String bankAccountNumber;

    @Column(name = "bank_name", length = 200)
    private String bankName;

    @Column(name = "bank_swift_code", length = 20)
    private String bankSwiftCode;

    @Column(name = "contact_person", length = 200)
    private String contactPerson;

    @Column(name = "contact_email", length = 200)
    private String contactEmail;

    @Column(name = "contact_phone", length = 30)
    private String contactPhone;

    @Column(name = "ssb_approved", nullable = false)
    private boolean ssbApproved;

    @Column(name = "ssb_approval_date")
    private LocalDate ssbApprovalDate;

    @Column(name = "ssb_approval_ref", length = 100)
    private String ssbApprovalRef;

    @Column(name = "max_annual_disbursement", precision = 18, scale = 4)
    private BigDecimal maxAnnualDisbursement;

    @Column(name = "total_disbursed_ytd", precision = 18, scale = 4)
    private BigDecimal totalDisbursedYtd;

    @Column(name = "total_disbursed_lifetime", precision = 18, scale = 4)
    private BigDecimal totalDisbursedLifetime;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "tenant_id")
    private Long tenantId;
}
