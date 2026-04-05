package com.cbs.saleslead;

import com.cbs.common.exception.BusinessException;
import com.cbs.saleslead.entity.SalesLead;
import com.cbs.saleslead.repository.SalesLeadRepository;
import com.cbs.saleslead.service.SalesLeadService;
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
class SalesLeadServiceTest {

    @Mock private SalesLeadRepository leadRepository;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private SalesLeadService service;

    @Test @DisplayName("Lead advances through valid pipeline stages")
    void validPipeline() {
        SalesLead lead = SalesLead.builder().id(1L).leadNumber("LD-TEST").stage("NEW").build();
        when(leadRepository.findByLeadNumber("LD-TEST")).thenReturn(Optional.of(lead));
        when(leadRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SalesLead result = service.advanceStage("LD-TEST", "CONTACTED", null);
        assertThat(result.getStage()).isEqualTo("CONTACTED");
    }

    @Test @DisplayName("Invalid stage transition rejected")
    void invalidTransition() {
        SalesLead lead = SalesLead.builder().id(1L).leadNumber("LD-SKIP").stage("NEW").build();
        when(leadRepository.findByLeadNumber("LD-SKIP")).thenReturn(Optional.of(lead));

        assertThatThrownBy(() -> service.advanceStage("LD-SKIP", "WON", null))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Invalid stage");
    }

    @Test @DisplayName("Lost reason captured on LOST transition")
    void lostReason() {
        SalesLead lead = SalesLead.builder().id(1L).leadNumber("LD-LOST").stage("PROPOSAL").build();
        when(leadRepository.findByLeadNumber("LD-LOST")).thenReturn(Optional.of(lead));
        when(leadRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SalesLead result = service.advanceStage("LD-LOST", "LOST", "Competitor pricing");
        assertThat(result.getStage()).isEqualTo("LOST");
        assertThat(result.getLostReason()).isEqualTo("Competitor pricing");
    }
}
