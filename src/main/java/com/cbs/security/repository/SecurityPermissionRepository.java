package com.cbs.security.repository;

import com.cbs.security.entity.SecurityPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SecurityPermissionRepository extends JpaRepository<SecurityPermission, Long> {
    List<SecurityPermission> findByIsActiveTrueOrderByResourceAscActionAsc();
}
