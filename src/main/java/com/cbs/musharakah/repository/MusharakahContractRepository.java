package com.cbs.musharakah.repository;

import com.cbs.musharakah.entity.MusharakahContract;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface MusharakahContractRepository extends JpaRepository<MusharakahContract, Long> {

    Optional<MusharakahContract> findByContractRef(String contractRef);

    List<MusharakahContract> findByCustomerId(Long customerId);

    List<MusharakahContract> findByCustomerIdAndStatus(Long customerId, MusharakahDomainEnums.ContractStatus status);

    List<MusharakahContract> findByMusharakahType(MusharakahDomainEnums.MusharakahType musharakahType);

    List<MusharakahContract> findByStatus(MusharakahDomainEnums.ContractStatus status);

    List<MusharakahContract> findByMaturityDateBetween(LocalDate from, LocalDate to);

    List<MusharakahContract> findByInvestmentPoolId(Long investmentPoolId);

    @Query("select coalesce(sum(c.bankCapitalContribution), 0) from MusharakahContract c where c.status = :status")
    BigDecimal sumBankCapitalContributionByStatus(@Param("status") MusharakahDomainEnums.ContractStatus status);
}
