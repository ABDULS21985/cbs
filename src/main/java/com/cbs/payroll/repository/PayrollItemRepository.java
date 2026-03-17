package com.cbs.payroll.repository;
import com.cbs.payroll.entity.PayrollItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PayrollItemRepository extends JpaRepository<PayrollItem, Long> {
    List<PayrollItem> findByBatchIdOrderByEmployeeNameAsc(Long batchId);
    List<PayrollItem> findByBatchIdAndStatus(Long batchId, String status);
    long countByBatchIdAndStatus(Long batchId, String status);
}
