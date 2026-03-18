package com.cbs.projectfinance;

import com.cbs.projectfinance.entity.ProjectFinanceFacility;
import com.cbs.projectfinance.entity.ProjectMilestone;
import com.cbs.projectfinance.repository.ProjectFinanceFacilityRepository;
import com.cbs.projectfinance.repository.ProjectMilestoneRepository;
import com.cbs.projectfinance.service.ProjectFinanceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectFinanceServiceTest {

    @Mock
    private ProjectFinanceFacilityRepository facilityRepository;

    @Mock
    private ProjectMilestoneRepository milestoneRepository;

    @InjectMocks
    private ProjectFinanceService service;

    @Test
    @DisplayName("Milestone completion triggers disbursement when disbursement-linked")
    void milestoneCompletionTriggersDisbursement() {
        ProjectFinanceFacility facility = new ProjectFinanceFacility();
        facility.setId(1L);
        facility.setFacilityCode("PFF-TEST00001");
        facility.setDisbursedAmount(new BigDecimal("1000000"));

        ProjectMilestone milestone = new ProjectMilestone();
        milestone.setId(1L);
        milestone.setMilestoneCode("PM-TEST00001");
        milestone.setFacilityId(1L);
        milestone.setDisbursementLinked(true);
        milestone.setDisbursementAmount(new BigDecimal("500000"));
        milestone.setStatus("IN_PROGRESS");

        when(milestoneRepository.findByMilestoneCode("PM-TEST00001")).thenReturn(Optional.of(milestone));
        when(facilityRepository.findById(1L)).thenReturn(Optional.of(facility));
        when(facilityRepository.save(any(ProjectFinanceFacility.class))).thenAnswer(i -> i.getArgument(0));
        when(milestoneRepository.save(any(ProjectMilestone.class))).thenAnswer(i -> i.getArgument(0));

        ProjectMilestone result = service.completeMilestone("PM-TEST00001");

        assertThat(result.getStatus()).isEqualTo("COMPLETED");
        assertThat(result.getCompletedDate()).isNotNull();
        assertThat(facility.getDisbursedAmount()).isEqualByComparingTo(new BigDecimal("1500000"));
        verify(facilityRepository).save(facility);
    }

    @Test
    @DisplayName("Non-disbursement-linked milestone does not update facility amount")
    void nonDisbursementMilestoneDoesNotUpdateFacility() {
        ProjectMilestone milestone = new ProjectMilestone();
        milestone.setId(2L);
        milestone.setMilestoneCode("PM-TEST00002");
        milestone.setFacilityId(1L);
        milestone.setDisbursementLinked(false);
        milestone.setStatus("PENDING");

        when(milestoneRepository.findByMilestoneCode("PM-TEST00002")).thenReturn(Optional.of(milestone));
        when(milestoneRepository.save(any(ProjectMilestone.class))).thenAnswer(i -> i.getArgument(0));

        ProjectMilestone result = service.completeMilestone("PM-TEST00002");

        assertThat(result.getStatus()).isEqualTo("COMPLETED");
        assertThat(result.getCompletedDate()).isNotNull();
    }
}
