package com.cbs.orderexecution.repository;

import com.cbs.orderexecution.entity.ExecutionQuality;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExecutionQualityRepository extends JpaRepository<ExecutionQuality, Long> {
    List<ExecutionQuality> findByOrderIdOrderByAnalysisDateDesc(Long orderId);
}
