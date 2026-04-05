package com.cbs.regulatory.repository;

import com.cbs.regulatory.entity.RegulatoryDomainEnums;
import com.cbs.regulatory.entity.RegulatoryReturnTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface RegulatoryReturnTemplateRepository extends JpaRepository<RegulatoryReturnTemplate, Long> {

    Optional<RegulatoryReturnTemplate> findByTemplateCode(String templateCode);

    Optional<RegulatoryReturnTemplate> findTopByJurisdictionAndReturnTypeAndIsActiveTrueAndEffectiveFromLessThanEqualOrderByVersionNumberDesc(
            RegulatoryDomainEnums.Jurisdiction jurisdiction,
            RegulatoryDomainEnums.ReturnType returnType,
            LocalDate effectiveDate);

    List<RegulatoryReturnTemplate> findByJurisdictionAndIsActiveTrueOrderByReturnTypeAscVersionNumberDesc(
            RegulatoryDomainEnums.Jurisdiction jurisdiction);

    List<RegulatoryReturnTemplate> findByIsActiveTrueOrderByJurisdictionAscReturnTypeAscVersionNumberDesc();

    List<RegulatoryReturnTemplate> findByTemplateCodeStartingWithOrderByVersionNumberAsc(String templateCodePrefix);
}
