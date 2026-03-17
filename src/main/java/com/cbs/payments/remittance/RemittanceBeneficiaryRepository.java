package com.cbs.payments.remittance;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RemittanceBeneficiaryRepository extends JpaRepository<RemittanceBeneficiary, Long> {
    List<RemittanceBeneficiary> findByCustomerIdAndIsActiveTrueOrderByBeneficiaryNameAsc(Long customerId);
}
