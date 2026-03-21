package com.cbs.security.repository;

import com.cbs.security.entity.AbacPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AbacPolicyRepository extends JpaRepository<AbacPolicy, Long> {
    List<AbacPolicy> findByIsActiveTrueOrderByPriorityAsc();
    List<AbacPolicy> findByResourceOrderByPriorityAsc(String resource);
}
