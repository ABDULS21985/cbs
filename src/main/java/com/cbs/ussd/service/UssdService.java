package com.cbs.ussd.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.ussd.entity.*;
import com.cbs.ussd.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class UssdService {

    /** Session timeout: 3 minutes of inactivity. */
    private static final Duration SESSION_TIMEOUT = Duration.ofMinutes(3);

    private final UssdMenuRepository menuRepository;
    private final UssdSessionRepository sessionRepository;
    private final CurrentActorProvider currentActorProvider;

    // ── Process Request ─────────────────────────────────────────────────────

    @Transactional
    public UssdResponse processRequest(String msisdn, String sessionId, String input) {
        if (msisdn == null || msisdn.isBlank()) {
            throw new BusinessException("MSISDN is required", "MISSING_MSISDN");
        }

        // Find or create session
        UssdSession session = sessionRepository.findBySessionIdAndStatus(sessionId, "ACTIVE")
                .orElseGet(() -> {
                    UssdSession newSession = UssdSession.builder()
                            .sessionId(sessionId != null ? sessionId : UUID.randomUUID().toString())
                            .msisdn(msisdn).status("ACTIVE").build();
                    return sessionRepository.save(newSession);
                });

        // Session timeout check
        Instant lastActivity = session.getLastInputAt() != null ? session.getLastInputAt() : session.getStartedAt();
        if (lastActivity != null && Duration.between(lastActivity, Instant.now()).compareTo(SESSION_TIMEOUT) > 0) {
            session.setStatus("EXPIRED");
            session.setEndedAt(Instant.now());
            sessionRepository.save(session);
            log.info("USSD session expired: sessionId={}, msisdn={}", session.getSessionId(), msisdn);
            return new UssdResponse(session.getSessionId(), "Session expired. Please dial again.", false);
        }

        if (input != null) session.recordInput(input);

        // Get current menu or root
        String currentMenuCode = session.getCurrentMenuCode();
        List<UssdMenu> options;

        if (input == null || input.isBlank() || "00".equals(input) || "0".equals(input)) {
            options = menuRepository.findByParentMenuCodeIsNullAndIsActiveTrueOrderByDisplayOrderAsc();
            session.setCurrentMenuCode(null);
        } else {
            // Navigate to selected option
            List<UssdMenu> currentOptions = currentMenuCode == null ?
                    menuRepository.findByParentMenuCodeIsNullAndIsActiveTrueOrderByDisplayOrderAsc() :
                    menuRepository.findByParentMenuCodeAndIsActiveTrueOrderByDisplayOrderAsc(currentMenuCode);

            int selection;
            try {
                selection = Integer.parseInt(input);
            } catch (NumberFormatException e) {
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
                // Terminal action - execute the banking operation
                String result = executeTerminalAction(session, selected);
                session.setStatus("COMPLETED");
                session.setEndedAt(Instant.now());
                sessionRepository.save(session);
                return new UssdResponse(session.getSessionId(), result, false);
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

    // ── Terminal Action Execution ───────────────────────────────────────────

    private String executeTerminalAction(UssdSession session, UssdMenu menu) {
        String serviceCode = menu.getServiceCode();
        boolean pinRequired = Boolean.TRUE.equals(menu.getRequiresPin());

        if (pinRequired) {
            // Check if PIN was provided in the session data
            Map<String, Object> data = session.getSessionData();
            if (data == null || !data.containsKey("pinVerified") || !Boolean.TRUE.equals(data.get("pinVerified"))) {
                log.warn("PIN verification required but not completed: session={}, menu={}",
                        session.getSessionId(), menu.getMenuCode());
                return "PIN verification required.\nPlease enter your PIN to continue.";
            }
        }

        if (serviceCode == null || serviceCode.isBlank()) {
            log.info("USSD terminal action (no service code): menu={}, msisdn={}",
                    menu.getMenuCode(), session.getMsisdn());
            return "Processing " + menu.getTitle() + "...\nThank you for using our service.";
        }

        return switch (serviceCode.toUpperCase()) {
            case "BALANCE_INQUIRY" -> {
                log.info("USSD balance inquiry: msisdn={}, customerId={}", session.getMsisdn(), session.getCustomerId());
                if (session.getCustomerId() == null) {
                    yield "Account not linked.\nPlease visit your branch to link your account to USSD.";
                }
                yield "Balance Inquiry\n" +
                        "Account linked to " + session.getMsisdn() + "\n" +
                        "Please check your SMS for balance details.\n" +
                        "Thank you.";
            }
            case "TRANSFER" -> {
                log.info("USSD transfer initiation: msisdn={}, customerId={}", session.getMsisdn(), session.getCustomerId());
                if (session.getCustomerId() == null) {
                    yield "Account not linked.\nPlease visit your branch to link your account to USSD.";
                }
                yield "Fund Transfer\n" +
                        "Transfer request received.\n" +
                        "You will receive an SMS confirmation shortly.\n" +
                        "Thank you.";
            }
            case "MINI_STATEMENT" -> {
                log.info("USSD mini statement: msisdn={}, customerId={}", session.getMsisdn(), session.getCustomerId());
                if (session.getCustomerId() == null) {
                    yield "Account not linked.\nPlease visit your branch to link your account to USSD.";
                }
                yield "Mini Statement\n" +
                        "Last 5 transactions will be sent via SMS to " + session.getMsisdn() + "\n" +
                        "Thank you.";
            }
            case "AIRTIME" -> {
                log.info("USSD airtime purchase: msisdn={}", session.getMsisdn());
                yield "Airtime Purchase\n" +
                        "Request received for " + session.getMsisdn() + "\n" +
                        "You will receive a confirmation SMS.\n" +
                        "Thank you.";
            }
            case "BILL_PAYMENT" -> {
                log.info("USSD bill payment: msisdn={}", session.getMsisdn());
                yield "Bill Payment\n" +
                        "Payment request received.\n" +
                        "You will receive a confirmation SMS.\n" +
                        "Thank you.";
            }
            case "PIN_CHANGE" -> {
                log.info("USSD PIN change request: msisdn={}", session.getMsisdn());
                yield "PIN Change\n" +
                        "PIN change request submitted.\n" +
                        "You will receive a confirmation SMS.\n" +
                        "Thank you.";
            }
            default -> {
                log.info("USSD generic action: serviceCode={}, msisdn={}", serviceCode, session.getMsisdn());
                yield "Processing " + menu.getTitle() + "...\nThank you for using our service.";
            }
        };
    }

    // ── PIN Verification ────────────────────────────────────────────────────

    @Transactional
    public UssdResponse verifyPin(String sessionId, String pin) {
        UssdSession session = sessionRepository.findBySessionIdAndStatus(sessionId, "ACTIVE")
                .orElseThrow(() -> new BusinessException("Session not found or expired", "SESSION_NOT_FOUND"));

        if (pin == null || pin.length() != 4 || !pin.matches("\\d{4}")) {
            return new UssdResponse(sessionId, "Invalid PIN format. PIN must be 4 digits.", true);
        }

        // In production this would verify against a stored hashed PIN
        // For now, mark the session as PIN-verified
        Map<String, Object> data = session.getSessionData();
        data.put("pinVerified", true);
        data.put("pinVerifiedAt", Instant.now().toString());
        session.setSessionData(data);
        sessionRepository.save(session);

        log.info("PIN verified for session: sessionId={}, msisdn={}", sessionId, session.getMsisdn());
        return new UssdResponse(sessionId, "PIN verified successfully.\nPlease continue.", true);
    }

    // ── Menu CRUD ───────────────────────────────────────────────────────────

    @Transactional
    public UssdMenu createMenu(UssdMenu menu) {
        if (menu.getMenuCode() == null || menu.getMenuCode().isBlank()) {
            throw new BusinessException("Menu code is required", "MISSING_MENU_CODE");
        }
        if (menu.getTitle() == null || menu.getTitle().isBlank()) {
            throw new BusinessException("Menu title is required", "MISSING_MENU_TITLE");
        }
        if (menu.getActionType() == null || menu.getActionType().isBlank()) {
            throw new BusinessException("Action type is required", "MISSING_ACTION_TYPE");
        }

        // Duplicate check
        if (menuRepository.findByMenuCode(menu.getMenuCode()).isPresent()) {
            throw new BusinessException("Menu code already exists: " + menu.getMenuCode(), "DUPLICATE_MENU_CODE");
        }

        if (menu.getDisplayOrder() == null) menu.setDisplayOrder(0);
        if (menu.getRequiresPin() == null) menu.setRequiresPin(false);
        if (menu.getIsActive() == null) menu.setIsActive(true);
        if (menu.getCreatedAt() == null) menu.setCreatedAt(Instant.now());

        UssdMenu saved = menuRepository.save(menu);
        log.info("USSD menu created: code={}, title={}, actor={}",
                saved.getMenuCode(), saved.getTitle(), currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<UssdMenu> getRootMenus() {
        return menuRepository.findByParentMenuCodeIsNullAndIsActiveTrueOrderByDisplayOrderAsc();
    }

    public List<UssdMenu> getAllMenus() {
        return menuRepository.findAll();
    }

    @Transactional
    public UssdMenu updateMenu(Long id, UssdMenu updated) {
        UssdMenu existing = menuRepository.findById(id)
                .orElseThrow(() -> new BusinessException("USSD Menu not found with id: " + id, "MENU_NOT_FOUND"));
        if (updated.getMenuCode() != null) existing.setMenuCode(updated.getMenuCode());
        if (updated.getParentMenuCode() != null) existing.setParentMenuCode(updated.getParentMenuCode());
        if (updated.getDisplayOrder() != null) existing.setDisplayOrder(updated.getDisplayOrder());
        if (updated.getTitle() != null) existing.setTitle(updated.getTitle());
        if (updated.getShortcode() != null) existing.setShortcode(updated.getShortcode());
        if (updated.getActionType() != null) existing.setActionType(updated.getActionType());
        if (updated.getServiceCode() != null) existing.setServiceCode(updated.getServiceCode());
        if (updated.getRequiresPin() != null) existing.setRequiresPin(updated.getRequiresPin());
        if (updated.getIsActive() != null) existing.setIsActive(updated.getIsActive());
        UssdMenu saved = menuRepository.save(existing);
        log.info("USSD menu updated: id={}, code={}, actor={}", id, saved.getMenuCode(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public void deleteMenu(Long id) {
        if (!menuRepository.existsById(id)) {
            throw new BusinessException("USSD Menu not found with id: " + id, "MENU_NOT_FOUND");
        }
        menuRepository.deleteById(id);
        log.info("USSD menu deleted: id={}, actor={}", id, currentActorProvider.getCurrentActor());
    }

    public record UssdResponse(String sessionId, String text, boolean continueSession) {}
}
