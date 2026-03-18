package com.cbs.branch.service;

import com.cbs.branch.entity.*;
import com.cbs.branch.repository.*;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class BranchOperationsService {

    private final BranchFacilityRepository facilityRepository;
    private final BranchStaffScheduleRepository staffScheduleRepository;
    private final BranchQueueTicketRepository queueTicketRepository;
    private final BranchServicePlanRepository servicePlanRepository;

    // ── Facility Operations ──────────────────────────────────────────────

    @Transactional
    public BranchFacility registerFacility(BranchFacility facility) {
        BranchFacility saved = facilityRepository.save(facility);
        log.info("Facility registered: id={}, branchId={}, type={}", saved.getId(), saved.getBranchId(), saved.getFacilityType());
        return saved;
    }

    @Transactional
    public BranchFacility scheduleInspection(Long facilityId, LocalDate dueDate) {
        BranchFacility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("BranchFacility", "id", facilityId));
        facility.setNextInspectionDue(dueDate);
        log.info("Inspection scheduled: facilityId={}, dueDate={}", facilityId, dueDate);
        return facilityRepository.save(facility);
    }

    @Transactional
    public BranchFacility recordInspection(Long facilityId, String condition) {
        BranchFacility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResourceNotFoundException("BranchFacility", "id", facilityId));
        facility.setLastInspectionDate(LocalDate.now());
        facility.setCondition(condition);
        facility.setNextInspectionDue(LocalDate.now().plusDays(90));
        log.info("Inspection recorded: facilityId={}, condition={}, nextDue={}", facilityId, condition, facility.getNextInspectionDue());
        return facilityRepository.save(facility);
    }

    public List<BranchFacility> getFacilitiesByBranch(Long branchId, String status) {
        return facilityRepository.findByBranchIdAndStatus(branchId, status);
    }

    public List<BranchFacility> getOverdueInspections() {
        return facilityRepository.findByNextInspectionDueBefore(LocalDate.now());
    }

    // ── Queue Ticket Operations ──────────────────────────────────────────

    @Transactional
    public BranchQueueTicket issueQueueTicket(BranchQueueTicket ticket) {
        Instant startOfDay = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endOfDay = LocalDate.now().plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        long todayCount = queueTicketRepository.findByBranchIdAndIssuedAtBetween(ticket.getBranchId(), startOfDay, endOfDay).size();
        String ticketNumber = String.format("A%03d", todayCount + 1);
        ticket.setTicketNumber(ticketNumber);
        ticket.setStatus("WAITING");
        ticket.setIssuedAt(Instant.now());
        BranchQueueTicket saved = queueTicketRepository.save(ticket);
        log.info("Queue ticket issued: ticketNumber={}, branchId={}", ticketNumber, ticket.getBranchId());
        return saved;
    }

    @Transactional
    public BranchQueueTicket callNextTicket(Long branchId, String counterNumber, String employeeId) {
        List<BranchQueueTicket> waiting = queueTicketRepository.findByBranchIdAndStatusOrderByIssuedAtAsc(branchId, "WAITING");
        if (waiting.isEmpty()) {
            throw new BusinessException("No waiting tickets for branch " + branchId);
        }
        BranchQueueTicket ticket = waiting.get(0);
        ticket.setStatus("CALLED");
        ticket.setCalledAt(Instant.now());
        ticket.setCounterNumber(counterNumber);
        ticket.setServingEmployeeId(employeeId);
        ticket.setServingStartedAt(Instant.now());
        log.info("Ticket called: ticketNumber={}, counter={}, employee={}", ticket.getTicketNumber(), counterNumber, employeeId);
        return queueTicketRepository.save(ticket);
    }

    @Transactional
    public BranchQueueTicket completeService(Long ticketId) {
        BranchQueueTicket ticket = queueTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("BranchQueueTicket", "id", ticketId));
        ticket.setCompletedAt(Instant.now());
        if (ticket.getCalledAt() != null && ticket.getIssuedAt() != null) {
            ticket.setWaitTimeSeconds((int) Duration.between(ticket.getIssuedAt(), ticket.getCalledAt()).getSeconds());
        }
        if (ticket.getCompletedAt() != null && ticket.getServingStartedAt() != null) {
            ticket.setServiceTimeSeconds((int) Duration.between(ticket.getServingStartedAt(), ticket.getCompletedAt()).getSeconds());
        }
        ticket.setStatus("COMPLETED");
        log.info("Service completed: ticketId={}, waitTime={}s, serviceTime={}s", ticketId, ticket.getWaitTimeSeconds(), ticket.getServiceTimeSeconds());
        return queueTicketRepository.save(ticket);
    }

    public Map<String, Object> getQueueStatus(Long branchId) {
        long waitingCount = queueTicketRepository.countByBranchIdAndStatus(branchId, "WAITING");
        Instant startOfDay = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endOfDay = LocalDate.now().plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        List<BranchQueueTicket> todayTickets = queueTicketRepository.findByBranchIdAndIssuedAtBetween(branchId, startOfDay, endOfDay);
        double avgWaitTime = todayTickets.stream()
                .filter(t -> t.getWaitTimeSeconds() != null)
                .mapToInt(BranchQueueTicket::getWaitTimeSeconds)
                .average()
                .orElse(0.0);
        Map<String, Object> status = new HashMap<>();
        status.put("waitingCount", waitingCount);
        status.put("avgWaitTime", avgWaitTime);
        return status;
    }

    // ── Service Plan Operations ──────────────────────────────────────────

    @Transactional
    public BranchServicePlan createServicePlan(BranchServicePlan plan) {
        BranchServicePlan saved = servicePlanRepository.save(plan);
        log.info("Service plan created: id={}, branchId={}, period={}", saved.getId(), saved.getBranchId(), saved.getPlanPeriod());
        return saved;
    }

    @Transactional
    public BranchServicePlan updateActuals(Long planId, int txnVol, int newAccts, int crossSell) {
        BranchServicePlan plan = servicePlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("BranchServicePlan", "id", planId));
        plan.setActualTransactionVolume(txnVol);
        plan.setActualNewAccounts(newAccts);
        plan.setActualCrossSell(crossSell);
        log.info("Service plan actuals updated: planId={}, txnVol={}, newAccts={}, crossSell={}", planId, txnVol, newAccts, crossSell);
        return servicePlanRepository.save(plan);
    }
}
