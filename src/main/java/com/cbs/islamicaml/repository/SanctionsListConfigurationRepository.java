package com.cbs.islamicaml.repository;

import com.cbs.islamicaml.entity.SanctionsListConfiguration;
import com.cbs.islamicaml.entity.SanctionsListType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SanctionsListConfigurationRepository extends JpaRepository<SanctionsListConfiguration, Long> {

    Optional<SanctionsListConfiguration> findByListCode(String listCode);

    List<SanctionsListConfiguration> findByIsActiveTrueOrderByPriorityAsc();

    List<SanctionsListConfiguration> findByListType(SanctionsListType listType);
}
