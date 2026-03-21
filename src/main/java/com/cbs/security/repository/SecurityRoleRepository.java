package com.cbs.security.repository;

import com.cbs.security.entity.SecurityRole;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SecurityRoleRepository extends JpaRepository<SecurityRole, Long> {
    Optional<SecurityRole> findByRoleCode(String roleCode);
    List<SecurityRole> findByIsActiveTrueOrderByRoleNameAsc();
}
