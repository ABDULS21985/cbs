package com.cbs.mudarabah.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PlaceLienRequest {

    @NotBlank(message = "Financing reference is required")
    private String financingReference;

    @NotNull(message = "Lien amount is required")
    @DecimalMin(value = "0.01", message = "Lien amount must be greater than zero")
    private BigDecimal lienAmount;
}
