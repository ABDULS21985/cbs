package com.cbs.posterminal;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.posterminal.entity.PosTerminal;
import com.cbs.posterminal.repository.PosTerminalRepository;
import com.cbs.posterminal.service.PosTerminalService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PosTerminalServiceTest {

    @Mock
    private PosTerminalRepository terminalRepository;

    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks
    private PosTerminalService service;

    @Test
    @DisplayName("updateStatus persists new operational status")
    void updateStatusPersistsNewStatus() {
        PosTerminal terminal = PosTerminal.builder()
                .id(1L)
                .terminalId("TID-001")
                .merchantId("MCH-001")
                .merchantName("Test Merchant")
                .operationalStatus("ACTIVE")
                .build();

        when(terminalRepository.findByTerminalId("TID-001")).thenReturn(Optional.of(terminal));
        when(terminalRepository.save(any(PosTerminal.class))).thenAnswer(i -> {
            PosTerminal saved = Objects.requireNonNull(i.getArgument(0, PosTerminal.class));
            return saved;
        });

        PosTerminal result = service.updateStatus("TID-001", "MAINTENANCE");

        assertThat(result.getOperationalStatus()).isEqualTo("MAINTENANCE");
    }

    @Test
    @DisplayName("updateStatus throws ResourceNotFoundException for unknown terminal")
    void updateStatusThrowsForUnknownTerminal() {
        when(terminalRepository.findByTerminalId("UNKNOWN")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateStatus("UNKNOWN", "OFFLINE"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("getByStatus returns only terminals with matching status")
    void getByStatusFiltersCorrectly() {
        PosTerminal active1 = PosTerminal.builder().terminalId("TID-A1").operationalStatus("ACTIVE").merchantId("M1").merchantName("M1").build();
        PosTerminal active2 = PosTerminal.builder().terminalId("TID-A2").operationalStatus("ACTIVE").merchantId("M1").merchantName("M1").build();

        when(terminalRepository.findByOperationalStatusOrderByTerminalIdAsc("ACTIVE"))
                .thenReturn(List.of(active1, active2));

        List<PosTerminal> result = service.getByStatus("ACTIVE");

        assertThat(result).hasSize(2)
                .allMatch(t -> "ACTIVE".equals(t.getOperationalStatus()));
    }
}
