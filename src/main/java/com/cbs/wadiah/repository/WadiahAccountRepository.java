package com.cbs.wadiah.repository;

import com.cbs.wadiah.entity.WadiahAccount;
import com.cbs.wadiah.entity.WadiahDomainEnums;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WadiahAccountRepository extends JpaRepository<WadiahAccount, Long> {

    Optional<WadiahAccount> findByAccountId(Long accountId);

        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("select w from WadiahAccount w join fetch w.account a where a.id = :accountId")
        Optional<WadiahAccount> findByAccountIdForUpdate(@Param("accountId") Long accountId);

    Optional<WadiahAccount> findByAccountAccountNumber(String accountNumber);

    Optional<WadiahAccount> findByContractReference(String contractReference);

    List<WadiahAccount> findByAccountIdIn(List<Long> accountIds);

    @Query("""
            select w from WadiahAccount w
            join w.account a
            where w.hibahEligible = true
            and a.status = 'ACTIVE'
            and (:tenantId is null or w.tenantId = :tenantId)
            """)
    List<WadiahAccount> findHibahEligibleAccounts(@Param("tenantId") Long tenantId);

    List<WadiahAccount> findByHibahFrequencyWarningTrue();

    @Query("""
            select w from WadiahAccount w
            where w.zakatApplicable = true
            and (:tenantId is null or w.tenantId = :tenantId)
            """)
    List<WadiahAccount> findZakatApplicableAccounts(@Param("tenantId") Long tenantId);

    long countByWadiahTypeAndTenantId(WadiahDomainEnums.WadiahType wadiahType, Long tenantId);

    @Query("""
            select w from WadiahAccount w
            join fetch w.account a
            join fetch a.customer c
            where c.id = :customerId
            order by a.createdAt desc
            """)
    List<WadiahAccount> findByCustomerId(@Param("customerId") Long customerId);
}
