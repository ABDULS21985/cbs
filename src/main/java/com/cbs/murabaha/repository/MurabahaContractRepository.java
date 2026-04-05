package com.cbs.murabaha.repository;

import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
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
public interface MurabahaContractRepository extends JpaRepository<MurabahaContract, Long> {

    Optional<MurabahaContract> findByContractRef(String contractRef);

    List<MurabahaContract> findByCustomerId(Long customerId);

    List<MurabahaContract> findByCustomerIdAndStatus(Long customerId, MurabahaDomainEnums.ContractStatus status);

    List<MurabahaContract> findByStatus(MurabahaDomainEnums.ContractStatus status);

    List<MurabahaContract> findByMurabahahType(MurabahaDomainEnums.MurabahahType murabahahType);

    List<MurabahaContract> findByMaturityDateBetween(LocalDate from, LocalDate to);

    List<MurabahaContract> findByInvestmentPoolId(Long investmentPoolId);

    @Query("select coalesce(sum(c.financedAmount), 0) from MurabahaContract c where c.status = :status")
    BigDecimal sumFinancedAmountByStatus(@Param("status") MurabahaDomainEnums.ContractStatus status);

    @Query("select coalesce(sum(c.unrecognisedProfit), 0) from MurabahaContract c where c.status = :status")
    BigDecimal sumUnrecognisedProfitByStatus(@Param("status") MurabahaDomainEnums.ContractStatus status);

    List<MurabahaContract> findByOwnershipVerifiedFalseAndStatusIn(Collection<MurabahaDomainEnums.ContractStatus> statuses);

    @Query("SELECT COUNT(c) FROM MurabahaContract c WHERE c.status = :status")
    long countByStatus(@Param("status") MurabahaDomainEnums.ContractStatus status);

    @Query("SELECT COALESCE(SUM(c.financedAmount), 0) FROM MurabahaContract c WHERE c.status IN :statuses")
    BigDecimal sumFinancedAmountByStatuses(@Param("statuses") Collection<MurabahaDomainEnums.ContractStatus> statuses);

    @Query("SELECT COALESCE(SUM(c.recognisedProfit), 0) FROM MurabahaContract c WHERE c.status IN :statuses")
    BigDecimal sumRecognisedProfitByStatuses(@Param("statuses") Collection<MurabahaDomainEnums.ContractStatus> statuses);

    @Query("SELECT COALESCE(SUM(c.unrecognisedProfit), 0) FROM MurabahaContract c WHERE c.status IN :statuses")
    BigDecimal sumUnrecognisedProfitByStatuses(@Param("statuses") Collection<MurabahaDomainEnums.ContractStatus> statuses);

    @Query("SELECT COALESCE(SUM(c.impairmentProvisionBalance), 0) FROM MurabahaContract c WHERE c.status IN :statuses")
    BigDecimal sumImpairmentProvisionByStatuses(@Param("statuses") Collection<MurabahaDomainEnums.ContractStatus> statuses);

    @Query("SELECT COALESCE(SUM(c.markupRate), 0) FROM MurabahaContract c WHERE c.status IN :statuses")
    BigDecimal sumMarkupRateByStatuses(@Param("statuses") Collection<MurabahaDomainEnums.ContractStatus> statuses);

    @Query("SELECT COUNT(c) FROM MurabahaContract c WHERE c.status IN :statuses")
    long countByStatusIn(@Param("statuses") Collection<MurabahaDomainEnums.ContractStatus> statuses);

    @Query("SELECT c.status, COUNT(c) FROM MurabahaContract c WHERE c.status IN :statuses GROUP BY c.status")
    List<Object[]> countGroupByStatus(@Param("statuses") Collection<MurabahaDomainEnums.ContractStatus> statuses);

    @Query("SELECT c.murabahahType, COUNT(c) FROM MurabahaContract c WHERE c.status IN :statuses GROUP BY c.murabahahType")
    List<Object[]> countGroupByMurabahahType(@Param("statuses") Collection<MurabahaDomainEnums.ContractStatus> statuses);

    @Query("SELECT COALESCE(SUM(c.ibraAmount), 0) FROM MurabahaContract c WHERE c.status IN :statuses")
    BigDecimal sumIbraAmountByStatuses(@Param("statuses") Collection<MurabahaDomainEnums.ContractStatus> statuses);

    @Query("SELECT COALESCE(SUM(c.recognisedProfit), 0) FROM MurabahaContract c WHERE c.lastProfitRecognitionDate BETWEEN :from AND :to AND c.status IN :statuses")
    BigDecimal sumRecognisedProfitInPeriod(@Param("from") java.time.LocalDate from, @Param("to") java.time.LocalDate to, @Param("statuses") Collection<MurabahaDomainEnums.ContractStatus> statuses);

    @Query("SELECT c.murabahahType, COALESCE(SUM(c.recognisedProfit), 0) FROM MurabahaContract c WHERE c.status IN :statuses GROUP BY c.murabahahType")
    List<Object[]> sumRecognisedProfitGroupByMurabahahType(@Param("statuses") Collection<MurabahaDomainEnums.ContractStatus> statuses);

    @Query("SELECT c.profitRecognitionMethod, COALESCE(SUM(c.recognisedProfit), 0) FROM MurabahaContract c WHERE c.status IN :statuses GROUP BY c.profitRecognitionMethod")
    List<Object[]> sumRecognisedProfitGroupByRecognitionMethod(@Param("statuses") Collection<MurabahaDomainEnums.ContractStatus> statuses);

    List<MurabahaContract> findByStatusIn(Collection<MurabahaDomainEnums.ContractStatus> statuses);
}
