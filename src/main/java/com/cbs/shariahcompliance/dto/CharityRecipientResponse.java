package com.cbs.shariahcompliance.dto;

import com.cbs.shariahcompliance.entity.CharityCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CharityRecipientResponse {
    private Long id;
    private String recipientCode;
    private String name;
    private String nameAr;
    private String registrationNumber;
    private String country;
    private CharityCategory category;
    private String bankAccountNumber;
    private String bankName;
    private String bankSwiftCode;
    private String contactPerson;
    private String contactEmail;
    private String contactPhone;
    private boolean ssbApproved;
    private LocalDate ssbApprovalDate;
    private String ssbApprovalRef;
    private BigDecimal maxAnnualDisbursement;
    private BigDecimal totalDisbursedYtd;
    private BigDecimal totalDisbursedLifetime;
    private String status;
    private Long tenantId;
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;
    private Long version;
}
