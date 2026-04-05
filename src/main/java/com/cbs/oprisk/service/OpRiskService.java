package com.cbs.oprisk.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
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
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class OpRiskService {

    private final OpRiskLossEventRepository lossEventRepository;
    private final OpRiskKriRepository kriRepository;
    private final OpRiskKriReadingRepository readingRepository;
    private final CurrentActorProvider currentActorProvider;

    // Loss Events
    @Transactional
    public OpRiskLossEvent reportLossEvent(String eventCategory, String eventType, String description,
                                              BigDecimal grossLoss, BigDecimal recoveryAmount, String currencyCode,
                                              String businessLine, String department, LocalDate eventDate,
                                              LocalDate discoveryDate, String reportedBy) {
        if (eventCategory == null || eventCategory.isBlank()) {
            throw new BusinessException("Event category is required");
        }
        if (description == null || description.isBlank()) {
            throw new BusinessException("Event description is required");
        }
        if (grossLoss == null || grossLoss.signum() < 0) {
            throw new BusinessException("Gross loss must be non-negative");
        }
        if (eventDate == null) {
            throw new BusinessException("Event date is required");
        }
        if (eventDate.isAfter(LocalDate.now())) {
            throw new BusinessException("Event date cannot be in the future");
        }
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
        log.info("AUDIT: OpRisk loss event reported: ref={}, category={}, netLoss={}, reportedBy={}", ref, eventCategory, netLoss, reportedBy);
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
        if (kri.getKriCode() == null || kri.getKriCode().isBlank()) {
            throw new BusinessException("KRI code is required");
        }
        if (kri.getKriName() == null || kri.getKriName().isBlank()) {
            throw new BusinessException("KRI name is required");
        }
        // Duplicate check
        kriRepository.findByKriCode(kri.getKriCode()).ifPresent(existing -> {
            throw new BusinessException("KRI code already exists: " + kri.getKriCode());
        });
        OpRiskKri saved = kriRepository.save(kri);
        String actor = currentActorProvider.getCurrentActor();
        log.info("AUDIT: KRI created: code={}, name={}, actor={}", kri.getKriCode(), kri.getKriName(), actor);
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

    /**
     * Historical trend data for a KRI over a date range.
     */
    public List<OpRiskKriReading> getKriTrend(String kriCode, LocalDate from, LocalDate to) {
        OpRiskKri kri = kriRepository.findByKriCode(kriCode)
                .orElseThrow(() -> new ResourceNotFoundException("OpRiskKri", "kriCode", kriCode));
        return readingRepository.findByKriIdAndReadingDateBetweenOrderByReadingDateAsc(kri.getId(), from, to);
    }

    /**
     * Loss event historical trend aggregated by category for a date range.
     */
    public Map<String, BigDecimal> getLossTrendByCategory(LocalDate from, LocalDate to) {
        List<OpRiskLossEvent> events = lossEventRepository.findByEventDateBetween(from, to);
        return events.stream()
                .collect(Collectors.groupingBy(
                        OpRiskLossEvent::getEventCategory,
                        Collectors.reducing(BigDecimal.ZERO, OpRiskLossEvent::getNetLoss, BigDecimal::add)));
    }
}
