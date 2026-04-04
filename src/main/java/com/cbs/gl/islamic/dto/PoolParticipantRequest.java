package com.cbs.gl.islamic.dto;

import com.cbs.gl.islamic.entity.ProfitDistributionMethod;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PoolParticipantRequest {
    @NotNull
    private Long accountId;
    @NotNull
    private BigDecimal amount;
    private ProfitDistributionMethod profitDistributionMethod;
    private String reason;
}
