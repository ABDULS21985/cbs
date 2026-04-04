package com.cbs.mudarabah.repository;

import com.cbs.mudarabah.entity.PsrChangeRequest;
import com.cbs.mudarabah.entity.PsrChangeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PsrChangeRequestRepository extends JpaRepository<PsrChangeRequest, Long> {

    List<PsrChangeRequest> findByMudarabahAccountId(Long mudarabahAccountId);

    List<PsrChangeRequest> findByAccountId(Long accountId);

    List<PsrChangeRequest> findByStatus(PsrChangeStatus status);

    @Query("SELECT p FROM PsrChangeRequest p WHERE p.status = 'PENDING_CONSENT'")
    List<PsrChangeRequest> findPendingConsentRequests();

    @Query("SELECT p FROM PsrChangeRequest p WHERE p.status = 'APPROVED' AND p.effectiveDate <= :date")
    List<PsrChangeRequest> findApprovedAndEffective(@Param("date") LocalDate date);
}
