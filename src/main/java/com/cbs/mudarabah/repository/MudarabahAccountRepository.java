package com.cbs.mudarabah.repository;

import com.cbs.mudarabah.entity.MudarabahAccount;
import com.cbs.mudarabah.entity.MudarabahAccountSubType;
import com.cbs.mudarabah.entity.MudarabahType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface MudarabahAccountRepository extends JpaRepository<MudarabahAccount, Long> {

    Optional<MudarabahAccount> findByAccountId(Long accountId);

    Optional<MudarabahAccount> findByContractReference(String contractReference);

    List<MudarabahAccount> findByInvestmentPoolId(Long poolId);

    List<MudarabahAccount> findByInvestmentPoolIdAndAccountSubType(Long poolId, MudarabahAccountSubType subType);

    List<MudarabahAccount> findByAccountSubTypeAndMudarabahType(MudarabahAccountSubType subType, MudarabahType mudarabahType);

    @Query("SELECT m FROM MudarabahAccount m JOIN m.account a WHERE m.investmentPoolId = :poolId AND a.status = 'ACTIVE'")
    List<MudarabahAccount> findActiveByPoolId(@Param("poolId") Long poolId);

    List<MudarabahAccount> findByMaturityDateBetween(LocalDate from, LocalDate to);

    @Query("SELECT COALESCE(SUM(a.bookBalance), 0) FROM MudarabahAccount m JOIN m.account a WHERE m.investmentPoolId = :poolId")
    BigDecimal sumBalanceByPoolId(@Param("poolId") Long poolId);

    @Query("SELECT m FROM MudarabahAccount m WHERE m.investmentPoolId = :poolId AND (m.lastProfitDistributionDate IS NULL OR m.lastProfitDistributionDate < :lastDistributionBefore)")
    List<MudarabahAccount> findProfitDistributionDue(@Param("poolId") Long poolId, @Param("lastDistributionBefore") LocalDate lastDistributionBefore);

    @Query("SELECT m FROM MudarabahAccount m JOIN m.account a WHERE a.customer.id = :customerId")
    List<MudarabahAccount> findByCustomerId(@Param("customerId") Long customerId);

    @Query("SELECT m FROM MudarabahAccount m JOIN m.account a WHERE a.accountNumber = :accountNumber")
    Optional<MudarabahAccount> findByAccountNumber(@Param("accountNumber") String accountNumber);

    @Query("SELECT DISTINCT m.investmentPoolId FROM MudarabahAccount m WHERE m.investmentPoolId IS NOT NULL")
    List<Long> findDistinctActivePoolIds();
}
