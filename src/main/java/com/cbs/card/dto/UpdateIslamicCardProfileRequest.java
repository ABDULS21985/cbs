package com.cbs.card.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateIslamicCardProfileRequest {

    @NotBlank(message = "restrictionProfileCode is required")
    private String restrictionProfileCode;
}