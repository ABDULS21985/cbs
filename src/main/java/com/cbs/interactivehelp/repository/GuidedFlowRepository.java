package com.cbs.interactivehelp.repository;

import com.cbs.interactivehelp.entity.GuidedFlow;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GuidedFlowRepository extends JpaRepository<GuidedFlow, Long> {
    Optional<GuidedFlow> findByFlowCode(String flowCode);
}
