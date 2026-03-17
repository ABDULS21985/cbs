package com.cbs.payments.repository;

import com.cbs.payments.entity.MobileMoneyLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MobileMoneyLinkRepository extends JpaRepository<MobileMoneyLink, Long> {
    List<MobileMoneyLink> findByAccountIdAndStatus(Long accountId, String status);
    Optional<MobileMoneyLink> findByMobileNumberAndProvider(String mobileNumber, com.cbs.payments.entity.MobileMoneyProvider provider);
    List<MobileMoneyLink> findByCustomerIdAndStatus(Long customerId, String status);
}
