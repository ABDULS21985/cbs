package com.cbs.islamicrisk.repository;

import com.cbs.islamicrisk.entity.IslamicEclCalculation;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicEclCalculationRepository extends JpaRepository<IslamicEclCalculation, Long> {

    Optional<IslamicEclCalculation> findTopByContractIdOrderByCalculationDateDesc(Long contractId);

    List<IslamicEclCalculation> findByContractIdOrderByCalculationDateDesc(Long contractId);

    List<IslamicEclCalculation> findByCalculationDate(LocalDate calculationDate);

    List<IslamicEclCalculation> findByContractTypeCodeAndCalculationDate(String contractTypeCode, LocalDate calculationDate);

    long countByCurrentStageAndCalculationDate(IslamicRiskDomainEnums.Stage currentStage, LocalDate calculationDate);
}
