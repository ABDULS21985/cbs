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

import java.util.List;
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
    @DisplayName("Project completion stores findings, key insights, and action items")
    void completionStoresAllFields() {
        MarketResearchProject project = new MarketResearchProject();
        project.setId(1L);
        project.setProjectCode("MRP-TEST00001");
        project.setStatus("IN_PROGRESS");

        when(repository.findByProjectCode("MRP-TEST00001")).thenReturn(Optional.of(project));
        when(repository.save(any(MarketResearchProject.class))).thenAnswer(i -> i.getArgument(0));

        MarketResearchProject result = service.complete(
                "MRP-TEST00001",
                "High demand for mobile banking in rural areas",
                List.of("Mobile-first is critical", "Low internet penetration"),
                List.of("Launch mobile lite app", "Partner with telcos"));

        assertThat(result.getStatus()).isEqualTo("COMPLETED");
        assertThat(result.getFindings()).contains("High demand");
        assertThat(result.getKeyInsights()).hasSize(2);
        assertThat(result.getActionItems()).contains("Launch mobile lite app");
        assertThat(result.getCompletedAt()).isNotNull();
    }

    @Test
    @DisplayName("Action tracking updates actionItems JSON list")
    void actionTrackingUpdatesJson() {
        MarketResearchProject project = new MarketResearchProject();
        project.setId(1L);
        project.setProjectCode("MRP-TEST00002");
        project.setStatus("COMPLETED");
        project.setActionItems(null);

        when(repository.findByProjectCode("MRP-TEST00002")).thenReturn(Optional.of(project));
        when(repository.save(any(MarketResearchProject.class))).thenAnswer(i -> i.getArgument(0));

        MarketResearchProject result = service.trackActions(
                "MRP-TEST00002",
                Map.of("actionItems", List.of("Launch new product", "Expand to new market")));

        assertThat(result.getActionItems()).containsExactly("Launch new product", "Expand to new market");
    }
}
