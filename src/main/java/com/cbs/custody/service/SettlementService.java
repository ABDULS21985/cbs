package com.cbs.custody.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.custody.entity.SettlementBatch;
import com.cbs.custody.entity.SettlementInstruction;
import com.cbs.custody.repository.SettlementBatchRepository;
import com.cbs.custody.repository.SettlementInstructionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
    private final CurrentActorProvider currentActorProvider;

    @Value("${cbs.custody.penalty-rate-per-day:0.01}")
    private BigDecimal penaltyRatePerDay;

    @Transactional
    public SettlementInstruction createInstruction(SettlementInstruction instruction) {
        instruction.setInstructionRef("SI-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        instruction.setStatus("CREATED");
        SettlementInstruction saved = instructionRepository.save(instruction);
        log.info("AUDIT: Settlement instruction created: {}, actor={}", saved.getInstructionRef(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public List<SettlementInstruction> matchInstruction(String refA, String refB) {
        SettlementInstruction a = getInstruction(refA);
        SettlementInstruction b = getInstruction(refB);

        // Compatibility validation: instructions should match on key fields
        if (a.getInstrumentCode() != null && b.getInstrumentCode() != null && !a.getInstrumentCode().equals(b.getInstrumentCode())) {
            throw new BusinessException("Cannot match instructions with different instruments: " + a.getInstrumentCode() + " vs " + b.getInstrumentCode(), "INSTRUMENT_MISMATCH");
        }
        if (a.getCurrency() != null && b.getCurrency() != null && !a.getCurrency().equals(b.getCurrency())) {
            throw new BusinessException("Cannot match instructions with different currencies: " + a.getCurrency() + " vs " + b.getCurrency(), "CURRENCY_MISMATCH");
        }

        Instant now = Instant.now();
        a.setMatchStatus("MATCHED");
        a.setMatchedAt(now);
        b.setMatchStatus("MATCHED");
        b.setMatchedAt(now);
        instructionRepository.save(a);
        instructionRepository.save(b);
        log.info("AUDIT: Settlement instructions matched: {} <-> {}, actor={}", refA, refB, currentActorProvider.getCurrentActor());
        return List.of(a, b);
    }

    @Transactional
    public SettlementInstruction submitForSettlement(String instructionRef) {
        SettlementInstruction instruction = getInstruction(instructionRef);
        // Status guard: only CREATED or MATCHED instructions can be submitted
        if (!"CREATED".equals(instruction.getStatus()) && !"MATCHED".equals(instruction.getMatchStatus())) {
            throw new BusinessException("Instruction " + instructionRef + " must be CREATED or MATCHED to submit; current status: " + instruction.getStatus(), "INVALID_STATUS");
        }
        instruction.setStatus("SETTLING");
        SettlementInstruction saved = instructionRepository.save(instruction);
        log.info("AUDIT: Settlement instruction submitted: {}, actor={}", instructionRef, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public SettlementInstruction recordResult(String instructionRef, boolean settled) {
        SettlementInstruction instruction = getInstruction(instructionRef);
        if (settled) {
            instruction.setStatus("SETTLED");
            instruction.setActualSettlementDate(LocalDate.now());
            log.info("AUDIT: Settlement instruction settled: {}, actor={}", instructionRef, currentActorProvider.getCurrentActor());
        } else {
            instruction.setStatus("FAILED");
            instruction.setFailReason("Settlement failed");
            instruction.setFailedSince(LocalDate.now());
            log.warn("AUDIT: Settlement instruction failed: {}, actor={}", instructionRef, currentActorProvider.getCurrentActor());
        }
        return instructionRepository.save(instruction);
    }

    @Transactional
    public SettlementBatch createBatch(SettlementBatch batch) {
        batch.setBatchRef("SB-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        SettlementBatch saved = batchRepository.save(batch);
        log.info("AUDIT: Settlement batch created: {}, actor={}", saved.getBatchRef(), currentActorProvider.getCurrentActor());
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
            // Use configurable penalty rate
            instruction.setPenaltyAmount(BigDecimal.valueOf(days).multiply(penaltyRatePerDay));
            log.info("AUDIT: Penalty calculated for {}: {} days, rate={}, amount={}, actor={}",
                    instructionRef, days, penaltyRatePerDay, instruction.getPenaltyAmount(), currentActorProvider.getCurrentActor());
        }
        return instructionRepository.save(instruction);
    }

    public Map<String, Long> getSettlementDashboard() {
        // Use countByStatus for efficiency instead of multiple findBy queries
        List<SettlementInstruction> all = instructionRepository.findAll();
        long totalPending = all.stream().filter(i -> Set.of("CREATED", "MATCHED", "SETTLING").contains(i.getStatus())).count();
        long totalSettled = all.stream().filter(i -> "SETTLED".equals(i.getStatus())).count();
        long totalFailed = all.stream().filter(i -> "FAILED".equals(i.getStatus())).count();
        Map<String, Long> dashboard = new LinkedHashMap<>();
        dashboard.put("totalPending", totalPending);
        dashboard.put("totalSettled", totalSettled);
        dashboard.put("totalFailed", totalFailed);
        return dashboard;
    }

    @Transactional
    public SettlementInstruction resubmitSettlement(String instructionRef) {
        SettlementInstruction instruction = getInstruction(instructionRef);
        if (!"FAILED".equals(instruction.getStatus())) {
            throw new IllegalStateException("Only FAILED instructions can be resubmitted; current status: " + instruction.getStatus());
        }
        instruction.setStatus("CREATED");
        instruction.setFailReason(null);
        instruction.setFailedSince(null);
        instruction.setPenaltyAmount(BigDecimal.ZERO);
        log.info("AUDIT: Settlement instruction resubmitted: {}, actor={}", instructionRef, currentActorProvider.getCurrentActor());
        return instructionRepository.save(instruction);
    }

    @Transactional
    public SettlementInstruction cancelSettlement(String instructionRef, String reason) {
        SettlementInstruction instruction = getInstruction(instructionRef);
        if (!"FAILED".equals(instruction.getStatus())) {
            throw new IllegalStateException("Only FAILED instructions can be cancelled; current status: " + instruction.getStatus());
        }
        instruction.setStatus("CANCELLED");
        instruction.setHoldReason(reason != null ? reason : "Cancelled by operations");
        log.info("AUDIT: Settlement instruction cancelled: {} -- reason: {}, actor={}", instructionRef, reason, currentActorProvider.getCurrentActor());
        return instructionRepository.save(instruction);
    }

    @Transactional
    public SettlementInstruction escalateSettlement(String instructionRef) {
        SettlementInstruction instruction = getInstruction(instructionRef);
        if (!"FAILED".equals(instruction.getStatus())) {
            throw new IllegalStateException("Only FAILED instructions can be escalated; current status: " + instruction.getStatus());
        }
        instruction.setPriorityFlag(true);
        instruction.setHoldReason("ESCALATED -- pending senior review");
        log.info("AUDIT: Settlement instruction escalated: {}, actor={}", instructionRef, currentActorProvider.getCurrentActor());
        return instructionRepository.save(instruction);
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
