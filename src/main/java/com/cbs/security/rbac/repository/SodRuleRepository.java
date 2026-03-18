package com.cbs.security.rbac.repository;

import com.cbs.security.rbac.entity.SodRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SodRuleRepository extends JpaRepository<SodRule, Long> {
    List<SodRule> findByIsActiveTrueOrderByRuleNameAsc();
}
