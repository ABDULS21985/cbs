package com.cbs.notification.repository;

import com.cbs.notification.entity.ChannelConfig;
import com.cbs.notification.entity.NotificationChannel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository("notificationChannelConfigRepository")
public interface ChannelConfigRepository extends JpaRepository<ChannelConfig, Long> {
    Optional<ChannelConfig> findByChannel(NotificationChannel channel);
}
