package com.cbs.programtrading.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.programtrading.entity.ProgramExecution;
import com.cbs.programtrading.entity.TradingStrategy;
import com.cbs.programtrading.repository.ProgramExecutionRepository;
import com.cbs.programtrading.repository.TradingStrategyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ProgramTradingService {

    private final TradingStrategyRepository strategyRepository;
    private final ProgramExecutionRepository executionRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public TradingStrategy defineStrategy(TradingStrategy strategy) {
        strategy.setStrategyCode("TS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        strategy.setStatus("DRAFT");
        TradingStrategy saved = strategyRepository.save(strategy);
        log.info("AUDIT: Trading strategy defined by {}: code={}, name={}, type={}",
                currentActorProvider.getCurrentActor(), saved.getStrategyCode(), saved.getStrategyName(), saved.getStrategyType());
        return saved;
    }

    @Transactional
    public ProgramExecution launchExecution(String strategyCode, ProgramExecution execution) {
        TradingStrategy strategy = getStrategyByCode(strategyCode);
        if (!"APPROVED".equals(strategy.getStatus()) && !"ACTIVE".equals(strategy.getStatus())) {
            throw new BusinessException("Strategy " + strategyCode + " must be APPROVED or ACTIVE to launch execution; current status: " + strategy.getStatus(), "INVALID_STATE");
        }

        // Risk limit checks before launching
        if (strategy.getRiskLimits() != null) {
            Object maxExposure = strategy.getRiskLimits().get("maxExposure");
            if (maxExposure != null && execution.getTargetAmount() != null) {
                BigDecimal limit = new BigDecimal(maxExposure.toString());
                if (execution.getTargetAmount().compareTo(limit) > 0) {
                    throw new BusinessException("Execution target amount " + execution.getTargetAmount() + " exceeds risk limit " + limit, "RISK_LIMIT_BREACH");
                }
            }
        }

        execution.setExecutionRef("PE-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        execution.setStrategyId(strategy.getId());
        execution.setStatus("EXECUTING");
        execution.setStartedAt(Instant.now());
        ProgramExecution saved = executionRepository.save(execution);
        log.info("AUDIT: Program execution launched by {}: ref={}, strategy={}, targetAmount={}",
                currentActorProvider.getCurrentActor(), saved.getExecutionRef(), strategyCode, execution.getTargetAmount());
        return saved;
    }

    @Transactional
    public ProgramExecution pauseExecution(String executionRef) {
        ProgramExecution execution = getExecutionByRef(executionRef);
        // State guard: can only pause EXECUTING
        if (!"EXECUTING".equals(execution.getStatus())) {
            throw new BusinessException("Execution " + executionRef + " must be EXECUTING to pause; current status: " + execution.getStatus(), "INVALID_STATE");
        }
        execution.setStatus("PAUSED");
        log.info("AUDIT: Program execution paused by {}: ref={}", currentActorProvider.getCurrentActor(), executionRef);
        return executionRepository.save(execution);
    }

    @Transactional
    public ProgramExecution resumeExecution(String executionRef) {
        ProgramExecution execution = getExecutionByRef(executionRef);
        if (!"PAUSED".equals(execution.getStatus())) {
            throw new BusinessException("Execution " + executionRef + " must be PAUSED to resume; current status: " + execution.getStatus(), "INVALID_STATE");
        }
        execution.setStatus("EXECUTING");
        log.info("AUDIT: Program execution resumed by {}: ref={}", currentActorProvider.getCurrentActor(), executionRef);
        return executionRepository.save(execution);
    }

    @Transactional
    public ProgramExecution cancelExecution(String executionRef, String reason) {
        ProgramExecution execution = getExecutionByRef(executionRef);
        // State guard: cannot cancel already completed or cancelled
        if ("COMPLETED".equals(execution.getStatus()) || "CANCELLED".equals(execution.getStatus())) {
            throw new BusinessException("Execution " + executionRef + " is already " + execution.getStatus() + " and cannot be cancelled", "INVALID_STATE");
        }
        execution.setStatus("CANCELLED");
        execution.setCancelledReason(reason);
        log.info("AUDIT: Program execution cancelled by {}: ref={}, reason={}",
                currentActorProvider.getCurrentActor(), executionRef, reason);
        return executionRepository.save(execution);
    }

    public List<ProgramExecution> getActiveExecutions() {
        return executionRepository.findByStatusOrderByExecutionDateDesc("EXECUTING");
    }

    /**
     * Returns slippage report with calculated slippage for each execution.
     */
    public List<ProgramExecution> getSlippageReport(String strategyCode) {
        TradingStrategy strategy = getStrategyByCode(strategyCode);
        List<ProgramExecution> executions = executionRepository.findByStrategyIdOrderByExecutionDateDesc(strategy.getId());

        // Calculate slippage for executions that have benchmark and avg execution price
        for (ProgramExecution exec : executions) {
            if (exec.getBenchmarkPrice() != null && exec.getAvgExecutionPrice() != null
                    && exec.getBenchmarkPrice().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal slippage = exec.getAvgExecutionPrice().subtract(exec.getBenchmarkPrice())
                        .divide(exec.getBenchmarkPrice(), 6, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("10000")) // convert to bps
                        .setScale(2, RoundingMode.HALF_UP);
                exec.setSlippageBps(slippage);
            }
        }

        return executions;
    }

    public List<TradingStrategy> getAllStrategies() {
        return strategyRepository.findAll();
    }

    private TradingStrategy getStrategyByCode(String code) {
        return strategyRepository.findByStrategyCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("TradingStrategy", "strategyCode", code));
    }

    private ProgramExecution getExecutionByRef(String ref) {
        return executionRepository.findByExecutionRef(ref)
                .orElseThrow(() -> new ResourceNotFoundException("ProgramExecution", "executionRef", ref));
    }
}
