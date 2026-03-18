package com.cbs.marketorder.repository;

import com.cbs.marketorder.entity.MarketOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MarketOrderRepository extends JpaRepository<MarketOrder, Long> {
    Optional<MarketOrder> findByOrderRef(String orderRef);
    List<MarketOrder> findByStatusInOrderByCreatedAtDesc(Collection<String> statuses);
    List<MarketOrder> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<MarketOrder> findByDeskIdOrderByCreatedAtDesc(Long deskId);
}
