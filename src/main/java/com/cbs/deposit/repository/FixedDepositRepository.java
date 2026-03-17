package com.cbs.deposit.repository;

import com.cbs.deposit.entity.FixedDeposit;
import com.cbs.deposit.entity.FixedDepositStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface FixedDepositRepository extends JpaRepository<FixedDeposit, Long> {

    Optional<FixedDeposit> findByDepositNumber(String depositNumber);

    Page<FixedDeposit> findByCustomerId(Long customerId, Pageable pageable);

    Page<FixedDeposit> findByStatus(FixedDepositStatus status, Pageable pageable);

    @Query("SELECT fd FROM FixedDeposit fd WHERE fd.status = 'ACTIVE' AND fd.maturityDate <= :date")
    List<FixedDeposit> findMaturedDeposits(@Param("date") LocalDate date);

    @Query("SELECT fd FROM FixedDeposit fd JOIN FETCH fd.account JOIN FETCH fd.customer WHERE fd.id = :id")
    Optional<FixedDeposit> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT fd FROM FixedDeposit fd WHERE fd.status = 'ACTIVE'")
    List<FixedDeposit> findAllActive();

    @Query(value = "SELECT nextval('cbs.fixed_deposit_seq')", nativeQuery = true)
    Long getNextDepositSequence();

    long countByCustomerIdAndStatus(Long customerId, FixedDepositStatus status);
}
