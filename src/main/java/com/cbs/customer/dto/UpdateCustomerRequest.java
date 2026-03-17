package com.cbs.customer.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateCustomerRequest {

    private String title;

    @Size(max = 100)
    private String firstName;

    @Size(max = 100)
    private String middleName;

    @Size(max = 100)
    private String lastName;

    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    private String gender;
    private String maritalStatus;

    @Size(min = 3, max = 3)
    private String nationality;

    private String stateOfOrigin;
    private String lgaOfOrigin;
    private String motherMaidenName;

    // Corporate
    @Size(max = 255)
    private String registeredName;

    @Size(max = 255)
    private String tradingName;

    @Size(max = 50)
    private String registrationNumber;

    @PastOrPresent
    private LocalDate registrationDate;

    private String industryCode;
    private String sectorCode;

    // Common
    @Size(max = 30)
    private String taxId;

    @Email
    @Size(max = 150)
    private String email;

    @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "Invalid phone number format")
    private String phonePrimary;

    @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "Invalid phone number format")
    private String phoneSecondary;

    private String preferredLanguage;
    private String preferredChannel;
    private String relationshipManager;

    @Size(max = 10)
    private String branchCode;

    private String profilePhotoUrl;
    private Map<String, Object> metadata;
}
