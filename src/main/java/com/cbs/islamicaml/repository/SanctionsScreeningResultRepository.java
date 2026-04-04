package com.cbs.islamicaml.repository;

import com.cbs.islamicaml.entity.SanctionsDispositionStatus;
import com.cbs.islamicaml.entity.SanctionsOverallResult;
import com.cbs.islamicaml.entity.SanctionsScreeningResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SanctionsScreeningResultRepository extends JpaRepository<SanctionsScreeningResult, Long>,
        JpaSpecificationExecutor<SanctionsScreeningResult> {

    Optional<SanctionsScreeningResult> findByScreeningRef(String screeningRef);

    List<SanctionsScreeningResult> findByCustomerId(Long customerId);

    List<SanctionsScreeningResult> findByOverallResult(SanctionsOverallResult overallResult);

    List<SanctionsScreeningResult> findByDispositionStatus(SanctionsDispositionStatus dispositionStatus);

    long countByOverallResult(SanctionsOverallResult overallResult);
}
