package com.cbs.portal.islamic.repository;

import com.cbs.portal.islamic.entity.IslamicShariahConsent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface IslamicShariahConsentRepository extends JpaRepository<IslamicShariahConsent, Long> {
    Optional<IslamicShariahConsent> findByApplicationRefAndDisclosureVersion(String applicationRef, String version);
    List<IslamicShariahConsent> findByCustomerIdOrderByConsentTimestampDesc(Long customerId);
    boolean existsByApplicationRef(String applicationRef);
}
