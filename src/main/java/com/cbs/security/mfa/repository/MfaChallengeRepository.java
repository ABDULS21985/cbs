package com.cbs.security.mfa.repository;

import com.cbs.security.mfa.entity.MfaChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface MfaChallengeRepository extends JpaRepository<MfaChallenge, Long> {
    Optional<MfaChallenge> findByChallengeIdAndStatus(String challengeId, String status);
}
