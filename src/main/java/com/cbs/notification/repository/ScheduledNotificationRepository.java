package com.cbs.notification.repository;

import com.cbs.notification.entity.ScheduledNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface ScheduledNotificationRepository extends JpaRepository<ScheduledNotification, Long> {

    List<ScheduledNotification> findByStatusOrderByNextRunAsc(String status);

    @Query("SELECT s FROM ScheduledNotification s WHERE s.status = 'ACTIVE' AND s.nextRun <= :now")
    List<ScheduledNotification> findDueForExecution(@Param("now") Instant now);

    List<ScheduledNotification> findAllByOrderByCreatedAtDesc();
}
