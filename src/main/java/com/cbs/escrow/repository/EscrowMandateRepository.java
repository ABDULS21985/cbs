package com.cbs.escrow.repository;

import com.cbs.escrow.entity.EscrowMandate;
import com.cbs.escrow.entity.EscrowStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EscrowMandateRepository extends JpaRepository<EscrowMandate, Long> {

    Optional<EscrowMandate> findByMandateNumber(String mandateNumber);

    Page<EscrowMandate> findByCustomerId(Long customerId, Pageable pageable);

    Page<EscrowMandate> findByStatus(EscrowStatus status, Pageable pageable);

    @Query("SELECT e FROM EscrowMandate e JOIN FETCH e.account JOIN FETCH e.customer WHERE e.id = :id")
    Optional<EscrowMandate> findByIdWithDetails(@Param("id") Long id);

    @Query(value = "SELECT nextval('cbs.escrow_mandate_seq')", nativeQuery = true)
    Long getNextMandateSequence();
}
