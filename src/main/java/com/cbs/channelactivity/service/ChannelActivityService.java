package com.cbs.channelactivity.service;

import com.cbs.channelactivity.entity.ChannelActivityLog;
import com.cbs.channelactivity.entity.ChannelActivitySummary;
import com.cbs.channelactivity.repository.ChannelActivityLogRepository;
import com.cbs.channelactivity.repository.ChannelActivitySummaryRepository;
import com.cbs.common.audit.CurrentActorProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class ChannelActivityService {
    private final ChannelActivityLogRepository logRepository;
    private final ChannelActivitySummaryRepository summaryRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public ChannelActivityLog logActivity(ChannelActivityLog entry) {
        entry.setLogId("CAL-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        ChannelActivityLog saved = logRepository.save(entry);
        log.info("AUDIT: Channel activity logged: id={}, channel={}, customer={}, actor={}",
                saved.getLogId(), saved.getChannel(), saved.getCustomerId(), currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<ChannelActivityLog> getAllLogs() { return logRepository.findAll(); }
    public List<ChannelActivitySummary> getAllSummaries() { return summaryRepository.findAll(); }

    public List<ChannelActivityLog> getCustomerActivity(Long customerId, String channel) {
        if (channel != null && !channel.isBlank()) {
            return logRepository.findByCustomerIdAndChannelOrderByCreatedAtDesc(customerId, channel);
        }
        return logRepository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    @Transactional
    public ChannelActivitySummary aggregateSummary(Long customerId, String channel, String periodType, LocalDate periodDate) {
        List<ChannelActivityLog> logs = logRepository.findByCustomerIdAndChannelOrderByCreatedAtDesc(customerId, channel);

        // Filter by period date to only include relevant logs
        List<ChannelActivityLog> periodLogs = logs.stream()
                .filter(l -> l.getCreatedAt() != null && periodDate != null
                        && !l.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate().isAfter(periodDate))
                .toList();

        ChannelActivitySummary summary = summaryRepository
                .findByCustomerIdAndChannelAndPeriodTypeAndPeriodDate(customerId, channel, periodType, periodDate)
                .orElse(new ChannelActivitySummary());
        summary.setCustomerId(customerId);
        summary.setChannel(channel);
        summary.setPeriodType(periodType);
        summary.setPeriodDate(periodDate);
        summary.setTotalSessions((int) periodLogs.stream().map(ChannelActivityLog::getSessionId).distinct().count());
        summary.setTotalTransactions(periodLogs.size());

        // Note: ChannelActivityLog does not have a transactionAmount field,
        // so totalAmount reflects the count of transactions for this period.
        summary.setTotalAmount(BigDecimal.valueOf(periodLogs.size()));

        summary.setFailureCount((int) periodLogs.stream().filter(l -> "FAILURE".equals(l.getResultStatus())).count());
        summary.setUniqueActivities((int) periodLogs.stream().map(ChannelActivityLog::getActivityType).distinct().count());

        // Fix: setMostUsedActivity uses groupingBy + counting to find most frequent
        periodLogs.stream()
                .map(ChannelActivityLog::getActivityType)
                .filter(a -> a != null)
                .collect(Collectors.groupingBy(a -> a, Collectors.counting()))
                .entrySet().stream()
                .max(Comparator.comparingLong(Map.Entry::getValue))
                .ifPresent(e -> summary.setMostUsedActivity(e.getKey()));

        ChannelActivitySummary saved = summaryRepository.save(summary);
        log.info("AUDIT: Channel activity summary aggregated: customer={}, channel={}, period={} {}, actor={}",
                customerId, channel, periodType, periodDate, currentActorProvider.getCurrentActor());
        return saved;
    }
}
