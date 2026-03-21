package com.cbs.security.repository;

import com.cbs.security.entity.MfaEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MfaEnrollmentRepository extends JpaRepository<MfaEnrollment, Long> {
    List<MfaEnrollment> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<MfaEnrollment> findByStatus(String status);
    long countByStatus(String status);
}
