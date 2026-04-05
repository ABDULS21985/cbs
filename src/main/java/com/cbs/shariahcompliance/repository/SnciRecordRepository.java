package com.cbs.shariahcompliance.repository;

import com.cbs.shariahcompliance.entity.QuarantineStatus;
import com.cbs.shariahcompliance.entity.SnciRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface SnciRecordRepository extends JpaRepository<SnciRecord, Long>,
        JpaSpecificationExecutor<SnciRecord> {

    Optional<SnciRecord> findBySnciRef(String snciRef);

    List<SnciRecord> findByQuarantineStatus(QuarantineStatus quarantineStatus);

    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM SnciRecord r WHERE r.quarantineStatus = :status")
    BigDecimal sumAmountByQuarantineStatus(@Param("status") QuarantineStatus status);

    List<SnciRecord> findByQuarantineStatusIn(List<QuarantineStatus> statuses);

    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM SnciRecord r WHERE r.quarantineStatus IN ('QUARANTINED', 'PENDING_PURIFICATION')")
    BigDecimal sumTotalUnpurified();

    long countByQuarantineStatus(QuarantineStatus status);

    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM SnciRecord r WHERE r.nonComplianceType = :type")
    BigDecimal sumAmountByNonComplianceType(@Param("type") com.cbs.shariahcompliance.entity.NonComplianceType type);

    long countByNonComplianceType(com.cbs.shariahcompliance.entity.NonComplianceType type);

    boolean existsBySourceTransactionRefAndSourceContractRef(String sourceTransactionRef, String sourceContractRef);
}
