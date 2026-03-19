package com.cbs.customer.dto;

import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.entity.RiskRating;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerResponse {

    private Long id;
    private String cifNumber;
    private CustomerType customerType;
    private CustomerStatus status;
    private RiskRating riskRating;
    private String displayName;

    // Individual
    private String title;
    private String firstName;
    private String middleName;
    private String lastName;
    private LocalDate dateOfBirth;
    private String gender;
    private String maritalStatus;
    private String nationality;
    private String stateOfOrigin;
    private String lgaOfOrigin;

    // Corporate
    private String registeredName;
    private String tradingName;
    private String registrationNumber;
    private LocalDate registrationDate;
    private String industryCode;
    private String sectorCode;

    // Common
    private String taxId;
    private String email;
    private String phonePrimary;
    private String phoneSecondary;
    private String preferredLanguage;
    private String preferredChannel;
    private String relationshipManager;
    private String branchCode;
    private String onboardedChannel;
    private String profilePhotoUrl;
    private Map<String, Object> metadata;

    // Nested
    private List<AddressDto> addresses;
    private List<IdentificationDto> identifications;
    private List<ContactDto> contacts;
    private List<RelationshipDto> relationships;
    private List<NoteDto> notes;

    // Audit
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;

    @JsonProperty("phoneNumber")
    public String getPhoneNumber() {
        return phonePrimary;
    }

    @JsonProperty("customerNumber")
    public String getCustomerNumber() {
        return cifNumber;
    }

    @JsonProperty("fullName")
    public String getFullName() {
        return displayName;
    }

    @JsonProperty("type")
    public CustomerType getType() {
        return customerType;
    }

    @JsonProperty("phone")
    public String getPhone() {
        return phonePrimary;
    }
}
