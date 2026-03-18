package com.cbs.trustservices.repository;

import com.cbs.trustservices.entity.TrustAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TrustAccountRepository extends JpaRepository<TrustAccount, Long> {
    Optional<TrustAccount> findByTrustCode(String code);
    List<TrustAccount> findByGrantorCustomerIdAndStatusOrderByTrustNameAsc(Long grantorCustomerId, String status);
    List<TrustAccount> findByTrustTypeAndStatusOrderByTrustNameAsc(String trustType, String status);
}
