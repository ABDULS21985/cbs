package com.cbs.gl.islamic.dto;

import com.cbs.gl.entity.ShariahClassification;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShariahClassificationUpdateRequest {
    @NotNull
    private ShariahClassification classification;
    private String reviewedBy;
}
