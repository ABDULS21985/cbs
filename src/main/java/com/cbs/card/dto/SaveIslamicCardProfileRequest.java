package com.cbs.card.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaveIslamicCardProfileRequest {

    @NotBlank(message = "profileCode is required")
    private String profileCode;

    @NotBlank(message = "profileName is required")
    private String profileName;

    private String description;

    @Builder.Default
    private List<String> restrictedMccs = new ArrayList<>();

    private Boolean active;
}