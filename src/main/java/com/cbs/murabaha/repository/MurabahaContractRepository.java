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
}
