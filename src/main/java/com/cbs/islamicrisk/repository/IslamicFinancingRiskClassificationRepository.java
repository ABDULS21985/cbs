package com.cbs.islamicrisk.repository;

import com.cbs.islamicrisk.entity.IslamicFinancingRiskClassification;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
