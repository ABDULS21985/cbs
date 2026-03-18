package com.cbs.security.mfa.repository;

import com.cbs.security.mfa.entity.MfaEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface MfaEnrollmentRepository extends JpaRepository<MfaEnrollment, Long> {
    List<MfaEnrollment> findByUserIdAndIsActiveTrue(String userId);
    Optional<MfaEnrollment> findByUserIdAndMfaMethodAndIsActiveTrue(String userId, String method);
    Optional<MfaEnrollment> findByUserIdAndIsPrimaryTrueAndIsActiveTrue(String userId);
}
