package com.cbs.merchant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmitRepresentmentRequest {

    @NotBlank(message = "Response reference is required")
    @Size(max = 80, message = "Response reference must not exceed 80 characters")
    private String responseRef;

    @NotEmpty(message = "Evidence must not be empty")
    private Map<String, Object> evidence;
}
