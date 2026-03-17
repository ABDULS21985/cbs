package com.cbs.eventing.repository;

import com.cbs.eventing.entity.EventSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EventSubscriptionRepository extends JpaRepository<EventSubscription, Long> {
    List<EventSubscription> findByIsActiveTrueOrderBySubscriptionNameAsc();
}
