package com.cbs.security.siem.service;

import com.cbs.security.siem.entity.SiemEvent;
import com.cbs.security.siem.repository.SiemEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class SiemService {

    private final SiemEventRepository siemEventRepository;

    @Transactional
    public SiemEvent logSecurityEvent(String eventSource, String eventCategory, String severity,
                                        String description, Map<String, Object> eventData,
                                        String userId, String ipAddress, String sessionId, String correlationId) {
        SiemEvent event = SiemEvent.builder()
                .eventSource(eventSource).eventCategory(eventCategory).severity(severity)
                .eventDescription(description).eventData(eventData != null ? eventData : Map.of())
                .userId(userId).ipAddress(ipAddress).sessionId(sessionId).correlationId(correlationId)
                .build();

        SiemEvent saved = siemEventRepository.save(event);

        if ("CRITICAL".equals(severity) || "HIGH".equals(severity)) {
            log.warn("SIEM [{}][{}]: {} | user={}, ip={}", severity, eventCategory, description, userId, ipAddress);
        }
        return saved;
    }

    /** Forwards unforwarded events to external SIEM (Splunk, QRadar, Sentinel, etc.) */
    @Transactional
    public int forwardToSiem() {
        List<SiemEvent> unforwarded = siemEventRepository.findUnforwarded();
        int count = 0;
        for (SiemEvent event : unforwarded) {
            // In production: call SIEM API (syslog/CEF/LEEF/HTTP)
            event.setForwardedToSiem(true);
            event.setForwardedAt(Instant.now());
            event.setSiemEventId("SIEM-" + event.getId());
            siemEventRepository.save(event);
            count++;
        }
        if (count > 0) log.info("Forwarded {} events to SIEM", count);
        return count;
    }

    public Page<SiemEvent> getBySeverity(String severity, Pageable pageable) {
        return siemEventRepository.findBySeverityOrderByEventTimestampDesc(severity, pageable);
    }

    public Page<SiemEvent> getByCategory(String category, Pageable pageable) {
        return siemEventRepository.findByEventCategoryOrderByEventTimestampDesc(category, pageable);
    }

    public Page<SiemEvent> getByCorrelation(String correlationId, Pageable pageable) {
        return siemEventRepository.findByCorrelationIdOrderByEventTimestampAsc(correlationId, pageable);
    }
}
