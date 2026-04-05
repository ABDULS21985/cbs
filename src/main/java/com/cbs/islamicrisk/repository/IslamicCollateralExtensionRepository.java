package com.cbs.islamicrisk.repository;

import com.cbs.islamicrisk.entity.IslamicCollateralExtension;
import com.cbs.islamicrisk.entity.IslamicRiskDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicCollateralExtensionRepository extends JpaRepository<IslamicCollateralExtension, Long> {

    Optional<IslamicCollateralExtension> findByBaseCollateralId(Long baseCollateralId);

    List<IslamicCollateralExtension> findByContractId(Long contractId);

    List<IslamicCollateralExtension> findByShariahPermissibility(IslamicRiskDomainEnums.ShariahPermissibility permissibility);

    List<IslamicCollateralExtension> findByUnderlyingScreeningResult(IslamicRiskDomainEnums.UnderlyingScreeningResult result);

    List<IslamicCollateralExtension> findByTakafulExpiryDateBetween(LocalDate from, LocalDate to);
}
