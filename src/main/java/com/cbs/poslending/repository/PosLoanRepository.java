package com.cbs.poslending.repository;

import com.cbs.poslending.entity.PosLoan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PosLoanRepository extends JpaRepository<PosLoan, Long> {
    Optional<PosLoan> findByPosLoanNumber(String number);
    List<PosLoan> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<PosLoan> findByMerchantIdAndStatusOrderByCreatedAtDesc(String merchantId, String status);
    List<PosLoan> findByStatusOrderByCreatedAtDesc(String status);
}
