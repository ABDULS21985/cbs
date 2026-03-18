package com.cbs.security.rbac.repository;

import com.cbs.security.rbac.entity.SecurityRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface SecurityRoleRepository extends JpaRepository<SecurityRole, Long> {
    Optional<SecurityRole> findByRoleCode(String code);
    List<SecurityRole> findByIsActiveTrueOrderByRoleCodeAsc();
    List<SecurityRole> findByRoleTypeAndIsActiveTrue(String roleType);
}
