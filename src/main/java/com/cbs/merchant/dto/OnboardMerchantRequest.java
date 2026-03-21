package com.cbs.merchant.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OnboardMerchantRequest {

    @NotBlank(message = "Merchant name is required")
    @Size(max = 200, message = "Merchant name must not exceed 200 characters")
    private String merchantName;

    @Size(max = 200, message = "Trading name must not exceed 200 characters")
    private String tradingName;

    @NotBlank(message = "Merchant category code (MCC) is required")
    @Size(min = 3, max = 10, message = "MCC must be between 3 and 10 characters")
    private String merchantCategoryCode;

    @NotBlank(message = "Business type is required")
    @Size(max = 30, message = "Business type must not exceed 30 characters")
    private String businessType;

    @Size(max = 50, message = "Registration number must not exceed 50 characters")
    private String registrationNumber;

    @Size(max = 30, message = "Tax ID must not exceed 30 characters")
    private String taxId;

    @Size(max = 100, message = "Contact name must not exceed 100 characters")
    private String contactName;

    @Size(max = 20, message = "Contact phone must not exceed 20 characters")
    private String contactPhone;

    @Email(message = "Invalid contact email address")
    @Size(max = 150, message = "Contact email must not exceed 150 characters")
    private String contactEmail;

    private String address;

    private Long settlementAccountId;

    @Size(max = 15, message = "Settlement frequency must not exceed 15 characters")
    private String settlementFrequency;

    @NotNull(message = "MDR rate is required")
    @DecimalMin(value = "0.00", message = "MDR rate must be >= 0")
    @DecimalMax(value = "100.00", message = "MDR rate must be <= 100")
    private BigDecimal mdrRate;

    private BigDecimal monthlyVolumeLimit;

    @NotBlank(message = "Risk category is required")
    @Size(max = 10, message = "Risk category must not exceed 10 characters")
    private String riskCategory;
}
