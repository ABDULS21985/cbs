package com.cbs.ivr.repository;
import com.cbs.ivr.entity.IvrSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface IvrSessionRepository extends JpaRepository<IvrSession, Long> {
    Optional<IvrSession> findBySessionId(String sessionId);
}
