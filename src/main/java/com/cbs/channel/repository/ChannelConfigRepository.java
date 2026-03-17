package com.cbs.channel.repository;

import com.cbs.channel.entity.ChannelConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface ChannelConfigRepository extends JpaRepository<ChannelConfig, Long> {
    Optional<ChannelConfig> findByChannel(String channel);
    List<ChannelConfig> findByIsActiveTrueOrderByChannelAsc();
}
