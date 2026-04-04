package com.cbs.profitdistribution.dto;

import com.cbs.profitdistribution.entity.StepStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DistributionRunStepLogResponse {

    private Long id;
    private Long distributionRunId;
    private int stepNumber;
    private String stepName;
    private StepStatus stepStatus;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private Long durationMs;
    private Map<String, Object> inputData;
    private Map<String, Object> outputData;
    private String errorMessage;
    private String errorStackTrace;
    private String journalRef;
}
