package com.cbs.programtrading.service;

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

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ProgramTradingService {

    private final TradingStrategyRepository strategyRepository;
    private final ProgramExecutionRepository executionRepository;

    @Transactional
    public TradingStrategy defineStrategy(TradingStrategy strategy) {
        strategy.setStrategyCode("TS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        strategy.setStatus("DRAFT");
        return strategyRepository.save(strategy);
    }

    @Transactional
    public ProgramExecution launchExecution(String strategyCode, ProgramExecution execution) {
        TradingStrategy strategy = getStrategyByCode(strategyCode);
        if (!"APPROVED".equals(strategy.getStatus()) && !"ACTIVE".equals(strategy.getStatus())) {
            throw new BusinessException("Strategy " + strategyCode + " must be APPROVED or ACTIVE to launch execution; current status: " + strategy.getStatus());
        }
        execution.setExecutionRef("PE-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        execution.setStrategyId(strategy.getId());
        execution.setStatus("EXECUTING");
        execution.setStartedAt(Instant.now());
        return executionRepository.save(execution);
    }

    @Transactional
    public ProgramExecution pauseExecution(String executionRef) {
        ProgramExecution execution = getExecutionByRef(executionRef);
        execution.setStatus("PAUSED");
        return executionRepository.save(execution);
    }

    @Transactional
    public ProgramExecution resumeExecution(String executionRef) {
        ProgramExecution execution = getExecutionByRef(executionRef);
        if (!"PAUSED".equals(execution.getStatus())) {
            throw new BusinessException("Execution " + executionRef + " must be PAUSED to resume; current status: " + execution.getStatus());
        }
        execution.setStatus("EXECUTING");
        return executionRepository.save(execution);
    }

    @Transactional
    public ProgramExecution cancelExecution(String executionRef, String reason) {
        ProgramExecution execution = getExecutionByRef(executionRef);
        execution.setStatus("CANCELLED");
        execution.setCancelledReason(reason);
        return executionRepository.save(execution);
    }

    public List<ProgramExecution> getActiveExecutions() {
        return executionRepository.findByStatusOrderByExecutionDateDesc("EXECUTING");
    }

    public List<ProgramExecution> getSlippageReport(String strategyCode) {
        TradingStrategy strategy = getStrategyByCode(strategyCode);
        return executionRepository.findByStrategyIdOrderByExecutionDateDesc(strategy.getId());
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
