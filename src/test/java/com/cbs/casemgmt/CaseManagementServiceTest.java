package com.cbs.casemgmt;

import com.cbs.common.exception.BusinessException;
import com.cbs.casemgmt.entity.*;
import com.cbs.casemgmt.repository.*;
import com.cbs.casemgmt.service.CaseManagementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CaseManagementServiceTest {

    @Mock private CustomerCaseRepository caseRepository;
    @Mock private CaseNoteRepository noteRepository;
    @InjectMocks private CaseManagementService service;

    @Test @DisplayName("Case creation sets SLA based on priority")
    void createWithSla() {
        when(caseRepository.save(any())).thenAnswer(inv -> { CustomerCase c = inv.getArgument(0); c.setId(1L); return c; });
        CustomerCase c = CustomerCase.builder().customerId(1L).caseType("COMPLAINT").caseCategory("OPERATIONAL")
                .priority("CRITICAL").channelReceived("MOBILE").subject("Payment failed").build();
        CustomerCase result = service.createCase(c);
        assertThat(result.getCaseNumber()).startsWith("CAS-");
        assertThat(result.getSlaDueDate()).isNotNull();
        // CRITICAL = 4 hours SLA
        assertThat(result.getSlaDueDate()).isBefore(java.time.Instant.now().plus(5, java.time.temporal.ChronoUnit.HOURS));
    }

    @Test @DisplayName("Escalation increments level and adds note")
    void escalation() {
        CustomerCase c = CustomerCase.builder().id(1L).caseNumber("CAS-ESC").status("ASSIGNED").escalationLevel(0).build();
        when(caseRepository.findByCaseNumber("CAS-ESC")).thenReturn(Optional.of(c));
        when(caseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(noteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CustomerCase result = service.escalate("CAS-ESC", "Unresponsive for 24h");
        assertThat(result.getEscalationLevel()).isEqualTo(1);
        assertThat(result.getStatus()).isEqualTo("ESCALATED");
        verify(noteRepository).save(argThat(n -> n.getNoteType().equals("ESCALATION")));
    }

    @Test @DisplayName("Cannot close unresolved case")
    void cannotCloseUnresolved() {
        CustomerCase c = CustomerCase.builder().id(1L).caseNumber("CAS-OPEN").status("IN_PROGRESS").build();
        when(caseRepository.findByCaseNumber("CAS-OPEN")).thenReturn(Optional.of(c));
        assertThatThrownBy(() -> service.close("CAS-OPEN", 4))
                .isInstanceOf(BusinessException.class).hasMessageContaining("RESOLVED");
    }
}
