package com.cbs.projectfinance.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.projectfinance.entity.ProjectFinanceFacility;
import com.cbs.projectfinance.entity.ProjectMilestone;
import com.cbs.projectfinance.repository.ProjectFinanceFacilityRepository;
import com.cbs.projectfinance.repository.ProjectMilestoneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
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
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public ProjectFinanceFacility createFacility(ProjectFinanceFacility facility) {
        // Validation
        if (!StringUtils.hasText(facility.getProjectName())) {
            throw new BusinessException("projectName is required", "MISSING_PROJECT_NAME");
        }
        if (facility.getDebtAmount() == null || facility.getDebtAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("debtAmount must be positive", "INVALID_DEBT_AMOUNT");
        }

        facility.setFacilityCode("PFF-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        ProjectFinanceFacility saved = facilityRepository.save(facility);
        log.info("AUDIT: Project finance facility created by {}: code={}, project={}, debtAmount={}",
                currentActorProvider.getCurrentActor(), saved.getFacilityCode(), saved.getProjectName(), saved.getDebtAmount());
        return saved;
    }

    @Transactional
    public ProjectMilestone addMilestone(String facilityCode, ProjectMilestone milestone) {
        ProjectFinanceFacility facility = getByCode(facilityCode);
        if (!StringUtils.hasText(milestone.getMilestoneName())) {
            throw new BusinessException("milestoneName is required", "MISSING_MILESTONE_NAME");
        }
        milestone.setMilestoneCode("PM-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        milestone.setFacilityId(facility.getId());
        ProjectMilestone saved = milestoneRepository.save(milestone);
        log.info("AUDIT: Project milestone added by {}: code={}, facility={}, name={}",
                currentActorProvider.getCurrentActor(), saved.getMilestoneCode(), facilityCode, saved.getMilestoneName());
        return saved;
    }

    @Transactional
    public ProjectMilestone completeMilestone(String milestoneCode) {
        ProjectMilestone milestone = milestoneRepository.findByMilestoneCode(milestoneCode)
                .orElseThrow(() -> new ResourceNotFoundException("ProjectMilestone", "milestoneCode", milestoneCode));

        // Check milestone not already completed
        if ("COMPLETED".equals(milestone.getStatus())) {
            throw new BusinessException("Milestone " + milestoneCode + " is already completed", "ALREADY_COMPLETED");
        }

        milestone.setStatus("COMPLETED");
        milestone.setCompletedDate(LocalDate.now());

        // If disbursement-linked, validate against facility limit and add amount
        if (Boolean.TRUE.equals(milestone.getDisbursementLinked()) && milestone.getDisbursementAmount() != null) {
            ProjectFinanceFacility facility = facilityRepository.findById(milestone.getFacilityId())
                    .orElseThrow(() -> new ResourceNotFoundException("ProjectFinanceFacility", "id", milestone.getFacilityId()));

            // Validate disbursement against facility limit
            BigDecimal newDisbursed = facility.getDisbursedAmount().add(milestone.getDisbursementAmount());
            if (facility.getDebtAmount() != null && newDisbursed.compareTo(facility.getDebtAmount()) > 0) {
                throw new BusinessException("Disbursement of " + milestone.getDisbursementAmount()
                        + " would exceed facility limit of " + facility.getDebtAmount()
                        + " (currently disbursed: " + facility.getDisbursedAmount() + ")", "EXCEEDS_FACILITY_LIMIT");
            }

            facility.setDisbursedAmount(newDisbursed);
            facilityRepository.save(facility);
            log.info("AUDIT: Disbursed {} for milestone {} on facility {} by {}",
                    milestone.getDisbursementAmount(), milestoneCode, facility.getFacilityCode(),
                    currentActorProvider.getCurrentActor());
        }

        ProjectMilestone saved = milestoneRepository.save(milestone);
        log.info("AUDIT: Milestone completed by {}: code={}", currentActorProvider.getCurrentActor(), milestoneCode);
        return saved;
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

    public List<ProjectFinanceFacility> getAllFacilities() {
        return facilityRepository.findAll();
    }
}
