package com.cbs.custbehavior.repository;

import com.cbs.custbehavior.entity.CustomerBehaviorModel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerBehaviorModelRepository extends JpaRepository<CustomerBehaviorModel, Long> {
    Optional<CustomerBehaviorModel> findByModelCode(String modelCode);
    Optional<CustomerBehaviorModel> findByCustomerIdAndModelTypeAndIsCurrentTrue(Long customerId, String modelType);
    List<CustomerBehaviorModel> findByCustomerIdAndIsCurrentTrueOrderByScoreDesc(Long customerId);
    List<CustomerBehaviorModel> findByCustomerIdAndModelTypeAndIsCurrentTrueOrderByScoreDesc(Long customerId, String modelType);
}
