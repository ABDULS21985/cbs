package com.cbs.credit.repository;

import com.cbs.credit.entity.CreditScoringModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CreditScoringModelRepository extends JpaRepository<CreditScoringModel, Long> {

    Optional<CreditScoringModel> findByModelCode(String modelCode);

    List<CreditScoringModel> findByIsActiveTrueOrderByModelNameAsc();

    List<CreditScoringModel> findByTargetSegmentAndIsActiveTrue(String targetSegment);
}
