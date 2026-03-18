package com.cbs.workbench.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.workbench.entity.StaffWorkbenchSession;
import com.cbs.workbench.repository.StaffWorkbenchSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class WorkbenchService {

    private final StaffWorkbenchSessionRepository sessionRepository;

    @Transactional
    public StaffWorkbenchSession createSession(String staffUserId, String staffName, String workbenchType) {
        StaffWorkbenchSession session = StaffWorkbenchSession.builder()
                .sessionId("WB-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase())
                .staffUserId(staffUserId).staffName(staffName).workbenchType(workbenchType).build();
        return sessionRepository.save(session);
    }

    @Transactional
    public StaffWorkbenchSession loadCustomerContext(String sessionId, Long customerId) {
        StaffWorkbenchSession s = getSession(sessionId);
        s.setCustomerId(customerId);
        s.setLastActivityAt(Instant.now());
        return sessionRepository.save(s);
    }

    @Transactional
    public StaffWorkbenchSession endSession(String sessionId) {
        StaffWorkbenchSession s = getSession(sessionId);
        s.setSessionStatus("TERMINATED");
        s.setEndedAt(Instant.now());
        return sessionRepository.save(s);
    }

    public List<StaffWorkbenchSession> getActiveSessions(String staffUserId) {
        return sessionRepository.findByStaffUserIdAndSessionStatus(staffUserId, "ACTIVE");
    }

    private StaffWorkbenchSession getSession(String sessionId) {
        return sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("StaffWorkbenchSession", "sessionId", sessionId));
    }
}
