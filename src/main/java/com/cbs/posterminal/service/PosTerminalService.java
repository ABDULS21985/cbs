package com.cbs.posterminal.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.posterminal.entity.PosTerminal;
import com.cbs.posterminal.repository.PosTerminalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PosTerminalService {

    private final PosTerminalRepository terminalRepository;
    private final CurrentActorProvider actorProvider;

    private static final Set<String> VALID_STATUSES = Set.of(
            "ACTIVE", "INACTIVE", "SUSPENDED", "MAINTENANCE", "DECOMMISSIONED"
    );

    private static final Map<String, Set<String>> VALID_STATUS_TRANSITIONS = Map.of(
            "ACTIVE", Set.of("INACTIVE", "SUSPENDED", "MAINTENANCE", "DECOMMISSIONED"),
            "INACTIVE", Set.of("ACTIVE", "DECOMMISSIONED"),
            "SUSPENDED", Set.of("ACTIVE", "DECOMMISSIONED"),
            "MAINTENANCE", Set.of("ACTIVE", "DECOMMISSIONED")
    );

    private static final long STALE_HEARTBEAT_MINUTES = 60;

    @Transactional
    public PosTerminal register(PosTerminal terminal) {
        validateTerminal(terminal);

        // Duplicate terminal ID check
        terminalRepository.findByTerminalId(terminal.getTerminalId()).ifPresent(existing -> {
            throw new BusinessException("POS terminal with ID " + terminal.getTerminalId() + " already exists");
        });

        if (terminal.getOperationalStatus() == null) {
            terminal.setOperationalStatus("ACTIVE");
        }
        terminal.setCreatedAt(Instant.now());
        terminal.setUpdatedAt(Instant.now());

        PosTerminal saved = terminalRepository.save(terminal);
        log.info("POS terminal registered by {}: terminalId={}, type={}, merchantId={}",
                actorProvider.getCurrentActor(), saved.getTerminalId(), saved.getTerminalType(), saved.getMerchantId());
        return saved;
    }

    @Transactional
    public PosTerminal heartbeat(String terminalId) {
        PosTerminal t = getTerminal(terminalId);
        if ("DECOMMISSIONED".equals(t.getOperationalStatus())) {
            throw new BusinessException("Cannot receive heartbeat from decommissioned terminal");
        }
        t.setLastHeartbeatAt(Instant.now());
        t.setUpdatedAt(Instant.now());
        return terminalRepository.save(t);
    }

    @Transactional
    public PosTerminal updateStatus(String terminalId, String status) {
        if (!VALID_STATUSES.contains(status)) {
            throw new BusinessException("Invalid status: " + status + ". Valid: " + VALID_STATUSES);
        }

        PosTerminal t = getTerminal(terminalId);

        // Status transition validation
        if ("DECOMMISSIONED".equals(t.getOperationalStatus())) {
            throw new BusinessException("Cannot change status of a decommissioned terminal");
        }
        Set<String> allowed = VALID_STATUS_TRANSITIONS.getOrDefault(t.getOperationalStatus(), Set.of());
        if (!allowed.contains(status)) {
            throw new BusinessException("Invalid status transition from " + t.getOperationalStatus() + " to " + status
                    + ". Allowed: " + allowed);
        }

        String previousStatus = t.getOperationalStatus();
        t.setOperationalStatus(status);
        t.setUpdatedAt(Instant.now());

        log.info("POS terminal status updated by {}: terminalId={}, {} -> {}",
                actorProvider.getCurrentActor(), terminalId, previousStatus, status);
        return terminalRepository.save(t);
    }

    /**
     * Decommissions a POS terminal permanently.
     */
    @Transactional
    public PosTerminal decommission(String terminalId) {
        PosTerminal t = getTerminal(terminalId);
        if ("DECOMMISSIONED".equals(t.getOperationalStatus())) {
            throw new BusinessException("Terminal is already decommissioned");
        }
        if ("ACTIVE".equals(t.getOperationalStatus())) {
            throw new BusinessException("Terminal must be taken out of ACTIVE status before decommissioning");
        }

        t.setOperationalStatus("DECOMMISSIONED");
        t.setUpdatedAt(Instant.now());

        log.info("POS terminal decommissioned by {}: terminalId={}, merchantId={}",
                actorProvider.getCurrentActor(), terminalId, t.getMerchantId());
        return terminalRepository.save(t);
    }

    /**
     * Detects terminals with stale heartbeats (no heartbeat within threshold).
     * Returns list of terminals that appear unresponsive.
     */
    public List<Map<String, Object>> detectStaleHeartbeats() {
        List<PosTerminal> activeTerminals = terminalRepository.findByOperationalStatusOrderByTerminalIdAsc("ACTIVE");
        Instant staleThreshold = Instant.now().minus(Duration.ofMinutes(STALE_HEARTBEAT_MINUTES));
        List<Map<String, Object>> staleTerminals = new ArrayList<>();

        for (PosTerminal t : activeTerminals) {
            boolean isStale = false;
            if (t.getLastHeartbeatAt() == null) {
                // Never sent a heartbeat
                isStale = t.getCreatedAt() != null && t.getCreatedAt().isBefore(staleThreshold);
            } else {
                isStale = t.getLastHeartbeatAt().isBefore(staleThreshold);
            }

            if (isStale) {
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("terminalId", t.getTerminalId());
                entry.put("merchantId", t.getMerchantId());
                entry.put("merchantName", t.getMerchantName());
                entry.put("lastHeartbeatAt", t.getLastHeartbeatAt());
                entry.put("minutesSinceHeartbeat", t.getLastHeartbeatAt() != null
                        ? Duration.between(t.getLastHeartbeatAt(), Instant.now()).toMinutes() : null);
                staleTerminals.add(entry);
            }
        }

        log.info("Stale heartbeat detection by {}: {} terminals unresponsive out of {} active",
                actorProvider.getCurrentActor(), staleTerminals.size(), activeTerminals.size());
        return staleTerminals;
    }

    public PosTerminal getTerminal(String id) {
        return terminalRepository.findByTerminalId(id)
                .orElseThrow(() -> new ResourceNotFoundException("PosTerminal", "terminalId", id));
    }

    public List<PosTerminal> getByMerchant(String merchantId) {
        return terminalRepository.findByMerchantIdOrderByTerminalIdAsc(merchantId);
    }

    public List<PosTerminal> getByStatus(String status) {
        return terminalRepository.findByOperationalStatusOrderByTerminalIdAsc(status);
    }

    public List<PosTerminal> getAllTerminals() {
        return terminalRepository.findAll();
    }

    // ---- private helpers ----

    private void validateTerminal(PosTerminal terminal) {
        if (terminal.getTerminalId() == null || terminal.getTerminalId().isBlank()) {
            throw new BusinessException("Terminal ID is required");
        }
        if (terminal.getTerminalType() == null || terminal.getTerminalType().isBlank()) {
            throw new BusinessException("Terminal type is required");
        }
        if (terminal.getMerchantId() == null || terminal.getMerchantId().isBlank()) {
            throw new BusinessException("Merchant ID is required");
        }
        if (terminal.getMerchantName() == null || terminal.getMerchantName().isBlank()) {
            throw new BusinessException("Merchant name is required");
        }
        if (terminal.getMaxTransactionAmount() != null && terminal.getMaxTransactionAmount().signum() <= 0) {
            throw new BusinessException("Max transaction amount must be positive");
        }
    }
}
