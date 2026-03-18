package com.cbs.orderexecution.repository;

import com.cbs.orderexecution.entity.OrderExecution;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderExecutionRepository extends JpaRepository<OrderExecution, Long> {
    Optional<OrderExecution> findByExecutionRef(String executionRef);
    List<OrderExecution> findByOrderIdOrderByExecutedAtDesc(Long orderId);
}
