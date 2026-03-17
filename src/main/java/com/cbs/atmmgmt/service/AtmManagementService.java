package com.cbs.atmmgmt.service;

import com.cbs.atmmgmt.entity.*;
import com.cbs.atmmgmt.repository.*;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class AtmManagementService {

    private final AtmTerminalRepository terminalRepository;
    private final AtmJournalEntryRepository journalRepository;

    @Transactional
    public AtmTerminal registerTerminal(AtmTerminal terminal) {
        terminalRepository.findByTerminalId(terminal.getTerminalId()).ifPresent(t -> {
            throw new BusinessException("Terminal ID already exists: " + terminal.getTerminalId(), "DUPLICATE_TERMINAL");
        });
        AtmTerminal saved = terminalRepository.save(terminal);
        log.info("ATM registered: id={}, type={}, branch={}", terminal.getTerminalId(), terminal.getTerminalType(), terminal.getBranchCode());
        return saved;
    }

    @Transactional
    public AtmTerminal replenishCash(String terminalId, BigDecimal amount, String performedBy) {
        AtmTerminal terminal = findTerminalOrThrow(terminalId);
        terminal.replenish(amount);

        // Forecast when cash will run out (simplified: avg daily withdrawal)
        // In production: ML-based forecasting from historical patterns
        if (terminal.getMaxCashCapacity() != null && terminal.getMaxCashCapacity().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal avgDailyWithdrawal = terminal.getMaxCashCapacity().multiply(new BigDecimal("0.05")); // 5% of capacity/day estimate
            if (avgDailyWithdrawal.compareTo(BigDecimal.ZERO) > 0) {
                int daysUntilEmpty = terminal.getCurrentCashBalance().divide(avgDailyWithdrawal, 0, RoundingMode.DOWN).intValue();
                terminal.setForecastedEmptyDate(LocalDate.now().plusDays(daysUntilEmpty));
            }
        }

        terminalRepository.save(terminal);

        // Log journal entry
        AtmJournalEntry journal = AtmJournalEntry.builder()
                .terminalId(terminalId).journalType("REPLENISHMENT")
                .amount(amount).responseCode("00").status("SUCCESS").build();
        journalRepository.save(journal);

        log.info("ATM replenished: terminal={}, amount={}, balance={}", terminalId, amount, terminal.getCurrentCashBalance());
        return terminal;
    }

    @Transactional
    public AtmTerminal updateStatus(String terminalId, String newStatus) {
        AtmTerminal terminal = findTerminalOrThrow(terminalId);
        terminal.setStatus(newStatus);
        terminal.setLastHealthCheck(Instant.now());
        return terminalRepository.save(terminal);
    }

    public List<AtmTerminal> getLowCashTerminals() {
        return terminalRepository.findLowCashTerminals();
    }

    public List<AtmTerminal> getTerminalsByStatus(String status) {
        return terminalRepository.findByStatusOrderByTerminalIdAsc(status);
    }

    public List<AtmTerminal> getBranchTerminals(String branchCode) {
        return terminalRepository.findByBranchCodeAndStatusNot(branchCode, "DECOMMISSIONED");
    }

    public AtmTerminal getTerminal(String terminalId) { return findTerminalOrThrow(terminalId); }

    public Page<AtmJournalEntry> getTerminalJournal(String terminalId, Pageable pageable) {
        return journalRepository.findByTerminalIdOrderByCreatedAtDesc(terminalId, pageable);
    }

    /**
     * ATM fleet dashboard summary.
     */
    public AtmFleetDashboard getFleetDashboard() {
        List<AtmTerminal> online = terminalRepository.findByStatusOrderByTerminalIdAsc("ONLINE");
        List<AtmTerminal> offline = terminalRepository.findByStatusOrderByTerminalIdAsc("OFFLINE");
        List<AtmTerminal> outOfCash = terminalRepository.findByStatusOrderByTerminalIdAsc("OUT_OF_CASH");
        List<AtmTerminal> fault = terminalRepository.findByStatusOrderByTerminalIdAsc("FAULT");
        List<AtmTerminal> lowCash = terminalRepository.findLowCashTerminals();

        return new AtmFleetDashboard(online.size(), offline.size(), outOfCash.size(), fault.size(), lowCash.size());
    }

    private AtmTerminal findTerminalOrThrow(String terminalId) {
        return terminalRepository.findByTerminalId(terminalId)
                .orElseThrow(() -> new ResourceNotFoundException("AtmTerminal", "terminalId", terminalId));
    }

    public record AtmFleetDashboard(int online, int offline, int outOfCash, int fault, int lowCash) {}
}
