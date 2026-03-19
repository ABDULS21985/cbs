package com.cbs.casemgmt.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.casemgmt.entity.*;
import com.cbs.casemgmt.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CaseManagementService {

    private final CustomerCaseRepository caseRepository;
    private final CaseNoteRepository noteRepository;

    private static final Map<String, Integer> SLA_HOURS = Map.of(
            "CRITICAL", 4, "HIGH", 8, "MEDIUM", 24, "LOW", 72);

    @Transactional
    public CustomerCase createCase(CustomerCase customerCase) {
        customerCase.setCaseNumber("CASE-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        customerCase.setStatus("OPEN");
        customerCase.setSlaDueAt(Instant.now().plus(SLA_HOURS.getOrDefault(customerCase.getPriority(), 24), ChronoUnit.HOURS));

        CustomerCase saved = caseRepository.save(customerCase);
        log.info("Case created: number={}, type={}, priority={}, sla_due={}", saved.getCaseNumber(),
                saved.getCaseType(), saved.getPriority(), saved.getSlaDueAt());
        return saved;
    }

    @Transactional
    public CustomerCase assignCase(String caseNumber, String assignedTo, String assignedTeam) {
        CustomerCase c = getCase(caseNumber);
        c.setAssignedTo(assignedTo);
        c.setAssignedTeam(assignedTeam);
        c.setStatus("IN_PROGRESS");
        c.setUpdatedAt(Instant.now());
        return caseRepository.save(c);
    }

    @Transactional
    public CustomerCase resolveCase(String caseNumber, String resolutionSummary, String resolutionType, String rootCause) {
        CustomerCase c = getCase(caseNumber);
        if ("RESOLVED".equals(c.getStatus()) || "CLOSED".equals(c.getStatus()))
            throw new BusinessException("Case already resolved/closed");
        c.setStatus("RESOLVED");
        c.setResolutionSummary(resolutionSummary);
        c.setResolutionType(resolutionType);
        c.setRootCause(rootCause);
        c.setResolvedAt(Instant.now());
        c.setUpdatedAt(Instant.now());
        log.info("Case resolved: number={}, type={}", caseNumber, resolutionType);
        return caseRepository.save(c);
    }

    @Transactional
    public CustomerCase escalateCase(String caseNumber, String escalatedTo) {
        CustomerCase c = getCase(caseNumber);
        c.setStatus("ESCALATED");
        c.setAssignedTo(escalatedTo);
        c.setPriority("HIGH".equals(c.getPriority()) ? "CRITICAL" : "HIGH");
        c.setSlaDueAt(Instant.now().plus(SLA_HOURS.get(c.getPriority()), ChronoUnit.HOURS));
        c.setUpdatedAt(Instant.now());
        log.warn("Case escalated: number={}, to={}, newPriority={}", caseNumber, escalatedTo, c.getPriority());
        return caseRepository.save(c);
    }

    @Transactional
    public CaseNote addNote(String caseNumber, String content, String noteType, String createdBy) {
        CustomerCase c = getCase(caseNumber);
        CaseNote note = CaseNote.builder().caseId(c.getId()).content(content).noteType(noteType).createdBy(createdBy).build();
        return noteRepository.save(note);
    }

    @Transactional
    public int checkSlaBreaches() {
        List<CustomerCase> breachCandidates = caseRepository.findSlaBreachCandidates();
        for (CustomerCase c : breachCandidates) { c.setSlaBreached(true); caseRepository.save(c); }
        if (!breachCandidates.isEmpty()) log.warn("SLA breaches detected: count={}", breachCandidates.size());
        return breachCandidates.size();
    }

    public List<CustomerCase> getByCustomer(Long customerId) { return caseRepository.findByCustomerIdOrderByCreatedAtDesc(customerId); }
    public List<CustomerCase> getOpenCases() { return caseRepository.findByStatusOrderByPriorityAscSlaDueAtAsc("OPEN"); }
    public List<CaseNote> getCaseNotes(String caseNumber) { CustomerCase c = getCase(caseNumber); return noteRepository.findByCaseIdOrderByCreatedAtDesc(c.getId()); }

    public CustomerCase getCase(String number) {
        return caseRepository.findByCaseNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerCase", "caseNumber", number));
    }
}
