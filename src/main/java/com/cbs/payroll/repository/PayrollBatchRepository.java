package com.cbs.payroll.repository;
import com.cbs.payroll.entity.PayrollBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface PayrollBatchRepository extends JpaRepository<PayrollBatch, Long> {
    Optional<PayrollBatch> findByBatchId(String batchId);
    List<PayrollBatch> findByCustomerIdOrderByPaymentDateDesc(Long customerId);
    List<PayrollBatch> findByStatusOrderByPaymentDateAsc(String status);
}
