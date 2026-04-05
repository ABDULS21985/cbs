package com.cbs.tradeops.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.tradeops.entity.ClearingSubmission;
import com.cbs.tradeops.entity.OrderAllocation;
import com.cbs.tradeops.entity.TradeConfirmation;
import com.cbs.tradeops.entity.TradeReport;
import com.cbs.tradeops.repository.ClearingSubmissionRepository;
import com.cbs.tradeops.repository.OrderAllocationRepository;
import com.cbs.tradeops.repository.TradeConfirmationRepository;
import com.cbs.tradeops.repository.TradeReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TradeOpsService {

    private final TradeConfirmationRepository confirmationRepository;
    private final OrderAllocationRepository allocationRepository;
    private final TradeReportRepository reportRepository;
    private final ClearingSubmissionRepository clearingRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public TradeConfirmation submitConfirmation(TradeConfirmation confirmation) {
        if (confirmation.getOurDetails() == null || confirmation.getOurDetails().isEmpty()) {
            throw new BusinessException("Our trade details are required", "MISSING_OUR_DETAILS");
        }
        confirmation.setConfirmationRef("TC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        confirmation.setMatchStatus("UNMATCHED");
        confirmation.setStatus("PENDING");
        TradeConfirmation saved = confirmationRepository.save(confirmation);
        log.info("AUDIT: Trade confirmation submitted: ref={}, actor={}",
                saved.getConfirmationRef(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public List<TradeConfirmation> matchConfirmation(String refA, String refB) {
        TradeConfirmation a = confirmationRepository.findByConfirmationRef(refA)
                .orElseThrow(() -> new ResourceNotFoundException("TradeConfirmation", "confirmationRef", refA));
        TradeConfirmation b = confirmationRepository.findByConfirmationRef(refB)
                .orElseThrow(() -> new ResourceNotFoundException("TradeConfirmation", "confirmationRef", refB));

        // Fix matching logic: compare A's ourDetails vs B's counterpartyDetails
        // (A's view of their own trade should match B's view of A as counterparty)
        Map<String, Object> aOurDetails = a.getOurDetails();
        Map<String, Object> bCounterpartyDetails = b.getCounterpartyDetails(); // B's view of A (counterparty)

        Map<String, Object> breaks = new HashMap<>();
        Set<String> allKeys = new HashSet<>();
        if (aOurDetails != null) allKeys.addAll(aOurDetails.keySet());
        if (bCounterpartyDetails != null) allKeys.addAll(bCounterpartyDetails.keySet());

        for (String key : allKeys) {
            Object valA = aOurDetails != null ? aOurDetails.get(key) : null;
            Object valB = bCounterpartyDetails != null ? bCounterpartyDetails.get(key) : null;
            if (!Objects.equals(valA, valB)) {
                breaks.put(key, Map.of("ours", String.valueOf(valA), "theirs", String.valueOf(valB)));
            }
        }

        if (breaks.isEmpty()) {
            a.setMatchStatus("MATCHED");
            a.setMatchedAt(Instant.now());
            a.setStatus("CONFIRMED");
            b.setMatchStatus("MATCHED");
            b.setMatchedAt(Instant.now());
            b.setStatus("CONFIRMED");
            log.info("AUDIT: Trade confirmations matched: refA={}, refB={}, actor={}",
                    refA, refB, currentActorProvider.getCurrentActor());
        } else {
            a.setMatchStatus("DISPUTED");
            a.setBreakFields(breaks);
            b.setMatchStatus("DISPUTED");
            b.setBreakFields(breaks);
            log.info("AUDIT: Trade confirmations disputed: refA={}, refB={}, breaks={}, actor={}",
                    refA, refB, breaks.keySet(), currentActorProvider.getCurrentActor());
        }

        return List.of(confirmationRepository.save(a), confirmationRepository.save(b));
    }

    @Transactional
    public OrderAllocation allocateOrder(OrderAllocation allocation) {
        if (allocation.getTotalQuantity() == null || allocation.getTotalQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Total quantity must be positive", "INVALID_ALLOCATION_QUANTITY");
        }
        // Validate allocation detail quantities sum to total
        if (allocation.getAllocations() != null && !allocation.getAllocations().isEmpty()) {
            BigDecimal detailTotal = allocation.getAllocations().values().stream()
                    .map(v -> new BigDecimal(v.toString()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (detailTotal.compareTo(allocation.getTotalQuantity()) != 0) {
                throw new BusinessException(
                        String.format("Sub-allocation quantities (%s) must sum to total quantity (%s)",
                                detailTotal, allocation.getTotalQuantity()),
                        "ALLOCATION_MISMATCH");
            }
        }
        allocation.setAllocationRef("OA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        allocation.setAllocatedAt(Instant.now());
        allocation.setStatus("ALLOCATED");
        OrderAllocation saved = allocationRepository.save(allocation);
        log.info("AUDIT: Order allocated: ref={}, actor={}",
                saved.getAllocationRef(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public TradeReport submitTradeReport(TradeReport report) {
        // Validate report has required fields
        if (!StringUtils.hasText(report.getReportType())) {
            throw new BusinessException("Report type is required", "MISSING_REPORT_TYPE");
        }
        if (!StringUtils.hasText(report.getRegime())) {
            throw new BusinessException("Regulatory regime is required for trade reporting", "MISSING_REGIME");
        }
        report.setReportRef("TR-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        report.setSubmittedAt(Instant.now());
        report.setStatus("SUBMITTED");
        TradeReport saved = reportRepository.save(report);
        log.info("AUDIT: Trade report submitted: ref={}, type={}, regime={}, actor={}",
                saved.getReportRef(), saved.getReportType(), saved.getRegime(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public ClearingSubmission submitForClearing(ClearingSubmission submission) {
        submission.setSubmissionRef("CS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        submission.setSubmittedAt(Instant.now());
        submission.setStatus("SUBMITTED");
        ClearingSubmission saved = clearingRepository.save(submission);
        log.info("AUDIT: Clearing submission: ref={}, actor={}",
                saved.getSubmissionRef(), currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<TradeConfirmation> getUnmatched() {
        return confirmationRepository.findByMatchStatusOrderByTradeDateDesc("UNMATCHED");
    }

    public List<ClearingSubmission> getPendingClearing() {
        return clearingRepository.findByStatusOrderBySubmittedAtAsc("SUBMITTED");
    }

    public List<TradeConfirmation> getAllConfirmations() { return confirmationRepository.findAll(); }
    public List<OrderAllocation> getAllAllocations() { return allocationRepository.findAll(); }
    public List<ClearingSubmission> getAllClearingSubmissions() { return clearingRepository.findAll(); }
    public List<TradeReport> getAllReports() { return reportRepository.findAll(); }
}
