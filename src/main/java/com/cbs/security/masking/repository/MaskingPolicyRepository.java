package com.cbs.security.masking.repository;

import com.cbs.security.masking.entity.MaskingPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface MaskingPolicyRepository extends JpaRepository<MaskingPolicy, Long> {
    List<MaskingPolicy> findByEntityTypeAndIsActiveTrue(String entityType);
    Optional<MaskingPolicy> findByPolicyCode(String code);
    List<MaskingPolicy> findByIsActiveTrueOrderByEntityTypeAscFieldNameAsc();
}
