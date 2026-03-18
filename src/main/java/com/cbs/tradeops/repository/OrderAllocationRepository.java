package com.cbs.tradeops.repository;

import com.cbs.tradeops.entity.OrderAllocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrderAllocationRepository extends JpaRepository<OrderAllocation, Long> {
    Optional<OrderAllocation> findByAllocationRef(String allocationRef);
}
