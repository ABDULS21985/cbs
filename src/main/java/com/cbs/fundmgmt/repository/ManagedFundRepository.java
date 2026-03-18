package com.cbs.fundmgmt.repository;

import com.cbs.fundmgmt.entity.ManagedFund;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ManagedFundRepository extends JpaRepository<ManagedFund, Long> {
    Optional<ManagedFund> findByFundCode(String code);
    List<ManagedFund> findByFundTypeAndStatusOrderByFundNameAsc(String fundType, String status);
    List<ManagedFund> findByIsShariaCompliantTrueAndStatus(String status);
    List<ManagedFund> findByStatusOrderByTotalAumDesc(String status);
}
