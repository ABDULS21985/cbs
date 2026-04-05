package com.cbs.atmnetwork.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.atmnetwork.entity.AtmNetworkNode;
import com.cbs.atmnetwork.repository.AtmNetworkNodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AtmNetworkService {

    private final AtmNetworkNodeRepository nodeRepository;
    private final CurrentActorProvider actorProvider;

    private static final Set<String> VALID_STATUSES = Set.of(
            "ONLINE", "OFFLINE", "OUT_OF_CASH", "MAINTENANCE", "FAULT", "DECOMMISSIONED"
    );

    private static final Set<String> VALID_TERMINAL_TYPES = Set.of(
            "CASH_DISPENSER", "CASH_RECYCLER", "FULL_FUNCTION", "DEPOSIT_ONLY"
    );

    private static final long STALE_HEARTBEAT_MINUTES = 30;

    @Transactional
    public AtmNetworkNode register(AtmNetworkNode node) {
        validateNode(node);

        // Duplicate terminal ID check
        nodeRepository.findByTerminalId(node.getTerminalId()).ifPresent(existing -> {
            throw new BusinessException("ATM with terminal ID " + node.getTerminalId() + " already exists");
        });

        if (node.getOperationalStatus() == null) {
            node.setOperationalStatus("OFFLINE");
        }
        if (node.getIsActive() == null) {
            node.setIsActive(true);
        }
        node.setCreatedAt(Instant.now());
        node.setUpdatedAt(Instant.now());

        AtmNetworkNode saved = nodeRepository.save(node);
        log.info("ATM registered by {}: terminalId={}, type={}, zone={}",
                actorProvider.getCurrentActor(), saved.getTerminalId(), saved.getTerminalType(), saved.getNetworkZone());
        return saved;
    }

    @Transactional
    public AtmNetworkNode updateStatus(String terminalId, String status) {
        if (!VALID_STATUSES.contains(status)) {
            throw new BusinessException("Invalid status: " + status + ". Valid: " + VALID_STATUSES);
        }

        AtmNetworkNode n = getNode(terminalId);

        // Status transition guards
        if ("DECOMMISSIONED".equals(n.getOperationalStatus())) {
            throw new BusinessException("Cannot change status of a decommissioned ATM");
        }
        if ("DECOMMISSIONED".equals(status) && "ONLINE".equals(n.getOperationalStatus())) {
            throw new BusinessException("ATM must be taken OFFLINE before decommissioning");
        }

        String previousStatus = n.getOperationalStatus();
        n.setOperationalStatus(status);
        n.setUpdatedAt(Instant.now());

        log.info("ATM status updated by {}: terminal={}, {} -> {}", actorProvider.getCurrentActor(), terminalId, previousStatus, status);
        return nodeRepository.save(n);
    }

    @Transactional
    public AtmNetworkNode recordHeartbeat(String terminalId) {
        AtmNetworkNode n = getNode(terminalId);
        n.setUpdatedAt(Instant.now());

        // If ATM was in FAULT state and heartbeat received, transition to ONLINE
        if ("FAULT".equals(n.getOperationalStatus())) {
            n.setOperationalStatus("ONLINE");
            log.info("ATM auto-recovered from FAULT via heartbeat: terminal={}", terminalId);
        }

        return nodeRepository.save(n);
    }

    @Transactional
    public AtmNetworkNode recordTransaction(String terminalId, BigDecimal amount) {
        AtmNetworkNode n = getNode(terminalId);
        if (!"ONLINE".equals(n.getOperationalStatus())) {
            throw new BusinessException("ATM " + terminalId + " is not ONLINE, cannot process transactions");
        }
        if (amount == null || amount.signum() <= 0) {
            throw new BusinessException("Transaction amount must be positive");
        }

        // Deduct from cash level
        BigDecimal newCashLevel = n.getCurrentCashLevel().subtract(amount);
        if (newCashLevel.signum() < 0) {
            throw new BusinessException("Insufficient cash in ATM " + terminalId
                    + ": available=" + n.getCurrentCashLevel() + ", requested=" + amount);
        }

        n.setCurrentCashLevel(newCashLevel);
        n.setTransactionsToday(n.getTransactionsToday() + 1);
        n.setTransactionsMtd(n.getTransactionsMtd() + 1);
        n.setLastTransactionAt(Instant.now());
        n.setUpdatedAt(Instant.now());

        // Check low cash threshold
        if (n.getLowCashThreshold() != null && newCashLevel.compareTo(n.getLowCashThreshold()) <= 0) {
            n.setOperationalStatus("OUT_OF_CASH");
            log.warn("ATM low cash alert: terminal={}, level={}, threshold={}",
                    terminalId, newCashLevel, n.getLowCashThreshold());
        }

        log.info("ATM transaction recorded by {}: terminal={}, amount={}, newLevel={}",
                actorProvider.getCurrentActor(), terminalId, amount, newCashLevel);
        return nodeRepository.save(n);
    }

    @Transactional
    public AtmNetworkNode replenish(String terminalId, BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            throw new BusinessException("Replenishment amount must be positive");
        }

        AtmNetworkNode n = getNode(terminalId);
        BigDecimal newLevel = n.getCurrentCashLevel().add(amount);

        // Check against capacity
        if (n.getCashCapacity() != null && newLevel.compareTo(n.getCashCapacity()) > 0) {
            throw new BusinessException("Replenishment would exceed cash capacity: capacity="
                    + n.getCashCapacity() + ", would be=" + newLevel);
        }

        n.setCurrentCashLevel(newLevel);
        n.setLastReplenishedAt(Instant.now());
        n.setUpdatedAt(Instant.now());

        // Auto-bring online if was out of cash
        if ("OUT_OF_CASH".equals(n.getOperationalStatus())) {
            n.setOperationalStatus("ONLINE");
        }

        log.info("ATM replenished by {}: terminal={}, amount={}, newLevel={}",
                actorProvider.getCurrentActor(), terminalId, amount, newLevel);
        return nodeRepository.save(n);
    }

    /**
     * Returns simple cash forecasting data for a terminal based on average daily usage.
     */
    public Map<String, Object> forecastCash(String terminalId) {
        AtmNetworkNode n = getNode(terminalId);

        Map<String, Object> forecast = new LinkedHashMap<>();
        forecast.put("terminalId", terminalId);
        forecast.put("currentCashLevel", n.getCurrentCashLevel());
        forecast.put("cashCapacity", n.getCashCapacity());

        BigDecimal avgDailyUsage = BigDecimal.ZERO;
        if (n.getTransactionsMtd() != null && n.getTransactionsMtd() > 0) {
            int dayOfMonth = LocalDate.now().getDayOfMonth();
            if (dayOfMonth > 0) {
                // Estimate average daily transaction count
                int avgTxnPerDay = n.getTransactionsMtd() / dayOfMonth;
                // Assume average withdrawal of currentCashLevel/transactionsMtd if we had a starting point
                // Simplified: use cash capacity / typical replenishment cycle
                if (n.getCashCapacity() != null && n.getCashCapacity().signum() > 0) {
                    avgDailyUsage = n.getCashCapacity().divide(BigDecimal.valueOf(7), 2, RoundingMode.HALF_UP);
                }
            }
        }

        forecast.put("estimatedDailyUsage", avgDailyUsage);

        int daysUntilEmpty = 0;
        if (avgDailyUsage.signum() > 0) {
            daysUntilEmpty = n.getCurrentCashLevel().divide(avgDailyUsage, 0, RoundingMode.DOWN).intValue();
        }
        forecast.put("estimatedDaysUntilEmpty", daysUntilEmpty);
        forecast.put("replenishmentRecommended", daysUntilEmpty <= 2);
        forecast.put("nextReplenishmentDue", n.getNextReplenishmentDue());

        return forecast;
    }

    /**
     * Returns fleet-wide dashboard metrics.
     */
    public Map<String, Object> getFleetDashboard() {
        List<AtmNetworkNode> all = nodeRepository.findAll();
        List<AtmNetworkNode> active = all.stream().filter(n -> Boolean.TRUE.equals(n.getIsActive())).collect(Collectors.toList());

        long online = active.stream().filter(n -> "ONLINE".equals(n.getOperationalStatus())).count();
        long offline = active.stream().filter(n -> "OFFLINE".equals(n.getOperationalStatus())).count();
        long outOfCash = active.stream().filter(n -> "OUT_OF_CASH".equals(n.getOperationalStatus())).count();
        long fault = active.stream().filter(n -> "FAULT".equals(n.getOperationalStatus())).count();
        long maintenance = active.stream().filter(n -> "MAINTENANCE".equals(n.getOperationalStatus())).count();

        BigDecimal totalCash = active.stream()
                .map(n -> n.getCurrentCashLevel() != null ? n.getCurrentCashLevel() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int totalTxnToday = active.stream()
                .mapToInt(n -> n.getTransactionsToday() != null ? n.getTransactionsToday() : 0).sum();

        // Detect stale heartbeats
        Instant staleThreshold = Instant.now().minus(Duration.ofMinutes(STALE_HEARTBEAT_MINUTES));
        List<String> staleTerminals = active.stream()
                .filter(n -> "ONLINE".equals(n.getOperationalStatus()))
                .filter(n -> n.getUpdatedAt() != null && n.getUpdatedAt().isBefore(staleThreshold))
                .map(AtmNetworkNode::getTerminalId)
                .collect(Collectors.toList());

        Map<String, Object> dashboard = new LinkedHashMap<>();
        dashboard.put("totalActive", active.size());
        dashboard.put("online", online);
        dashboard.put("offline", offline);
        dashboard.put("outOfCash", outOfCash);
        dashboard.put("fault", fault);
        dashboard.put("maintenance", maintenance);
        dashboard.put("availabilityPct", active.isEmpty() ? BigDecimal.ZERO :
                BigDecimal.valueOf(online).divide(BigDecimal.valueOf(active.size()), 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)));
        dashboard.put("totalCashInNetwork", totalCash);
        dashboard.put("totalTransactionsToday", totalTxnToday);
        dashboard.put("staleHeartbeatTerminals", staleTerminals);
        dashboard.put("staleHeartbeatCount", staleTerminals.size());

        log.info("Fleet dashboard generated by {}: active={}, online={}, fault={}, stale={}",
                actorProvider.getCurrentActor(), active.size(), online, fault, staleTerminals.size());
        return dashboard;
    }

    /**
     * Detects ATMs with stale heartbeats and marks them as FAULT.
     */
    @Transactional
    public List<AtmNetworkNode> detectAndFlagStaleHeartbeats() {
        List<AtmNetworkNode> onlineNodes = nodeRepository.findByOperationalStatusOrderByTerminalIdAsc("ONLINE");
        Instant staleThreshold = Instant.now().minus(Duration.ofMinutes(STALE_HEARTBEAT_MINUTES));
        List<AtmNetworkNode> flagged = new ArrayList<>();

        for (AtmNetworkNode node : onlineNodes) {
            if (node.getUpdatedAt() != null && node.getUpdatedAt().isBefore(staleThreshold)) {
                node.setOperationalStatus("FAULT");
                node.setUpdatedAt(Instant.now());
                nodeRepository.save(node);
                flagged.add(node);
                log.warn("ATM flagged as FAULT due to stale heartbeat: terminal={}, lastUpdate={}",
                        node.getTerminalId(), node.getUpdatedAt());
            }
        }

        log.info("Stale heartbeat detection completed by {}: {} ATMs flagged",
                actorProvider.getCurrentActor(), flagged.size());
        return flagged;
    }

    public List<AtmNetworkNode> getByStatus(String status) {
        return nodeRepository.findByOperationalStatusOrderByTerminalIdAsc(status);
    }

    public List<AtmNetworkNode> getByZone(String zone) {
        return nodeRepository.findByNetworkZoneAndIsActiveTrueOrderByTerminalIdAsc(zone);
    }

    public AtmNetworkNode getNode(String id) {
        return nodeRepository.findByTerminalId(id)
                .orElseThrow(() -> new ResourceNotFoundException("AtmNetworkNode", "terminalId", id));
    }

    // ---- private helpers ----

    private void validateNode(AtmNetworkNode node) {
        if (node.getTerminalId() == null || node.getTerminalId().isBlank()) {
            throw new BusinessException("Terminal ID is required");
        }
        if (node.getTerminalType() == null || node.getTerminalType().isBlank()) {
            throw new BusinessException("Terminal type is required");
        }
        if (!VALID_TERMINAL_TYPES.contains(node.getTerminalType().toUpperCase())) {
            throw new BusinessException("Invalid terminal type: " + node.getTerminalType()
                    + ". Valid: " + VALID_TERMINAL_TYPES);
        }
        if (node.getLocationAddress() == null || node.getLocationAddress().isBlank()) {
            throw new BusinessException("Location address is required");
        }
        if (node.getCashCapacity() != null && node.getCashCapacity().signum() <= 0) {
            throw new BusinessException("Cash capacity must be positive");
        }
        if (node.getCurrentCashLevel() != null && node.getCurrentCashLevel().signum() < 0) {
            throw new BusinessException("Current cash level cannot be negative");
        }
    }
}
