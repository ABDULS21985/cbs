package com.cbs.posterminal.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.posterminal.entity.PosTerminal;
import com.cbs.posterminal.repository.PosTerminalRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class PosTerminalService {
    private final PosTerminalRepository terminalRepository;
    @Transactional public PosTerminal register(PosTerminal terminal) { return terminalRepository.save(terminal); }
    @Transactional
    public PosTerminal heartbeat(String terminalId) {
        PosTerminal t = getTerminal(terminalId); t.setLastHeartbeatAt(Instant.now()); t.setUpdatedAt(Instant.now());
        return terminalRepository.save(t);
    }
    @Transactional
    public PosTerminal updateStatus(String terminalId, String status) {
        PosTerminal t = getTerminal(terminalId); t.setOperationalStatus(status); t.setUpdatedAt(Instant.now());
        return terminalRepository.save(t);
    }
    public List<PosTerminal> getByMerchant(String merchantId) { return terminalRepository.findByMerchantIdOrderByTerminalIdAsc(merchantId); }
    public List<PosTerminal> getByStatus(String status) { return terminalRepository.findByOperationalStatusOrderByTerminalIdAsc(status); }
    public PosTerminal getTerminal(String id) { return terminalRepository.findByTerminalId(id).orElseThrow(() -> new ResourceNotFoundException("PosTerminal", "terminalId", id)); }

    public java.util.List<PosTerminal> getAllTerminals() {
        return terminalRepository.findAll();
    }

}
