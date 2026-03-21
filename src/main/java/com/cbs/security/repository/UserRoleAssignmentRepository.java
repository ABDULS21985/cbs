package com.cbs.security.repository;

import com.cbs.security.entity.UserRoleAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserRoleAssignmentRepository extends JpaRepository<UserRoleAssignment, Long> {
    List<UserRoleAssignment> findByIsActiveTrueOrderByAssignedAtDesc();
    List<UserRoleAssignment> findByUserId(Long userId);
    List<UserRoleAssignment> findByUserIdAndIsActiveTrue(Long userId);
}
