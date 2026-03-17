package com.cbs.overdraft.repository;

import com.cbs.overdraft.entity.FacilityUtilizationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FacilityUtilizationLogRepository extends JpaRepository<FacilityUtilizationLog, Long> {

    Page<FacilityUtilizationLog> findByFacilityIdOrderByCreatedAtDesc(Long facilityId, Pageable pageable);
}
