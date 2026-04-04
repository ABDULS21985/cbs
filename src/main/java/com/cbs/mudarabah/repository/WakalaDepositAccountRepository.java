package com.cbs.mudarabah.repository;

import com.cbs.mudarabah.entity.WakalaAccountSubType;
import com.cbs.mudarabah.entity.WakalaDepositAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WakalaDepositAccountRepository extends JpaRepository<WakalaDepositAccount, Long> {

    Optional<WakalaDepositAccount> findByAccountId(Long accountId);

    Optional<WakalaDepositAccount> findByContractReference(String contractReference);

    List<WakalaDepositAccount> findByInvestmentPoolId(Long poolId);

    List<WakalaDepositAccount> findByAccountSubType(WakalaAccountSubType subType);

    @Query("SELECT w FROM WakalaDepositAccount w JOIN w.account a WHERE a.customer.id = :customerId")
    List<WakalaDepositAccount> findByCustomerId(@Param("customerId") Long customerId);

    @Query("SELECT w FROM WakalaDepositAccount w JOIN w.account a WHERE w.investmentPoolId = :poolId AND a.status = 'ACTIVE'")
    List<WakalaDepositAccount> findActiveByPoolId(@Param("poolId") Long poolId);
}
