package com.cbs.projectfinance.repository;

import com.cbs.projectfinance.entity.ProjectMilestone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectMilestoneRepository extends JpaRepository<ProjectMilestone, Long> {
    Optional<ProjectMilestone> findByMilestoneCode(String milestoneCode);
    List<ProjectMilestone> findByFacilityIdOrderByDueDateAsc(Long facilityId);
}
