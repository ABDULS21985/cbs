package com.cbs.ivr.service;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
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
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public IvrSession startSession(String callerNumber, Long customerId) {
        if (callerNumber == null || callerNumber.isBlank()) {
            throw new BusinessException("Caller number is required", "MISSING_CALLER_NUMBER");
        }
        IvrMenu rootMenu = menuRepository.findByMenuLevelAndIsActiveTrueOrderByMenuCodeAsc(0).stream().findFirst()
                .orElseThrow(() -> new BusinessException("No root IVR menu configured", "NO_ROOT_MENU"));
        IvrSession session = IvrSession.builder().sessionId("IVR-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase())
                .callerNumber(callerNumber).customerId(customerId).currentMenuId(rootMenu.getId())
                .status("ACTIVE")
                .navigationPath(new ArrayList<>(List.of(rootMenu.getMenuCode()))).build();
        IvrSession saved = sessionRepository.save(session);
        log.info("AUDIT: IVR session started: id={}, caller={}, customer={}, actor={}",
                saved.getSessionId(), callerNumber, customerId, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public IvrSession navigate(String sessionId, String selectedOption) {
        IvrSession s = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("IvrSession", "sessionId", sessionId));
        // Validate session status
        if ("ENDED".equals(s.getStatus()) || "TRANSFERRED".equals(s.getStatus())) {
            throw new BusinessException("Cannot navigate in session " + sessionId + " with status " + s.getStatus(), "SESSION_NOT_ACTIVE");
        }
        // Validate selectedOption is provided
        if (selectedOption == null || selectedOption.isBlank()) {
            throw new BusinessException("Selected option is required", "MISSING_OPTION");
        }
        if (s.getNavigationPath() == null) s.setNavigationPath(new ArrayList<>());
        s.getNavigationPath().add(selectedOption);

        // Actually update currentMenuId: find child menu matching the selected option
        if (s.getCurrentMenuId() != null) {
            menuRepository.findByParentMenuIdAndIsActiveTrueOrderByMenuLevelAsc(s.getCurrentMenuId()).stream()
                    .filter(m -> selectedOption.equals(m.getMenuCode()))
                    .findFirst()
                    .ifPresent(childMenu -> s.setCurrentMenuId(childMenu.getId()));
        }

        IvrSession saved = sessionRepository.save(s);
        log.info("AUDIT: IVR navigation: session={}, option={}, actor={}", sessionId, selectedOption, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public IvrSession transferToAgent(String sessionId, String reason) {
        IvrSession s = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("IvrSession", "sessionId", sessionId));
        if ("ENDED".equals(s.getStatus()) || "TRANSFERRED".equals(s.getStatus())) {
            throw new BusinessException("Session " + sessionId + " is already " + s.getStatus(), "SESSION_NOT_ACTIVE");
        }
        s.setTransferredToAgent(true); s.setTransferReason(reason); s.setStatus("TRANSFERRED"); s.setEndedAt(Instant.now());
        s.setDurationSec((int) java.time.Duration.between(s.getStartedAt(), s.getEndedAt()).getSeconds());
        IvrSession saved = sessionRepository.save(s);
        log.info("AUDIT: IVR transfer to agent: session={}, reason={}, actor={}", sessionId, reason, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public IvrMenu createMenu(IvrMenu menu) {
        if (menu.getMenuCode() == null || menu.getMenuCode().isBlank()) {
            throw new BusinessException("Menu code is required", "MISSING_MENU_CODE");
        }
        // Duplicate menu code check
        menuRepository.findByMenuCode(menu.getMenuCode()).ifPresent(existing -> {
            throw new BusinessException("Menu with code " + menu.getMenuCode() + " already exists", "DUPLICATE_MENU_CODE");
        });
        IvrMenu saved = menuRepository.save(menu);
        log.info("AUDIT: IVR menu created: code={}, level={}, actor={}",
                saved.getMenuCode(), saved.getMenuLevel(), currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<IvrMenu> getRootMenus() { return menuRepository.findByMenuLevelAndIsActiveTrueOrderByMenuCodeAsc(0); }
    public List<IvrSession> getAllSessions() { return sessionRepository.findAll(); }
}
