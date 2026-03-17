package com.cbs.oprisk.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.oprisk.entity.*;
import com.cbs.oprisk.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class OpRiskService {

    private final OpRiskLossEventRepository lossEventRepository;
    private final OpRiskKriRepository kriRepository;
    private final OpRiskKriReadingRepository readingRepository;

    // Loss Events
    @Transactional
    public OpRiskLossEvent reportLossEvent(String eventCategory, String eventType, String description,
                                              BigDecimal grossLoss, BigDecimal recoveryAmount, String currencyCode,
                                              String businessLine, String department, LocalDate eventDate,
                                              LocalDate discoveryDate, String reportedBy) {
        String ref = "OPR-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        BigDecimal netLoss = grossLoss.subtract(recoveryAmount != null ? recoveryAmount : BigDecimal.ZERO);

        OpRiskLossEvent event = OpRiskLossEvent.builder()
                .eventRef(ref).eventCategory(eventCategory).eventType(eventType)
                .description(description).grossLoss(grossLoss)
                .recoveryAmount(recoveryAmount != null ? recoveryAmount : BigDecimal.ZERO)
                .netLoss(netLoss).currencyCode(currencyCode != null ? currencyCode : "USD")
                .businessLine(businessLine).department(department)
                .eventDate(eventDate).discoveryDate(discoveryDate)
                .createdBy(reportedBy).status("REPORTED").build();

        OpRiskLossEvent saved = lossEventRepository.save(event);
        log.info("OpRisk loss event reported: ref={}, category={}, netLoss={}", ref, eventCategory, netLoss);
        return saved;
    }

    public Page<OpRiskLossEvent> getLossEventsByCategory(String category, Pageable pageable) {
        return lossEventRepository.findByEventCategoryOrderByEventDateDesc(category, pageable);
    }

    public BigDecimal getTotalNetLoss(LocalDate from, LocalDate to) {
        BigDecimal total = lossEventRepository.totalNetLoss(from, to);
        return total != null ? total : BigDecimal.ZERO;
    }

    // KRI Management
    @Transactional
    public OpRiskKri createKri(OpRiskKri kri) {
        OpRiskKri saved = kriRepository.save(kri);
        log.info("KRI created: code={}, name={}", kri.getKriCode(), kri.getKriName());
        return saved;
    }

    public List<OpRiskKri> getAllActiveKris() { return kriRepository.findByIsActiveTrueOrderByKriCategoryAscKriNameAsc(); }

    @Transactional
    public OpRiskKriReading recordKriReading(String kriCode, LocalDate readingDate, BigDecimal value, String commentary) {
        OpRiskKri kri = kriRepository.findByKriCode(kriCode)
                .orElseThrow(() -> new ResourceNotFoundException("OpRiskKri", "kriCode", kriCode));

        String ragStatus = kri.evaluateRag(value);

        OpRiskKriReading reading = OpRiskKriReading.builder()
                .kri(kri).readingDate(readingDate).value(value)
                .ragStatus(ragStatus).commentary(commentary).build();

        OpRiskKriReading saved = readingRepository.save(reading);

        if ("RED".equals(ragStatus)) {
            log.warn("KRI RED alert: code={}, value={}, threshold={}", kriCode, value, kri.getThresholdRed());
        }
        return saved;
    }

    public List<OpRiskKriReading> getKriReadings(Long kriId) {
        return readingRepository.findByKriIdOrderByReadingDateDesc(kriId);
    }

    public List<OpRiskKriReading> getDashboard(LocalDate date) {
        return readingRepository.findByReadingDateOrderByRagStatusDescKriIdAsc(date);
    }
}
