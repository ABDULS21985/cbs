package com.cbs.islamicrisk.repository;

import com.cbs.islamicrisk.entity.IslamicFinancingRiskClassification;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicFinancingRiskClassificationRepository extends JpaRepository<IslamicFinancingRiskClassification, Long> {

    Optional<IslamicFinancingRiskClassification> findTopByContractIdOrderByClassificationDateDesc(Long contractId);

    List<IslamicFinancingRiskClassification> findByOnWatchListTrueOrderByClassificationDateDesc();

    List<IslamicFinancingRiskClassification> findByAaoifiClassificationOrderByClassificationDateDesc(
            IslamicRiskDomainEnums.AaoifiClassification classification);

    List<IslamicFinancingRiskClassification> findByClassificationDate(LocalDate classificationDate);

    List<IslamicFinancingRiskClassification> findByContractTypeCodeAndClassificationDate(String contractTypeCode,
                                                                                          LocalDate classificationDate);

    @Query("""
            select c
            from IslamicFinancingRiskClassification c
            where (:contractTypeCode is null or c.contractTypeCode = :contractTypeCode)
              and c.classificationDate = (
                  select max(c2.classificationDate)
                  from IslamicFinancingRiskClassification c2
                  where c2.contractId = c.contractId
                    and (:contractTypeCode is null or c2.contractTypeCode = :contractTypeCode)
              )
            """)
    List<IslamicFinancingRiskClassification> findLatestByContractTypeCode(@Param("contractTypeCode") String contractTypeCode);
}
