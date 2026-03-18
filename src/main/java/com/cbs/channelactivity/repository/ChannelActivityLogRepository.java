package com.cbs.channelactivity.repository;

import com.cbs.channelactivity.entity.ChannelActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChannelActivityLogRepository extends JpaRepository<ChannelActivityLog, Long> {
    List<ChannelActivityLog> findByCustomerIdAndChannelOrderByCreatedAtDesc(Long customerId, String channel);
    List<ChannelActivityLog> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
}
