package com.cbs.trade.repository;

import com.cbs.trade.entity.BankGuarantee;
import com.cbs.trade.entity.GuaranteeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.*;

@Repository
public interface BankGuaranteeRepository extends JpaRepository<BankGuarantee, Long> {
    Optional<BankGuarantee> findByGuaranteeNumber(String number);
    Page<BankGuarantee> findByApplicantId(Long customerId, Pageable pageable);
    Page<BankGuarantee> findByStatus(GuaranteeStatus status, Pageable pageable);
    @Query("SELECT bg FROM BankGuarantee bg WHERE bg.status IN ('ISSUED','ACTIVE') AND bg.expiryDate <= :date AND bg.autoExtend = false")
    List<BankGuarantee> findExpiredGuarantees(@Param("date") LocalDate date);
    @Query("SELECT bg FROM BankGuarantee bg WHERE bg.status IN ('ISSUED','ACTIVE') AND bg.expiryDate <= :date AND bg.autoExtend = true")
    List<BankGuarantee> findForAutoExtension(@Param("date") LocalDate date);
    @Query(value = "SELECT nextval('cbs.bg_seq')", nativeQuery = true)
    Long getNextBgSequence();
}
