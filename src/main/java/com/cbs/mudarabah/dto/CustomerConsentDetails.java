package com.cbs.mudarabah.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerConsentDetails {

    @NotBlank(message = "Consent method is required")
    private String consentMethod;

    private LocalDateTime consentDate;
}
