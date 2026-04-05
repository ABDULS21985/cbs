package com.cbs.islamicrisk.repository;

import com.cbs.islamicrisk.entity.IslamicEclConfiguration;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicEclConfigurationRepository extends JpaRepository<IslamicEclConfiguration, Long> {

    Optional<IslamicEclConfiguration> findByConfigCode(String configCode);

    Optional<IslamicEclConfiguration> findFirstByContractTypeCodeAndProductCategoryAndStatusOrderByEffectiveFromDesc(
            String contractTypeCode,
            String productCategory,
            IslamicRiskDomainEnums.EclConfigStatus status);

    Optional<IslamicEclConfiguration> findFirstByContractTypeCodeAndStatusOrderByEffectiveFromDesc(
            String contractTypeCode,
            IslamicRiskDomainEnums.EclConfigStatus status);

    List<IslamicEclConfiguration> findByStatusOrderByContractTypeCodeAsc(IslamicRiskDomainEnums.EclConfigStatus status);
}
