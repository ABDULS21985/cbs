package com.cbs.security.repository;

import com.cbs.security.entity.MaskingPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MaskingPolicyRepository extends JpaRepository<MaskingPolicy, Long> {
    List<MaskingPolicy> findByIsActiveTrueOrderByEntityTypeAscFieldNameAsc();
    List<MaskingPolicy> findByEntityTypeOrderByFieldNameAsc(String entityType);
}
