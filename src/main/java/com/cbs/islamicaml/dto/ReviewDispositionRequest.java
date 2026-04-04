package com.cbs.islamicaml.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReviewDispositionRequest {

    @NotBlank(message = "Disposition status is required")
    private String dispositionStatus;

    private String reviewNotes;
}
