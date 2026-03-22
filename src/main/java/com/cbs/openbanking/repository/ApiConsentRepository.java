package com.cbs.openbanking.repository;

import com.cbs.openbanking.entity.ApiConsent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface ApiConsentRepository extends JpaRepository<ApiConsent, Long> {
    Optional<ApiConsent> findByConsentId(String consentId);
    List<ApiConsent> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<ApiConsent> findByCustomerIdAndStatus(Long customerId, String status);
    List<ApiConsent> findByClientIdAndStatus(String clientId, String status);
}
