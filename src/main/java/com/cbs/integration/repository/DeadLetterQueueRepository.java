package com.cbs.integration.repository;

import com.cbs.integration.entity.DeadLetterQueue;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DeadLetterQueueRepository extends JpaRepository<DeadLetterQueue, Long> {
    List<DeadLetterQueue> findByStatusOrderByCreatedAtAsc(String status);
    List<DeadLetterQueue> findByRouteIdAndStatusOrderByCreatedAtDesc(Long routeId, String status);
    long countByStatus(String status);
}
