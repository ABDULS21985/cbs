package com.cbs.alm.repository;

import com.cbs.alm.entity.AlmScenario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AlmScenarioRepository extends JpaRepository<AlmScenario, Long> {
    List<AlmScenario> findByIsActiveTrueOrderByScenarioNameAsc();
    List<AlmScenario> findByIsRegulatoryTrueAndIsActiveTrue();
}
