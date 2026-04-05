package com.cbs.wadiah.repository;

import com.cbs.wadiah.entity.WadiahDomainEnums;
import com.cbs.wadiah.entity.WadiahOnboardingApplication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface WadiahOnboardingApplicationRepository extends JpaRepository<WadiahOnboardingApplication, Long> {

    Optional<WadiahOnboardingApplication> findByApplicationRef(String applicationRef);

    Page<WadiahOnboardingApplication> findByStatus(WadiahDomainEnums.ApplicationStatus status, Pageable pageable);

    Page<WadiahOnboardingApplication> findByOfficerId(String officerId, Pageable pageable);

    Page<WadiahOnboardingApplication> findByOfficerIdAndStatus(String officerId,
                                                               WadiahDomainEnums.ApplicationStatus status,
                                                               Pageable pageable);

    List<WadiahOnboardingApplication> findByStatusAndExpiresAtBefore(
            WadiahDomainEnums.ApplicationStatus status,
            LocalDateTime expiresAt);

    List<WadiahOnboardingApplication> findByStatusInAndExpiresAtBefore(
            java.util.Collection<WadiahDomainEnums.ApplicationStatus> statuses,
            LocalDateTime expiresAt);
}
