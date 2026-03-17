package com.cbs.intelligence.repository;

import com.cbs.intelligence.entity.CustomerBehaviourEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;

public interface CustomerBehaviourEventRepository extends JpaRepository<CustomerBehaviourEvent, Long> {
    List<CustomerBehaviourEvent> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<CustomerBehaviourEvent> findByCustomerIdAndEventTypeAndCreatedAtAfter(Long customerId, String eventType, Instant since);
    long countByCustomerIdAndEventTypeAndCreatedAtAfter(Long customerId, String eventType, Instant since);
}
