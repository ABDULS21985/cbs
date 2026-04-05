package com.cbs.islamicrisk.repository;

import com.cbs.islamicrisk.entity.IslamicCreditScoreModel;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicCreditScoreModelRepository extends JpaRepository<IslamicCreditScoreModel, Long> {

    Optional<IslamicCreditScoreModel> findByModelCode(String modelCode);

    List<IslamicCreditScoreModel> findByStatusOrderByContractTypeCodeAscModelVersionDesc(
            IslamicRiskDomainEnums.ModelStatus status);

    Optional<IslamicCreditScoreModel> findFirstByContractTypeCodeAndProductCategoryAndStatusOrderByModelVersionDesc(
            String contractTypeCode,
            String productCategory,
            IslamicRiskDomainEnums.ModelStatus status);

    Optional<IslamicCreditScoreModel> findFirstByContractTypeCodeAndStatusOrderByModelVersionDesc(
            String contractTypeCode,
            IslamicRiskDomainEnums.ModelStatus status);
}
