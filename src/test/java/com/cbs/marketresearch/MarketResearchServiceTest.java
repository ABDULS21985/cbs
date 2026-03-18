package com.cbs.marketresearch;

import com.cbs.common.exception.BusinessException;
import com.cbs.marketresearch.entity.MarketResearchProject;
import com.cbs.marketresearch.repository.MarketResearchProjectRepository;
import com.cbs.marketresearch.service.MarketResearchService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarketResearchServiceTest {

    @Mock
    private MarketResearchProjectRepository repository;

    @InjectMocks
    private MarketResearchService service;

    @Test
    @DisplayName("Project completion requires findings and recommendations")
    void completionRequiresFindingsAndRecommendations() {
        MarketResearchProject project = new MarketResearchProject();
        project.setId(1L);
        project.setProjectCode("MRP-TEST00001");
        project.setStatus("IN_PROGRESS");

        when(repository.findByProjectCode("MRP-TEST00001")).thenReturn(Optional.of(project));

        // Missing findings
        assertThatThrownBy(() -> service.completeProject("MRP-TEST00001", null, Map.of("action", "expand")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("key findings");

        // Missing recommendations
        assertThatThrownBy(() -> service.completeProject("MRP-TEST00001", Map.of("finding", "high demand"), null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("recommendations");
    }

    @Test
    @DisplayName("Action tracking updates actionsTaken JSON map")
    void actionTrackingUpdatesJson() {
        MarketResearchProject project = new MarketResearchProject();
        project.setId(1L);
        project.setProjectCode("MRP-TEST00002");
        project.setStatus("COMPLETED");
        project.setActionsTaken(null);

        when(repository.findByProjectCode("MRP-TEST00002")).thenReturn(Optional.of(project));
        when(repository.save(any(MarketResearchProject.class))).thenAnswer(i -> i.getArgument(0));

        MarketResearchProject result = service.trackActions("MRP-TEST00002", Map.of("action1", "Launch new product"));

        assertThat(result.getActionsTaken()).containsKey("action1");
        assertThat(result.getActionsTaken().get("action1")).isEqualTo("Launch new product");
    }
}
