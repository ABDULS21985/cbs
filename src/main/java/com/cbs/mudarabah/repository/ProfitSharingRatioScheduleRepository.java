package com.cbs.mudarabah.repository;

import com.cbs.mudarabah.entity.ProfitSharingRatioSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProfitSharingRatioScheduleRepository extends JpaRepository<ProfitSharingRatioSchedule, Long> {

    List<ProfitSharingRatioSchedule> findByProductTemplateIdAndStatus(Long productTemplateId, String status);

    @Query("SELECT p FROM ProfitSharingRatioSchedule p WHERE p.productTemplateId = :productTemplateId AND p.status = 'ACTIVE' AND p.effectiveFrom <= :date AND (p.effectiveTo IS NULL OR p.effectiveTo >= :date)")
    Optional<ProfitSharingRatioSchedule> findActiveSchedule(@Param("productTemplateId") Long productTemplateId, @Param("date") LocalDate date);

    List<ProfitSharingRatioSchedule> findByStatus(String status);

    List<ProfitSharingRatioSchedule> findByProductTemplateId(Long productTemplateId);
}
