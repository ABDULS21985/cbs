package com.cbs.atmnetwork.repository;
import com.cbs.atmnetwork.entity.AtmNetworkNode;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface AtmNetworkNodeRepository extends JpaRepository<AtmNetworkNode, Long> {
    Optional<AtmNetworkNode> findByTerminalId(String terminalId);
    List<AtmNetworkNode> findByOperationalStatusOrderByTerminalIdAsc(String status);
    List<AtmNetworkNode> findByNetworkZoneAndIsActiveTrueOrderByTerminalIdAsc(String zone);
}
