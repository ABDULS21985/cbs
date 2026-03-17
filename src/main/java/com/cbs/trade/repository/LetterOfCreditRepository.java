package com.cbs.trade.repository;

import com.cbs.trade.entity.LetterOfCredit;
import com.cbs.trade.entity.LcStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.*;

@Repository
public interface LetterOfCreditRepository extends JpaRepository<LetterOfCredit, Long> {
    Optional<LetterOfCredit> findByLcNumber(String lcNumber);
    Page<LetterOfCredit> findByApplicantId(Long customerId, Pageable pageable);
    Page<LetterOfCredit> findByStatus(LcStatus status, Pageable pageable);
    @Query("SELECT lc FROM LetterOfCredit lc WHERE lc.status NOT IN ('EXPIRED','CANCELLED','CLOSED') AND lc.expiryDate <= :date")
    List<LetterOfCredit> findExpiredLCs(@Param("date") LocalDate date);
    @Query(value = "SELECT nextval('cbs.lc_seq')", nativeQuery = true)
    Long getNextLcSequence();
}
