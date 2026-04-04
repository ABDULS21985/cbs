package com.cbs.mudarabah.repository;

import com.cbs.mudarabah.entity.MudarabahTDStatus;
import com.cbs.mudarabah.entity.MudarabahTermDeposit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface MudarabahTermDepositRepository extends JpaRepository<MudarabahTermDeposit, Long>,
        JpaSpecificationExecutor<MudarabahTermDeposit> {

    Optional<MudarabahTermDeposit> findByDepositRef(String depositRef);

    Optional<MudarabahTermDeposit> findByMudarabahAccountId(Long mudarabahAccountId);

    @Query("SELECT td FROM MudarabahTermDeposit td JOIN td.mudarabahAccount ma JOIN ma.account a WHERE a.customer.id = :customerId")
    List<MudarabahTermDeposit> findByCustomerId(@Param("customerId") Long customerId);

    List<MudarabahTermDeposit> findByStatusAndMaturityDateLessThanEqual(MudarabahTDStatus status, LocalDate maturityDate);

    List<MudarabahTermDeposit> findByMaturityDateBetween(LocalDate from, LocalDate to);

    List<MudarabahTermDeposit> findByInvestmentPoolIdAndStatus(Long poolId, MudarabahTDStatus status);

    List<MudarabahTermDeposit> findByStatus(MudarabahTDStatus status);

    @Query("SELECT COUNT(td) FROM MudarabahTermDeposit td WHERE td.status = :status")
    long countByStatus(@Param("status") MudarabahTDStatus status);

    @Query("SELECT COALESCE(SUM(td.principalAmount), 0) FROM MudarabahTermDeposit td WHERE td.status = 'ACTIVE'")
    BigDecimal sumActivePrincipal();
}
