package com.cbs.ussd;

import com.cbs.ussd.entity.*;
import com.cbs.ussd.repository.*;
import com.cbs.ussd.service.UssdService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UssdServiceTest {

    @Mock private UssdMenuRepository menuRepository;
    @Mock private UssdSessionRepository sessionRepository;

    @InjectMocks private UssdService ussdService;

    @Test
    @DisplayName("New session shows root menu")
    void newSession_ShowsRootMenu() {
        List<UssdMenu> rootMenus = List.of(
                UssdMenu.builder().menuCode("BAL").title("Check Balance").actionType("BALANCE").displayOrder(1).build(),
                UssdMenu.builder().menuCode("TRF").title("Transfer Money").actionType("MENU").displayOrder(2).build(),
                UssdMenu.builder().menuCode("AIR").title("Buy Airtime").actionType("AIRTIME").displayOrder(3).build()
        );

        when(sessionRepository.findBySessionIdAndStatus(any(), eq("ACTIVE"))).thenReturn(Optional.empty());
        when(sessionRepository.save(any())).thenAnswer(inv -> { UssdSession s = inv.getArgument(0); s.setId(1L); return s; });
        when(menuRepository.findByParentMenuCodeIsNullAndIsActiveTrueOrderByDisplayOrderAsc()).thenReturn(rootMenus);

        UssdService.UssdResponse response = ussdService.processRequest("+2348012345678", null, null);

        assertThat(response.continueSession()).isTrue();
        assertThat(response.text()).contains("1. Check Balance");
        assertThat(response.text()).contains("2. Transfer Money");
        assertThat(response.text()).contains("3. Buy Airtime");
    }

    @Test
    @DisplayName("Selecting terminal action ends session")
    void selectTerminalAction_EndsSession() {
        UssdSession session = UssdSession.builder().id(1L).sessionId("SES001").msisdn("+234801").status("ACTIVE")
                .currentMenuCode("ROOT").build();
        List<UssdMenu> menus = List.of(
                UssdMenu.builder().menuCode("BAL").title("Check Balance").actionType("BALANCE").displayOrder(1).build()
        );

        when(sessionRepository.findBySessionIdAndStatus("SES001", "ACTIVE")).thenReturn(Optional.of(session));
        when(menuRepository.findByParentMenuCodeAndIsActiveTrueOrderByDisplayOrderAsc("ROOT")).thenReturn(menus);
        when(sessionRepository.save(any())).thenReturn(session);

        UssdService.UssdResponse response = ussdService.processRequest("+234801", "SES001", "1");

        assertThat(response.continueSession()).isFalse();
        assertThat(response.text()).contains("Check Balance");
    }
}
