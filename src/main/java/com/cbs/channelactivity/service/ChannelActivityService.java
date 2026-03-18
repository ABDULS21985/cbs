package com.cbs.channelactivity.service;

import com.cbs.channelactivity.entity.ChannelActivityLog;
import com.cbs.channelactivity.entity.ChannelActivitySummary;
import com.cbs.channelactivity.repository.ChannelActivityLogRepository;
import com.cbs.channelactivity.repository.ChannelActivitySummaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class ChannelActivityService {
    private final ChannelActivityLogRepository logRepository;
    private final ChannelActivitySummaryRepository summaryRepository;

    @Transactional
    public ChannelActivityLog logActivity(ChannelActivityLog entry) {
        entry.setLogId("CAL-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        return logRepository.save(entry);
    }

    public List<ChannelActivityLog> getCustomerActivity(Long customerId, String channel) {
        if (channel != null && !channel.isBlank()) {
            return logRepository.findByCustomerIdAndChannelOrderByCreatedAtDesc(customerId, channel);
        }
        return logRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    @Transactional
    public ChannelActivitySummary aggregateSummary(Long customerId, String channel, String periodType, LocalDate periodDate) {
        List<ChannelActivityLog> logs = logRepository.findByCustomerIdAndChannelOrderByCreatedAtDesc(customerId, channel);
        ChannelActivitySummary summary = summaryRepository
                .findByCustomerIdAndChannelAndPeriodTypeAndPeriodDate(customerId, channel, periodType, periodDate)
                .orElse(new ChannelActivitySummary());
        summary.setCustomerId(customerId);
        summary.setChannel(channel);
        summary.setPeriodType(periodType);
        summary.setPeriodDate(periodDate);
        summary.setTotalSessions((int) logs.stream().map(ChannelActivityLog::getSessionId).distinct().count());
        summary.setTotalTransactions(logs.size());
        summary.setTotalAmount(BigDecimal.valueOf(logs.size()));
        summary.setFailureCount((int) logs.stream().filter(l -> "FAILURE".equals(l.getResultStatus())).count());
        summary.setUniqueActivities((int) logs.stream().map(ChannelActivityLog::getActivityType).distinct().count());
        logs.stream().map(ChannelActivityLog::getActivityType)
                .reduce((a, b) -> a).ifPresent(summary::setMostUsedActivity);
        return summaryRepository.save(summary);
    }
}
