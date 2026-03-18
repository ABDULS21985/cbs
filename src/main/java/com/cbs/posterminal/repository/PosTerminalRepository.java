package com.cbs.posterminal.repository;
import com.cbs.posterminal.entity.PosTerminal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface PosTerminalRepository extends JpaRepository<PosTerminal, Long> {
    Optional<PosTerminal> findByTerminalId(String terminalId);
    List<PosTerminal> findByMerchantIdOrderByTerminalIdAsc(String merchantId);
    List<PosTerminal> findByOperationalStatusOrderByTerminalIdAsc(String status);
}
