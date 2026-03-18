package com.cbs.atmnetwork.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.atmnetwork.entity.AtmNetworkNode;
import com.cbs.atmnetwork.repository.AtmNetworkNodeRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.time.Instant; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class AtmNetworkService {
    private final AtmNetworkNodeRepository nodeRepository;
    @Transactional public AtmNetworkNode register(AtmNetworkNode node) { return nodeRepository.save(node); }
    @Transactional
    public AtmNetworkNode updateStatus(String terminalId, String status) {
        AtmNetworkNode n = getNode(terminalId); n.setOperationalStatus(status); n.setUpdatedAt(Instant.now());
        log.info("ATM status updated: terminal={}, status={}", terminalId, status); return nodeRepository.save(n);
    }
    @Transactional
    public AtmNetworkNode replenish(String terminalId, BigDecimal amount) {
        AtmNetworkNode n = getNode(terminalId);
        n.setCurrentCashLevel(n.getCurrentCashLevel().add(amount)); n.setLastReplenishedAt(Instant.now());
        n.setOperationalStatus("ONLINE"); n.setUpdatedAt(Instant.now());
        log.info("ATM replenished: terminal={}, amount={}, newLevel={}", terminalId, amount, n.getCurrentCashLevel());
        return nodeRepository.save(n);
    }
    public List<AtmNetworkNode> getByStatus(String status) { return nodeRepository.findByOperationalStatusOrderByTerminalIdAsc(status); }
    public List<AtmNetworkNode> getByZone(String zone) { return nodeRepository.findByNetworkZoneAndIsActiveTrueOrderByTerminalIdAsc(zone); }
    private AtmNetworkNode getNode(String id) { return nodeRepository.findByTerminalId(id).orElseThrow(() -> new ResourceNotFoundException("AtmNetworkNode", "terminalId", id)); }
}
