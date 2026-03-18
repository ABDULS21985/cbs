package com.cbs.workbench;

import com.cbs.common.exception.BusinessException;
import com.cbs.workbench.entity.*;
import com.cbs.workbench.repository.*;
import com.cbs.workbench.service.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkbenchEnhancementServiceTest {

    @Mock private WorkbenchWidgetRepository widgetRepo;
    @Mock private WorkbenchQuickActionRepository actionRepo;
    @Mock private WorkbenchAlertRepository alertRepo;
    @InjectMocks private WorkbenchEnhancementService service;

    @Test
    @DisplayName("Widget filtering returns only widgets applicable to workbench type")
    void widgetFilteringByWorkbenchType() {
        WorkbenchWidget widget1 = new WorkbenchWidget();
        widget1.setId(1L);
        widget1.setWidgetCode("WGT-001");
        widget1.setWidgetName("Teller Widget");
        widget1.setApplicableWorkbenchTypes(List.of("TELLER", "CSO"));
        widget1.setStatus("ACTIVE");
        widget1.setDisplayOrder(1);

        WorkbenchWidget widget2 = new WorkbenchWidget();
        widget2.setId(2L);
        widget2.setWidgetCode("WGT-002");
        widget2.setWidgetName("RM Widget");
        widget2.setApplicableWorkbenchTypes(List.of("RELATIONSHIP_MANAGER"));
        widget2.setStatus("ACTIVE");
        widget2.setDisplayOrder(2);

        WorkbenchQuickAction action1 = new WorkbenchQuickAction();
        action1.setId(1L);
        action1.setActionCode("ACT-001");
        action1.setActionName("Cash Deposit");
        action1.setApplicableWorkbenchTypes(List.of("TELLER"));
        action1.setIsActive(true);
        action1.setDisplayOrder(1);

        when(widgetRepo.findByStatusOrderByDisplayOrderAsc("ACTIVE"))
                .thenReturn(List.of(widget1, widget2));
        when(actionRepo.findByIsActiveTrueOrderByDisplayOrderAsc())
                .thenReturn(List.of(action1));

        Map<String, Object> result = service.loadWorkbench("TELLER");

        @SuppressWarnings("unchecked")
        List<WorkbenchWidget> widgets = (List<WorkbenchWidget>) result.get("widgets");
        assertThat(widgets).hasSize(1);
        assertThat(widgets.get(0).getWidgetCode()).isEqualTo("WGT-001");
    }

    @Test
    @DisplayName("Alert severity validation works correctly")
    void alertSeverityValidation() {
        when(alertRepo.save(any(WorkbenchAlert.class))).thenAnswer(inv -> {
            WorkbenchAlert saved = inv.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        WorkbenchAlert result = service.raiseAlert(1L, "FRAUD_FLAG", "CRITICAL", "Suspicious activity detected");

        assertThat(result.getSeverity()).isEqualTo("CRITICAL");
        assertThat(result.getAlertType()).isEqualTo("FRAUD_FLAG");
        assertThat(result.getAcknowledged()).isFalse();
    }
}
