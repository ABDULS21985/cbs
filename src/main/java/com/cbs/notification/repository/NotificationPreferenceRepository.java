package com.cbs.notification.repository;

import com.cbs.notification.entity.NotificationChannel;
import com.cbs.notification.entity.NotificationPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, Long> {
    List<NotificationPreference> findByCustomerId(Long customerId);
    Optional<NotificationPreference> findByCustomerIdAndChannelAndEventType(Long customerId, NotificationChannel channel, String eventType);
}
