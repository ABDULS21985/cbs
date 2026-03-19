package com.cbs.ivr.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.ivr.entity.*;
import com.cbs.ivr.repository.*;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class IvrService {
    private final IvrMenuRepository menuRepository;
    private final IvrSessionRepository sessionRepository;
    @Transactional
    public IvrSession startSession(String callerNumber, Long customerId) {
        IvrMenu rootMenu = menuRepository.findByMenuLevelAndIsActiveTrueOrderByMenuCodeAsc(0).stream().findFirst()
                .orElseThrow(() -> new RuntimeException("No root IVR menu configured"));
        IvrSession session = IvrSession.builder().sessionId("IVR-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase())
                .callerNumber(callerNumber).customerId(customerId).currentMenuId(rootMenu.getId())
                .navigationPath(new ArrayList<>(List.of(rootMenu.getMenuCode()))).build();
        return sessionRepository.save(session);
    }
    @Transactional
    public IvrSession navigate(String sessionId, String selectedOption) {
        IvrSession s = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("IvrSession", "sessionId", sessionId));
        if (s.getNavigationPath() == null) s.setNavigationPath(new ArrayList<>());
        s.getNavigationPath().add(selectedOption);
        return sessionRepository.save(s);
    }
    @Transactional
    public IvrSession transferToAgent(String sessionId, String reason) {
        IvrSession s = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("IvrSession", "sessionId", sessionId));
        s.setTransferredToAgent(true); s.setTransferReason(reason); s.setStatus("TRANSFERRED"); s.setEndedAt(Instant.now());
        s.setDurationSec((int) java.time.Duration.between(s.getStartedAt(), s.getEndedAt()).getSeconds());
        return sessionRepository.save(s);
    }
    @Transactional public IvrMenu createMenu(IvrMenu menu) { return menuRepository.save(menu); }
    public List<IvrMenu> getRootMenus() { return menuRepository.findByMenuLevelAndIsActiveTrueOrderByMenuCodeAsc(0); }
    public List<IvrSession> getAllSessions() { return sessionRepository.findAll(); }
}
