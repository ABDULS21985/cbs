package com.cbs.nostro.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BreakResolveRequest {
    @NotBlank
    private String resolutionType;  // MANUAL_MATCH, TIMING_DIFFERENCE, CORRECTION, WRITE_OFF, ESCALATE
    @NotBlank
    private String reason;
    private String glAccount;       // optional: for journal-based resolution
}
