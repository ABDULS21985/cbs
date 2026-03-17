package com.cbs.ussd.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.ussd.entity.*;
import com.cbs.ussd.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class UssdService {

    private final UssdMenuRepository menuRepository;
    private final UssdSessionRepository sessionRepository;

    /**
     * Processes a USSD request. Returns the response text to display.
     * New session: show root menu.
     * Existing session: navigate based on input.
     */
    @Transactional
    public UssdResponse processRequest(String msisdn, String sessionId, String input) {
        // Find or create session
        UssdSession session = sessionRepository.findBySessionIdAndStatus(sessionId, "ACTIVE")
                .orElseGet(() -> {
                    UssdSession newSession = UssdSession.builder()
                            .sessionId(sessionId != null ? sessionId : UUID.randomUUID().toString())
                            .msisdn(msisdn).status("ACTIVE").build();
                    return sessionRepository.save(newSession);
                });

        if (input != null) session.recordInput(input);

        // Get current menu or root
        String currentMenuCode = session.getCurrentMenuCode();
        List<UssdMenu> options;

        if (currentMenuCode == null || "0".equals(input)) {
            // Show root menu
            options = menuRepository.findByParentMenuCodeIsNullAndIsActiveTrueOrderByDisplayOrderAsc();
            session.setCurrentMenuCode(null);
        } else if ("00".equals(input)) {
            // Go back to root
            options = menuRepository.findByParentMenuCodeIsNullAndIsActiveTrueOrderByDisplayOrderAsc();
            session.setCurrentMenuCode(null);
        } else {
            // Navigate to selected option
            List<UssdMenu> currentOptions = currentMenuCode == null ?
                    menuRepository.findByParentMenuCodeIsNullAndIsActiveTrueOrderByDisplayOrderAsc() :
                    menuRepository.findByParentMenuCodeAndIsActiveTrueOrderByDisplayOrderAsc(currentMenuCode);

            int selection;
            try { selection = Integer.parseInt(input); } catch (NumberFormatException e) {
                return new UssdResponse(session.getSessionId(), "Invalid input. Please try again.", true);
            }

            if (selection < 1 || selection > currentOptions.size()) {
                return new UssdResponse(session.getSessionId(), "Invalid option. Please try again.", true);
            }

            UssdMenu selected = currentOptions.get(selection - 1);

            if ("MENU".equals(selected.getActionType())) {
                options = menuRepository.findByParentMenuCodeAndIsActiveTrueOrderByDisplayOrderAsc(selected.getMenuCode());
                session.setCurrentMenuCode(selected.getMenuCode());
            } else {
                // Terminal action
                session.setStatus("COMPLETED");
                session.setEndedAt(Instant.now());
                sessionRepository.save(session);
                return new UssdResponse(session.getSessionId(),
                        "Processing " + selected.getTitle() + "...\nThank you for using our service.", false);
            }
        }

        // Build menu text
        StringBuilder sb = new StringBuilder("Welcome to Banking Service\n");
        for (int i = 0; i < options.size(); i++) {
            sb.append(i + 1).append(". ").append(options.get(i).getTitle()).append("\n");
        }
        sb.append("0. Back\n00. Main Menu");

        sessionRepository.save(session);
        return new UssdResponse(session.getSessionId(), sb.toString(), true);
    }

    @Transactional
    public UssdMenu createMenu(UssdMenu menu) { return menuRepository.save(menu); }
    public List<UssdMenu> getRootMenus() { return menuRepository.findByParentMenuCodeIsNullAndIsActiveTrueOrderByDisplayOrderAsc(); }

    public record UssdResponse(String sessionId, String text, boolean continueSession) {}
}
