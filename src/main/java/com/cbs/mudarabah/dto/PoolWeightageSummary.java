package com.cbs.mudarabah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PoolWeightageSummary {

    private Long poolId;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private BigDecimal poolTotalDailyProduct;
    private int participantCount;
    private List<ParticipantWeightage> participants;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ParticipantWeightage {

        private Long accountId;
        private Long mudarabahAccountId;
        private BigDecimal totalDailyProduct;
        private BigDecimal weightagePercentage;
        private BigDecimal closingBalance;
    }
}
