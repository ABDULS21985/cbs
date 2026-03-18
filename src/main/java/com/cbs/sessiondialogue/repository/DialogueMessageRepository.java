package com.cbs.sessiondialogue.repository;

import com.cbs.sessiondialogue.entity.DialogueMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DialogueMessageRepository extends JpaRepository<DialogueMessage, Long> {
    List<DialogueMessage> findBySessionIdOrderByCreatedAtAsc(Long sessionId);
}
