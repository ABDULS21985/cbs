package com.cbs.contactcenter.repository;

import com.cbs.contactcenter.entity.AgentState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AgentStateRepository extends JpaRepository<AgentState, Long> {
    Optional<AgentState> findByAgentId(String agentId);
    List<AgentState> findByCurrentStateAndCenterId(String state, Long centerId);
    List<AgentState> findByCenterIdAndCurrentStateIn(Long centerId, List<String> states);
}
