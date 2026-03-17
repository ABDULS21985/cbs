package com.cbs.virtualaccount.repository;

import com.cbs.virtualaccount.entity.VirtualAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface VirtualAccountRepository extends JpaRepository<VirtualAccount, Long> {
    Optional<VirtualAccount> findByVirtualAccountNumber(String number);
    List<VirtualAccount> findByMasterAccountIdAndIsActiveTrueOrderByAccountNameAsc(Long masterAccountId);
    List<VirtualAccount> findByCustomerIdAndIsActiveTrueOrderByAccountNameAsc(Long customerId);
    List<VirtualAccount> findByAutoSweepEnabledTrueAndIsActiveTrue();
    Optional<VirtualAccount> findByExternalReference(String externalReference);
}
