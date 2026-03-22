package com.cbs.sessiondialogue.repository;

import com.cbs.sessiondialogue.entity.DialogueSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DialogueSessionRepository extends JpaRepository<DialogueSession, Long> {
    Optional<DialogueSession> findBySessionCode(String sessionCode);
    List<DialogueSession> findByCustomerIdOrderByStartedAtDesc(Long customerId);
    List<DialogueSession> findByAgentIdAndStatusOrderByStartedAtDesc(String agentId, String status);
    List<DialogueSession> findByStatusOrderByStartedAtDesc(String status);
}
