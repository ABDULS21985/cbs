package com.cbs.custody.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.custody.entity.SettlementBatch;
import com.cbs.custody.entity.SettlementInstruction;
import com.cbs.custody.repository.SettlementBatchRepository;
import com.cbs.custody.repository.SettlementInstructionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class SettlementService {

    private final SettlementInstructionRepository instructionRepository;
    private final SettlementBatchRepository batchRepository;

    @Transactional
    public SettlementInstruction createInstruction(SettlementInstruction instruction) {
        instruction.setInstructionRef("SI-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        instruction.setStatus("CREATED");
        SettlementInstruction saved = instructionRepository.save(instruction);
        log.info("Settlement instruction created: {}", saved.getInstructionRef());
        return saved;
    }

    @Transactional
    public List<SettlementInstruction> matchInstruction(String refA, String refB) {
        SettlementInstruction a = getInstruction(refA);
        SettlementInstruction b = getInstruction(refB);
        Instant now = Instant.now();
        a.setMatchStatus("MATCHED");
        a.setMatchedAt(now);
        b.setMatchStatus("MATCHED");
        b.setMatchedAt(now);
        instructionRepository.save(a);
        instructionRepository.save(b);
        log.info("Settlement instructions matched: {} <-> {}", refA, refB);
        return List.of(a, b);
    }

    @Transactional
    public SettlementInstruction submitForSettlement(String instructionRef) {
        SettlementInstruction instruction = getInstruction(instructionRef);
        instruction.setStatus("SETTLING");
        SettlementInstruction saved = instructionRepository.save(instruction);
        log.info("Settlement instruction submitted: {}", instructionRef);
        return saved;
    }

    @Transactional
    public SettlementInstruction recordResult(String instructionRef, boolean settled) {
        SettlementInstruction instruction = getInstruction(instructionRef);
        if (settled) {
            instruction.setStatus("SETTLED");
            instruction.setActualSettlementDate(LocalDate.now());
            log.info("Settlement instruction settled: {}", instructionRef);
        } else {
            instruction.setStatus("FAILED");
            instruction.setFailReason("Settlement failed");
            instruction.setFailedSince(LocalDate.now());
            log.warn("Settlement instruction failed: {}", instructionRef);
        }
        return instructionRepository.save(instruction);
    }

    @Transactional
    public SettlementBatch createBatch(SettlementBatch batch) {
        batch.setBatchRef("SB-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        SettlementBatch saved = batchRepository.save(batch);
        log.info("Settlement batch created: {}", saved.getBatchRef());
        return saved;
    }

    public List<SettlementInstruction> getFailedSettlements() {
        return instructionRepository.findByStatusOrderByIntendedSettlementDateAsc("FAILED");
    }

    @Transactional
    public SettlementInstruction calculatePenalty(String instructionRef) {
        SettlementInstruction instruction = getInstruction(instructionRef);
        if ("FAILED".equals(instruction.getStatus()) && instruction.getFailedSince() != null) {
            long days = ChronoUnit.DAYS.between(instruction.getFailedSince(), LocalDate.now());
            instruction.setPenaltyAmount(BigDecimal.valueOf(days).multiply(new BigDecimal("0.01")));
            log.info("Penalty calculated for {}: {} days, amount={}", instructionRef, days, instruction.getPenaltyAmount());
        }
        return instructionRepository.save(instruction);
    }

    public Map<String, Long> getSettlementDashboard() {
        long totalPending = instructionRepository.findByStatusOrderByIntendedSettlementDateAsc("CREATED").size()
                + instructionRepository.findByStatusOrderByIntendedSettlementDateAsc("MATCHED").size()
                + instructionRepository.findByStatusOrderByIntendedSettlementDateAsc("SETTLING").size();
        long totalSettled = instructionRepository.findByStatusOrderByIntendedSettlementDateAsc("SETTLED").size();
        long totalFailed = instructionRepository.findByStatusOrderByIntendedSettlementDateAsc("FAILED").size();
        Map<String, Long> dashboard = new LinkedHashMap<>();
        dashboard.put("totalPending", totalPending);
        dashboard.put("totalSettled", totalSettled);
        dashboard.put("totalFailed", totalFailed);
        return dashboard;
    }

    public SettlementInstruction getInstruction(String ref) {
        return instructionRepository.findByInstructionRef(ref)
                .orElseThrow(() -> new ResourceNotFoundException("SettlementInstruction", "instructionRef", ref));
    }

    public java.util.List<SettlementInstruction> getAllInstructions() {
        return instructionRepository.findAll();
    }

    public java.util.List<SettlementBatch> getAllBatches() {
        return batchRepository.findAll();
    }

}
