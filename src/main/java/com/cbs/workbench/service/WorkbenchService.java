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
    public StaffWorkbenchSession createSession(Long staffUserId, String staffName, String workbenchType) {
        StaffWorkbenchSession session = StaffWorkbenchSession.builder()
                .sessionId("WB-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase())
                .staffUserId(staffUserId).staffName(staffName).workbenchType(workbenchType)
                .openTabs(new ArrayList<>()).activeCases(new ArrayList<>()).build();
        StaffWorkbenchSession saved = sessionRepository.save(session);
        log.info("Workbench session started: id={}, staff={}, type={}", saved.getSessionId(), staffName, workbenchType);
        return saved;
    }

    @Transactional
    public StaffWorkbenchSession loadCustomerContext(String sessionId, Long customerId) {
        StaffWorkbenchSession s = getSession(sessionId);
        s.setCustomerContextId(customerId);
        s.setLastActivityAt(Instant.now());
        log.info("Customer context loaded: session={}, customer={}", sessionId, customerId);
        return sessionRepository.save(s);
    }

    @Transactional
    public StaffWorkbenchSession openTab(String sessionId, String tabName) {
        StaffWorkbenchSession s = getSession(sessionId);
        if (s.getOpenTabs() == null) s.setOpenTabs(new ArrayList<>());
        if (!s.getOpenTabs().contains(tabName)) s.getOpenTabs().add(tabName);
        s.setLastActivityAt(Instant.now());
        return sessionRepository.save(s);
    }

    @Transactional
    public StaffWorkbenchSession endSession(String sessionId) {
        StaffWorkbenchSession s = getSession(sessionId);
        s.setSessionStatus("TERMINATED");
        s.setLogoutAt(Instant.now());
        log.info("Workbench session ended: id={}", sessionId);
        return sessionRepository.save(s);
    }

    public List<StaffWorkbenchSession> getActiveSessions(Long staffUserId) {
        return sessionRepository.findByStaffUserIdAndSessionStatusOrderByLoginAtDesc(staffUserId, "ACTIVE");
    }

    private StaffWorkbenchSession getSession(String sessionId) {
        return sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("StaffWorkbenchSession", "sessionId", sessionId));
    }
}
