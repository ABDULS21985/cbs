package com.cbs.mudarabah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PsrResolution {

    private BigDecimal customerRatio;
    private BigDecimal bankRatio;
    private String resolutionMethod;
    private String decisionTableUsed;
    private Map<String, Object> inputsUsed;
    private boolean isNegotiated;
}
