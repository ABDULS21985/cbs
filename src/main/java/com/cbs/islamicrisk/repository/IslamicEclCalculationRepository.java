package com.cbs.islamicrisk.repository;

import com.cbs.islamicrisk.entity.IslamicEclCalculation;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query("""
            select e
            from IslamicEclCalculation e
            where (:contractTypeCode is null or e.contractTypeCode = :contractTypeCode)
              and e.calculationDate = (
                  select max(e2.calculationDate)
                  from IslamicEclCalculation e2
                  where e2.contractId = e.contractId
                    and (:contractTypeCode is null or e2.contractTypeCode = :contractTypeCode)
              )
            """)
    List<IslamicEclCalculation> findLatestByContractTypeCode(@Param("contractTypeCode") String contractTypeCode);

    long countByCurrentStageAndCalculationDate(IslamicRiskDomainEnums.Stage currentStage, LocalDate calculationDate);
}
