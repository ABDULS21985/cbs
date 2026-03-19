package com.cbs.projectfinance.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.projectfinance.entity.ProjectFinanceFacility;
import com.cbs.projectfinance.entity.ProjectMilestone;
import com.cbs.projectfinance.repository.ProjectFinanceFacilityRepository;
import com.cbs.projectfinance.repository.ProjectMilestoneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ProjectFinanceService {

    private final ProjectFinanceFacilityRepository facilityRepository;
    private final ProjectMilestoneRepository milestoneRepository;

    @Transactional
    public ProjectFinanceFacility createFacility(ProjectFinanceFacility facility) {
        facility.setFacilityCode("PFF-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return facilityRepository.save(facility);
    }

    @Transactional
    public ProjectMilestone addMilestone(String facilityCode, ProjectMilestone milestone) {
        ProjectFinanceFacility facility = getByCode(facilityCode);
        milestone.setMilestoneCode("PM-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        milestone.setFacilityId(facility.getId());
        return milestoneRepository.save(milestone);
    }

    @Transactional
    public ProjectMilestone completeMilestone(String milestoneCode) {
        ProjectMilestone milestone = milestoneRepository.findByMilestoneCode(milestoneCode)
                .orElseThrow(() -> new ResourceNotFoundException("ProjectMilestone", "milestoneCode", milestoneCode));
        milestone.setStatus("COMPLETED");
        milestone.setCompletedDate(LocalDate.now());

        // If disbursement-linked, add amount to facility
        if (Boolean.TRUE.equals(milestone.getDisbursementLinked()) && milestone.getDisbursementAmount() != null) {
            ProjectFinanceFacility facility = facilityRepository.findById(milestone.getFacilityId())
                    .orElseThrow(() -> new ResourceNotFoundException("ProjectFinanceFacility", "id", milestone.getFacilityId()));
            facility.setDisbursedAmount(facility.getDisbursedAmount().add(milestone.getDisbursementAmount()));
            facilityRepository.save(facility);
            log.info("Disbursed {} for milestone {} on facility {}", milestone.getDisbursementAmount(), milestoneCode, facility.getFacilityCode());
        }

        return milestoneRepository.save(milestone);
    }

    public List<ProjectFinanceFacility> getByStatus(String status) {
        return facilityRepository.findByStatusOrderByProjectNameAsc(status);
    }

    public List<ProjectMilestone> getMilestones(String facilityCode) {
        ProjectFinanceFacility facility = getByCode(facilityCode);
        return milestoneRepository.findByFacilityIdOrderByDueDateAsc(facility.getId());
    }

    private ProjectFinanceFacility getByCode(String code) {
        return facilityRepository.findByFacilityCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("ProjectFinanceFacility", "facilityCode", code));
    }

    public java.util.List<ProjectFinanceFacility> getAllFacilities() {
        return facilityRepository.findAll();
    }

}
