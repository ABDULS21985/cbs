package com.cbs.billing.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillFavoriteRequestDto {

    @NotBlank(message = "Biller code is required")
    private String billerCode;

    @NotBlank(message = "Biller customer ID is required")
    private String billerCustomerId;

    private String alias;

    @Builder.Default
    private Map<String, String> fields = new HashMap<>();
}
