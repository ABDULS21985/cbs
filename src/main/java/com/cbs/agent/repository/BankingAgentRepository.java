package com.cbs.agent.repository;

import com.cbs.agent.entity.BankingAgent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface BankingAgentRepository extends JpaRepository<BankingAgent, Long> {
    Optional<BankingAgent> findByAgentCode(String agentCode);
    Page<BankingAgent> findByStatusOrderByAgentNameAsc(String status, Pageable pageable);
    List<BankingAgent> findByParentAgentCodeAndStatus(String parentCode, String status);
    List<BankingAgent> findByCityAndStatus(String city, String status);
}
