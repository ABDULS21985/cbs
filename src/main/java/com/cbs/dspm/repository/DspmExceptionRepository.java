package com.cbs.dspm.repository;

import com.cbs.dspm.entity.DspmException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DspmExceptionRepository extends JpaRepository<DspmException, Long> {
    Optional<DspmException> findByExceptionCode(String exceptionCode);
    Page<DspmException> findByStatus(String status, Pageable pageable);
    Page<DspmException> findByPolicyId(Long policyId, Pageable pageable);
}
