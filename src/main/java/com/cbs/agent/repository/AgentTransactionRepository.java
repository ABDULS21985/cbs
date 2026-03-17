package com.cbs.agent.repository;

import com.cbs.agent.entity.AgentTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.Instant;

@Repository
public interface AgentTransactionRepository extends JpaRepository<AgentTransaction, Long> {
    Page<AgentTransaction> findByAgentIdOrderByCreatedAtDesc(Long agentId, Pageable pageable);
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM AgentTransaction t WHERE t.agentId = :agentId AND t.createdAt >= :since")
    BigDecimal sumDailyVolume(@Param("agentId") Long agentId, @Param("since") Instant since);
    @Query("SELECT COALESCE(SUM(t.commissionAmount), 0) FROM AgentTransaction t WHERE t.agentId = :agentId AND t.createdAt >= :since")
    BigDecimal sumCommission(@Param("agentId") Long agentId, @Param("since") Instant since);
}
