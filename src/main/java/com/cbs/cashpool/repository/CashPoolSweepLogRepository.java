package com.cbs.cashpool.repository;
import com.cbs.cashpool.entity.CashPoolSweepLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate; import java.util.List;
public interface CashPoolSweepLogRepository extends JpaRepository<CashPoolSweepLog, Long> {
    List<CashPoolSweepLog> findByPoolIdAndValueDateOrderByCreatedAtDesc(Long poolId, LocalDate valueDate);
    List<CashPoolSweepLog> findByPoolIdOrderByCreatedAtDesc(Long poolId);
}
