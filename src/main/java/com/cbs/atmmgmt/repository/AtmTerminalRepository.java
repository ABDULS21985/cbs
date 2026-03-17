package com.cbs.atmmgmt.repository;

import com.cbs.atmmgmt.entity.AtmTerminal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface AtmTerminalRepository extends JpaRepository<AtmTerminal, Long> {
    Optional<AtmTerminal> findByTerminalId(String terminalId);
    List<AtmTerminal> findByStatusOrderByTerminalIdAsc(String status);
    List<AtmTerminal> findByBranchCodeAndStatusNot(String branchCode, String excludeStatus);
    @Query("SELECT a FROM AtmTerminal a WHERE a.status = 'ONLINE' AND a.currentCashBalance <= a.minCashThreshold")
    List<AtmTerminal> findLowCashTerminals();
}
