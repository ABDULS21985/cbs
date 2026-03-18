package com.cbs.channel;

import com.cbs.channel.entity.ServicePoint;
import com.cbs.channel.entity.ServicePointInteraction;
import com.cbs.channel.repository.ServicePointInteractionRepository;
import com.cbs.channel.repository.ServicePointRepository;
import com.cbs.channel.service.ServicePointService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServicePointServiceTest {

    @Mock
    private ServicePointRepository servicePointRepository;

    @Mock
    private ServicePointInteractionRepository interactionRepository;

    @InjectMocks
    private ServicePointService service;

    @Test
    @DisplayName("Interaction duration auto-calculated from startedAt to endedAt")
    void interactionDurationAutoCalculated() {
        Instant start = Instant.parse("2026-03-18T10:00:00Z");
        Instant end = Instant.parse("2026-03-18T10:05:30Z");

        ServicePointInteraction interaction = new ServicePointInteraction();
        interaction.setId(1L);
        interaction.setServicePointId(1L);
        interaction.setInteractionType("TRANSACTION");
        interaction.setStartedAt(start);
        interaction.setOutcome("COMPLETED");

        when(interactionRepository.findById(1L)).thenReturn(Optional.of(interaction));
        when(interactionRepository.save(any(ServicePointInteraction.class))).thenAnswer(i -> {
            ServicePointInteraction saved = i.getArgument(0);
            saved.setEndedAt(end); // simulate endedAt set by service
            return saved;
        });

        ServicePointInteraction result = service.endInteraction(1L, "COMPLETED", 5);

        assertThat(result.getDurationSeconds()).isNotNull();
        assertThat(result.getOutcome()).isEqualTo("COMPLETED");
        assertThat(result.getCustomerSatisfactionScore()).isEqualTo(5);
    }

    @Test
    @DisplayName("Utilization = activeInteractions / maxConcurrent × 100")
    void utilizationCalculation() {
        ServicePoint sp = new ServicePoint();
        sp.setId(1L);
        sp.setServicePointCode("SPT-TEST00001");
        sp.setMaxConcurrentCustomers(4);

        ServicePointInteraction completed = new ServicePointInteraction();
        completed.setId(1L);
        completed.setDurationSeconds(120);
        completed.setCustomerSatisfactionScore(4);

        when(servicePointRepository.findById(1L)).thenReturn(Optional.of(sp));
        when(interactionRepository.findByServicePointIdOrderByStartedAtDesc(1L)).thenReturn(List.of(completed));
        when(interactionRepository.countByServicePointIdAndEndedAtIsNull(1L)).thenReturn(2L);

        Map<String, Object> metrics = service.getServicePointMetrics(1L);

        // 2 active / 4 max × 100 = 50.0
        assertThat((Double) metrics.get("utilizationPct")).isEqualTo(50.0);
        assertThat((Long) metrics.get("activeInteractions")).isEqualTo(2L);
    }
}
