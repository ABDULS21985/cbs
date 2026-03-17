package com.cbs.customer.dto;

import com.cbs.customer.entity.AddressType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddressDto {

    private Long id;

    @NotNull(message = "Address type is required")
    private AddressType addressType;

    @NotBlank(message = "Address line 1 is required")
    @Size(max = 255)
    private String addressLine1;

    @Size(max = 255)
    private String addressLine2;

    @NotBlank(message = "City is required")
    @Size(max = 100)
    private String city;

    @Size(max = 50)
    private String state;

    @Size(min = 3, max = 3)
    private String country;

    @Size(max = 20)
    private String postalCode;

    @Size(max = 100)
    private String lga;

    @Size(max = 200)
    private String landmark;

    private Boolean isPrimary;
    private Boolean isVerified;
    private Instant verifiedAt;
    private BigDecimal latitude;
    private BigDecimal longitude;
}
