package com.cbs.murabaha.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryDetailsRequest {

    @NotNull
    private LocalDate deliveryDate;

    @NotBlank
    private String deliveryReference;

    private String deliveryLocation;
}
