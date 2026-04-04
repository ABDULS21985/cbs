package com.cbs.islamicaml.dto;

import com.cbs.islamicaml.entity.CombinedScreeningOutcome;
import com.cbs.shariahcompliance.dto.ShariahScreeningResultResponse;
import lombok.*;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CombinedScreeningResult {
    private String entityName;
    private CombinedScreeningOutcome overallOutcome;
    private ShariahScreeningResultResponse shariahResult;
    private SanctionsScreeningResultResponse sanctionsResult;
    private boolean shariahClear;
    private boolean sanctionsClear;
    private List<Long> alertsGenerated;
    private String actionRequired;
}
