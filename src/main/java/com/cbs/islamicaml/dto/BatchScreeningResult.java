package com.cbs.islamicaml.dto;

import lombok.*;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BatchScreeningResult {
    private int totalScreened;
    private int newMatches;
    private List<SanctionsScreeningResultResponse> results;
}
