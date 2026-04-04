package com.cbs.murabaha.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplianceValidationResult {

    private boolean compliant;
    private String status;
    private Map<String, Boolean> flags;

    @Builder.Default
    private List<String> issues = new ArrayList<>();
}
