package com.cbs.islamicaml.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InvestigationDetails {

    @NotBlank(message = "Investigated by is required")
    private String investigatedBy;

    @NotBlank(message = "Investigation notes are required")
    private String investigationNotes;
}
