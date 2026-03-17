package com.cbs.leasing.repository;

import com.cbs.leasing.entity.LeaseContract;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LeaseContractRepository extends JpaRepository<LeaseContract, Long> {
    Optional<LeaseContract> findByLeaseNumber(String leaseNumber);
    List<LeaseContract> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<LeaseContract> findByStatusOrderByCreatedAtDesc(String status);
    List<LeaseContract> findByAssetCategoryAndStatusOrderByCreatedAtDesc(String category, String status);
}
