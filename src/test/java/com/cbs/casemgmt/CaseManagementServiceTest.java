package com.cbs.casemgmt;

import com.cbs.casemgmt.entity.*;
import com.cbs.casemgmt.repository.*;
import com.cbs.casemgmt.service.CaseManagementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
        CustomerCase c = CustomerCase.builder().customerId(1L).caseType("COMPLAINT").caseCategory("ACCOUNTS")
                .priority("CRITICAL").subject("Payment failed").build();
        CustomerCase result = service.createCase(c);
        assertThat(result.getCaseNumber()).startsWith("CASE-");
        assertThat(result.getSlaDueAt()).isNotNull();
        // CRITICAL = 4 hours SLA
        assertThat(result.getSlaDueAt()).isBefore(java.time.Instant.now().plus(5, java.time.temporal.ChronoUnit.HOURS));
    }

    @Test @DisplayName("Escalation updates priority and reassigns")
    void escalation() {
        CustomerCase c = CustomerCase.builder().id(1L).caseNumber("CAS-ESC").status("IN_PROGRESS").priority("MEDIUM").build();
        when(caseRepository.findByCaseNumber("CAS-ESC")).thenReturn(java.util.Optional.of(c));
        when(caseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CustomerCase result = service.escalateCase("CAS-ESC", "manager@bank.com");
        assertThat(result.getStatus()).isEqualTo("ESCALATED");
        assertThat(result.getAssignedTo()).isEqualTo("manager@bank.com");
    }
}
