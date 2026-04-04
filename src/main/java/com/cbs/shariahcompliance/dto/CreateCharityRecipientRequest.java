package com.cbs.shariahcompliance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCharityRecipientRequest {

    @NotBlank(message = "Recipient code is required")
    private String recipientCode;

    @NotBlank(message = "Name is required")
    private String name;

    private String nameAr;
    private String registrationNumber;
    private String country;
    private String category;
    private String bankAccountNumber;
    private String bankName;
    private String contactPerson;
    private String contactEmail;
    private String contactPhone;
}
