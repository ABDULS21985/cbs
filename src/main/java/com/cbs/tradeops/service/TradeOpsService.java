package com.cbs.tradeops.service;

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

    @Transactional
    public TradeConfirmation submitConfirmation(TradeConfirmation confirmation) {
        confirmation.setConfirmationRef("TC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        confirmation.setMatchStatus("UNMATCHED");
        confirmation.setStatus("PENDING");
        return confirmationRepository.save(confirmation);
    }

    @Transactional
    public List<TradeConfirmation> matchConfirmation(String refA, String refB) {
        TradeConfirmation a = confirmationRepository.findByConfirmationRef(refA)
                .orElseThrow(() -> new ResourceNotFoundException("TradeConfirmation", "confirmationRef", refA));
        TradeConfirmation b = confirmationRepository.findByConfirmationRef(refB)
                .orElseThrow(() -> new ResourceNotFoundException("TradeConfirmation", "confirmationRef", refB));

        // Compare ourDetails vs counterpartyDetails
        Map<String, Object> ourDetails = a.getOurDetails();
        Map<String, Object> cpDetails = b.getOurDetails(); // B's "our details" are A's counterparty details

        Map<String, Object> breaks = new HashMap<>();
        Set<String> allKeys = new HashSet<>();
        if (ourDetails != null) allKeys.addAll(ourDetails.keySet());
        if (cpDetails != null) allKeys.addAll(cpDetails.keySet());

        for (String key : allKeys) {
            Object valA = ourDetails != null ? ourDetails.get(key) : null;
            Object valB = cpDetails != null ? cpDetails.get(key) : null;
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
        } else {
            a.setMatchStatus("DISPUTED");
            a.setBreakFields(breaks);
            b.setMatchStatus("DISPUTED");
            b.setBreakFields(breaks);
        }

        return List.of(confirmationRepository.save(a), confirmationRepository.save(b));
    }

    @Transactional
    public OrderAllocation allocateOrder(OrderAllocation allocation) {
        allocation.setAllocationRef("OA-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        allocation.setAllocatedAt(Instant.now());
        allocation.setStatus("ALLOCATED");
        return allocationRepository.save(allocation);
    }

    @Transactional
    public TradeReport submitTradeReport(TradeReport report) {
        report.setReportRef("TR-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        report.setSubmittedAt(Instant.now());
        report.setStatus("SUBMITTED");
        return reportRepository.save(report);
    }

    @Transactional
    public ClearingSubmission submitForClearing(ClearingSubmission submission) {
        submission.setSubmissionRef("CS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        submission.setSubmittedAt(Instant.now());
        submission.setStatus("SUBMITTED");
        return clearingRepository.save(submission);
    }

    public List<TradeConfirmation> getUnmatched() {
        return confirmationRepository.findByMatchStatusOrderByTradeDateDesc("UNMATCHED");
    }

    public List<ClearingSubmission> getPendingClearing() {
        return clearingRepository.findByStatusOrderBySubmittedAtAsc("SUBMITTED");
    }
}
