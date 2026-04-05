package com.cbs.ijarah.repository;

import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface IjarahContractRepository extends JpaRepository<IjarahContract, Long> {

    Optional<IjarahContract> findByContractRef(String contractRef);

    List<IjarahContract> findByCustomerId(Long customerId);

    List<IjarahContract> findByCustomerIdAndStatus(Long customerId, IjarahDomainEnums.ContractStatus status);

    List<IjarahContract> findByIjarahType(IjarahDomainEnums.IjarahType ijarahType);

    List<IjarahContract> findByStatus(IjarahDomainEnums.ContractStatus status);

    List<IjarahContract> findByStatusIn(Collection<IjarahDomainEnums.ContractStatus> statuses);

    List<IjarahContract> findByLeaseEndDateBetween(LocalDate from, LocalDate to);

    List<IjarahContract> findByInsuranceExpiryDateBefore(LocalDate date);

    List<IjarahContract> findByNextRentalReviewDateBetween(LocalDate from, LocalDate to);

    List<IjarahContract> findByNextMajorMaintenanceDueDateBetween(LocalDate from, LocalDate to);

    List<IjarahContract> findByInvestmentPoolId(Long investmentPoolId);

    @Query("select coalesce(sum(c.assetAcquisitionCost), 0) from IjarahContract c where c.status = :status")
    BigDecimal sumAssetAcquisitionCostByStatus(@Param("status") IjarahDomainEnums.ContractStatus status);

    /** Find contracts active as of the given date (started on or before, not terminated before) */
    @Query("""
            SELECT c FROM IjarahContract c
            WHERE (c.leaseStartDate IS NULL OR c.leaseStartDate <= :asOfDate)
            AND (c.terminatedAt IS NULL OR c.terminatedAt >= :asOfDate)
            """)
    List<IjarahContract> findActiveContractsAsOfDate(@Param("asOfDate") LocalDate asOfDate);

    /** Find contracts that have at least one installment paid within the given period */
    @Query("""
            SELECT DISTINCT c FROM IjarahContract c
            WHERE EXISTS (
                SELECT i FROM IjarahRentalInstallment i
                WHERE i.contractId = c.id
                AND i.paidDate BETWEEN :fromDate AND :toDate
            )
            """)
    List<IjarahContract> findContractsWithPaymentsInPeriod(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);
}
