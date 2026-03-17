package com.cbs.customer.dto;

import com.cbs.customer.entity.CustomerType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateCustomerRequest {

    @NotNull(message = "Customer type is required")
    private CustomerType customerType;

    // Individual fields
    private String title;

    @Size(max = 100, message = "First name must not exceed 100 characters")
    private String firstName;

    @Size(max = 100, message = "Middle name must not exceed 100 characters")
    private String middleName;

    @Size(max = 100, message = "Last name must not exceed 100 characters")
    private String lastName;

    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    private String gender;
    private String maritalStatus;

    @Size(min = 3, max = 3, message = "Nationality must be a 3-letter ISO code")
    private String nationality;

    private String stateOfOrigin;
    private String lgaOfOrigin;
    private String motherMaidenName;

    // Corporate/SME fields
    @Size(max = 255, message = "Registered name must not exceed 255 characters")
    private String registeredName;

    @Size(max = 255, message = "Trading name must not exceed 255 characters")
    private String tradingName;

    @Size(max = 50, message = "Registration number must not exceed 50 characters")
    private String registrationNumber;

    @PastOrPresent(message = "Registration date must not be in the future")
    private LocalDate registrationDate;

    private String industryCode;
    private String sectorCode;

    // Common fields
    @Size(max = 30, message = "Tax ID must not exceed 30 characters")
    private String taxId;

    @Email(message = "Invalid email address")
    @Size(max = 150, message = "Email must not exceed 150 characters")
    private String email;

    @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "Invalid phone number format")
    private String phonePrimary;

    @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "Invalid phone number format")
    private String phoneSecondary;

    private String preferredLanguage;
    private String preferredChannel;
    private String relationshipManager;

    @Size(max = 10, message = "Branch code must not exceed 10 characters")
    private String branchCode;

    private String onboardedChannel;

    // Nested collections
    @Valid
    private List<AddressDto> addresses;

    @Valid
    private List<IdentificationDto> identifications;

    @Valid
    private List<ContactDto> contacts;

    private Map<String, Object> metadata;
}
