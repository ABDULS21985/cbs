package com.cbs.islamicaml.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CloseAlertRequest {

    @NotBlank(message = "Closure reason is required")
    private String closureReason;

    @NotBlank(message = "Closed by is required")
    private String closedBy;
}
