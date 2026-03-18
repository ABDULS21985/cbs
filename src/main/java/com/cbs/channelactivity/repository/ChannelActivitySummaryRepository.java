package com.cbs.channelactivity.repository;

import com.cbs.channelactivity.entity.ChannelActivitySummary;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ChannelActivitySummaryRepository extends JpaRepository<ChannelActivitySummary, Long> {
    Optional<ChannelActivitySummary> findByCustomerIdAndChannelAndPeriodTypeAndPeriodDate(Long customerId, String channel, String periodType, LocalDate periodDate);
    List<ChannelActivitySummary> findByCustomerIdAndPeriodTypeOrderByPeriodDateDesc(Long customerId, String periodType);
}
