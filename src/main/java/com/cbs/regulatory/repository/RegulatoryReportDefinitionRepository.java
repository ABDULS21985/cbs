package com.cbs.regulatory.repository;

import com.cbs.regulatory.entity.RegulatoryReportDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RegulatoryReportDefinitionRepository extends JpaRepository<RegulatoryReportDefinition, Long> {
    Optional<RegulatoryReportDefinition> findByReportCode(String reportCode);
    List<RegulatoryReportDefinition> findByIsActiveTrueOrderByReportNameAsc();
    List<RegulatoryReportDefinition> findByRegulatorAndIsActiveTrue(String regulator);
}
