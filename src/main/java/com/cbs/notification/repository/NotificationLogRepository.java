package com.cbs.notification.repository;

import com.cbs.notification.entity.NotificationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationLogRepository extends JpaRepository<NotificationLog, Long> {
    Page<NotificationLog> findByCustomerIdOrderByCreatedAtDesc(Long customerId, Pageable pageable);
    @Query("SELECT n FROM NotificationLog n WHERE n.status = 'PENDING' AND n.retryCount < n.maxRetries")
    List<NotificationLog> findPendingForRetry();
    long countByStatus(String status);
    long countByStatusNot(String status);
    List<NotificationLog> findByStatusIn(List<String> statuses);
}
