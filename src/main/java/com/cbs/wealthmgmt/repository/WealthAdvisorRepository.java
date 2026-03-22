package com.cbs.wealthmgmt.repository;

import com.cbs.wealthmgmt.entity.WealthAdvisor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WealthAdvisorRepository extends JpaRepository<WealthAdvisor, Long> {
    Optional<WealthAdvisor> findByAdvisorCode(String advisorCode);
    List<WealthAdvisor> findByStatus(String status);
    List<WealthAdvisor> findByStatusOrderByFullNameAsc(String status);
    boolean existsByEmail(String email);
}
