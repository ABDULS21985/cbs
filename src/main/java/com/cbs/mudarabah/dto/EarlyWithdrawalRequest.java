package com.cbs.mudarabah.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EarlyWithdrawalRequest {

    @NotBlank(message = "Reason is required")
    private String reason;
}
