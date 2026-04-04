package com.cbs.islamicaml.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SarReviewRequest {

    @NotBlank(message = "Review notes are required")
    private String reviewNotes;
}
