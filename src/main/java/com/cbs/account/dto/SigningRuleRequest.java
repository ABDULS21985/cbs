package com.cbs.account.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SigningRuleRequest {

    @NotBlank(message = "Signing rule is required")
    private String rule;
}
