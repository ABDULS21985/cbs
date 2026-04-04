package com.cbs.shariah.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SupersedeFatwaRequest {

    @NotNull(message = "Replacement fatwa ID is required")
    private Long replacementFatwaId;
}
