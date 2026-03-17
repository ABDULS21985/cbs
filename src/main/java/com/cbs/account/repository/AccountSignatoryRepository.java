package com.cbs.account.repository;

import com.cbs.account.entity.AccountSignatory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccountSignatoryRepository extends JpaRepository<AccountSignatory, Long> {

    List<AccountSignatory> findByAccountIdAndIsActiveTrue(Long accountId);

    @Query("SELECT s FROM AccountSignatory s JOIN FETCH s.customer WHERE s.account.id = :accountId AND s.isActive = true")
    List<AccountSignatory> findByAccountIdWithCustomer(@Param("accountId") Long accountId);

    @Query("""
            SELECT s FROM AccountSignatory s
            JOIN FETCH s.customer
            JOIN FETCH s.account
            WHERE s.account.id IN :accountIds
            AND s.isActive = true
            """)
    List<AccountSignatory> findByAccountIdInWithCustomer(@Param("accountIds") List<Long> accountIds);

    boolean existsByAccountIdAndCustomerId(Long accountId, Long customerId);

    @Query("SELECT s FROM AccountSignatory s JOIN FETCH s.account WHERE s.customer.id = :customerId AND s.isActive = true")
    List<AccountSignatory> findAccountsBySignatoryCustomerId(@Param("customerId") Long customerId);
}
