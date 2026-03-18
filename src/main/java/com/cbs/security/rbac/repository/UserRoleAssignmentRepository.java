package com.cbs.security.rbac.repository;

import com.cbs.security.rbac.entity.UserRoleAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserRoleAssignmentRepository extends JpaRepository<UserRoleAssignment, Long> {
    List<UserRoleAssignment> findByUserIdAndIsActiveTrue(String userId);
    List<UserRoleAssignment> findByRoleCodeAndIsActiveTrue(String roleCode);
}
