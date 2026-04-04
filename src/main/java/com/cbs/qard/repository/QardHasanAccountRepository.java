package com.cbs.qard.repository;

import com.cbs.qard.entity.QardDomainEnums;
import com.cbs.qard.entity.QardHasanAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface QardHasanAccountRepository extends JpaRepository<QardHasanAccount, Long> {

    Optional<QardHasanAccount> findByAccountId(Long accountId);

    Optional<QardHasanAccount> findByContractReference(String contractReference);

    List<QardHasanAccount> findByQardTypeAndQardStatus(QardDomainEnums.QardType qardType,
                                                       QardDomainEnums.QardStatus qardStatus);

    @Query("""
            select q from QardHasanAccount q
            join q.account a
            where a.customer.id = :customerId
            order by q.createdAt desc
            """)
    List<QardHasanAccount> findByCustomerId(@Param("customerId") Long customerId);

    List<QardHasanAccount> findByMaturityDateBetween(LocalDate fromDate, LocalDate toDate);
}
