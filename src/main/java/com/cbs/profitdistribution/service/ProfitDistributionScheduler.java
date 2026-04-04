package com.cbs.profitdistribution.service;

import com.cbs.gl.islamic.entity.PoolStatus;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.mudarabah.service.PoolWeightageService;
import com.cbs.profitdistribution.dto.InitiateDistributionRunRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProfitDistributionScheduler {

    private final PoolWeightageService poolWeightageService;
    private final InvestmentPoolRepository poolRepository;
    private final ProfitDistributionRunService runService;

    @Scheduled(cron = "0 0 23 * * *")
    public void recordDailyWeightages() {
        LocalDate today = LocalDate.now();
        poolWeightageService.recordDailyWeightagesForAllPools(today);
    }

    @Scheduled(cron = "0 0 6 1 * *")
    public void triggerMonthlyDistributions() {
        LocalDate previousMonthEnd = LocalDate.now().withDayOfMonth(1).minusDays(1);
        LocalDate previousMonthStart = previousMonthEnd.withDayOfMonth(1);
        poolRepository.findByStatus(PoolStatus.ACTIVE).forEach(pool -> {
            try {
                runService.initiateRun(InitiateDistributionRunRequest.builder()
                        .poolId(pool.getId())
                        .periodFrom(previousMonthStart)
                        .periodTo(previousMonthEnd)
                        .periodType("MONTHLY")
                        .build());
            } catch (Exception exception) {
                log.warn("Monthly profit-distribution trigger skipped for pool {}: {}",
                        pool.getPoolCode(), exception.getMessage());
            }
        });
    }

}
