package com.cbs.dspm.repository;

import com.cbs.dspm.entity.DspmIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DspmIdentityRepository extends JpaRepository<DspmIdentity, Long> {
    Optional<DspmIdentity> findByIdentityCode(String identityCode);
    List<DspmIdentity> findByStatusOrderByIdentityNameAsc(String status);
    List<DspmIdentity> findByDepartmentOrderByIdentityNameAsc(String department);
}
