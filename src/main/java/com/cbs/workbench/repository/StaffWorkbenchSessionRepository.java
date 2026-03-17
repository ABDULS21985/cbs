package com.cbs.workbench.repository;
import com.cbs.workbench.entity.StaffWorkbenchSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface StaffWorkbenchSessionRepository extends JpaRepository<StaffWorkbenchSession, Long> {
    Optional<StaffWorkbenchSession> findBySessionId(String sessionId);
    List<StaffWorkbenchSession> findByStaffUserIdAndSessionStatus(String staffUserId, String sessionStatus);
}
