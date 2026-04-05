package com.cbs.zakat.repository;

import com.cbs.zakat.entity.ZakatDomainEnums;
import com.cbs.zakat.entity.ZakatMethodology;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ZakatMethodologyRepository extends JpaRepository<ZakatMethodology, UUID> {

    Optional<ZakatMethodology> findByMethodologyCode(String methodologyCode);

    List<ZakatMethodology> findByStatusOrderByEffectiveFromDesc(ZakatDomainEnums.MethodologyStatus status);

    List<ZakatMethodology> findByStatusAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
            ZakatDomainEnums.MethodologyStatus status,
            LocalDate effectiveFrom);
}