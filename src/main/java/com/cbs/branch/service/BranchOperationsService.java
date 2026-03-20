package com.cbs.branch.service;

import com.cbs.branch.entity.*;
import com.cbs.branch.repository.*;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
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

    public List<BranchFacility> getAllFacilities() {
        return facilityRepository.findAll();
    }

    public List<BranchFacility> getOverdueInspections() {
        return facilityRepository.findByNextInspectionDueBefore(LocalDate.now());
    }

    public List<BranchQueueTicket> getAllQueueTickets() {
        return queueTicketRepository.findAll();
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

    public List<BranchServicePlan> getAllServicePlans() {
        return servicePlanRepository.findAll();
    }

    public List<BranchStaffScheduleView> getStaffSchedule(Long branchId, LocalDate weekOf) {
        LocalDate weekEnd = weekOf.plusDays(6);
        Map<String, BranchStaffScheduleView> rows = new LinkedHashMap<>();

        staffScheduleRepository.findByBranchIdAndScheduledDateBetweenOrderByEmployeeNameAscScheduledDateAsc(branchId, weekOf, weekEnd)
                .forEach(entry -> rows.computeIfAbsent(entry.getEmployeeId(), ignored ->
                                new BranchStaffScheduleView(
                                        entry.getEmployeeId(),
                                        StringUtils.hasText(entry.getEmployeeName()) ? entry.getEmployeeName() : entry.getEmployeeId(),
                                        entry.getRole(),
                                        new LinkedHashMap<>()))
                        .schedule()
                        .put(entry.getScheduledDate().toString(), normalizeShiftType(entry.getShiftType())));

        return rows.values().stream()
                .sorted(Comparator.comparing(BranchStaffScheduleView::staffName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional
    public List<BranchStaffScheduleView> saveStaffSchedule(Long branchId, String staffId, String staffName, String role,
                                                           LocalDate weekOf, Map<String, String> schedule) {
        if (!StringUtils.hasText(staffId)) {
            throw new BusinessException("Staff ID is required");
        }
        if (schedule == null || schedule.isEmpty()) {
            throw new BusinessException("At least one scheduled shift is required");
        }

        LocalDate weekEnd = weekOf.plusDays(6);
        List<BranchStaffSchedule> existingWeek = staffScheduleRepository
                .findByEmployeeIdAndScheduledDateBetween(staffId, weekOf, weekEnd)
                .stream()
                .filter(entry -> entry.getBranchId().equals(branchId))
                .toList();
        BranchStaffSchedule template = existingWeek.stream().findFirst().orElse(null);

        for (Map.Entry<String, String> entry : schedule.entrySet()) {
            LocalDate scheduleDate = LocalDate.parse(entry.getKey());
            BranchStaffSchedule row = staffScheduleRepository
                    .findByBranchIdAndEmployeeIdAndScheduledDate(branchId, staffId, scheduleDate)
                    .orElseGet(() -> BranchStaffSchedule.builder()
                            .branchId(branchId)
                            .employeeId(staffId)
                            .scheduledDate(scheduleDate)
                            .build());
            row.setEmployeeName(resolveStaffName(staffName, template, staffId));
            row.setRole(resolveRole(role, template));
            row.setShiftType(normalizeShiftType(entry.getValue()));
            row.setStatus("SCHEDULED");
            row.setIsOvertime(Boolean.FALSE);
            applyShiftHours(row);
            staffScheduleRepository.save(row);
        }

        log.info("Staff schedule saved: branchId={}, staffId={}, weekOf={}, days={}", branchId, staffId, weekOf, schedule.size());
        return getStaffSchedule(branchId, weekOf);
    }

    @Transactional
    public List<BranchStaffScheduleView> swapShift(Long branchId, String staffId1, String staffId2,
                                                   LocalDate date1, LocalDate date2, String reason) {
        BranchStaffSchedule first = staffScheduleRepository
                .findByBranchIdAndEmployeeIdAndScheduledDate(branchId, staffId1, date1)
                .orElseGet(() -> BranchStaffSchedule.builder()
                        .branchId(branchId)
                        .employeeId(staffId1)
                        .scheduledDate(date1)
                        .shiftType("OFF")
                        .build());
        BranchStaffSchedule second = staffScheduleRepository
                .findByBranchIdAndEmployeeIdAndScheduledDate(branchId, staffId2, date2)
                .orElseGet(() -> BranchStaffSchedule.builder()
                        .branchId(branchId)
                        .employeeId(staffId2)
                        .scheduledDate(date2)
                        .shiftType("OFF")
                        .build());

        String firstShift = normalizeShiftType(first.getShiftType());
        String secondShift = normalizeShiftType(second.getShiftType());

        first.setShiftType(secondShift);
        second.setShiftType(firstShift);
        first.setStatus("SCHEDULED");
        second.setStatus("SCHEDULED");
        applyShiftHours(first);
        applyShiftHours(second);

        staffScheduleRepository.save(first);
        staffScheduleRepository.save(second);
        log.info("Shift swap recorded: branchId={}, staff1={} date1={}, staff2={} date2={}, reason={}",
                branchId, staffId1, date1, staffId2, date2, reason);

        LocalDate weekOf = date1.minusDays(date1.getDayOfWeek().getValue() - 1L);
        return getStaffSchedule(branchId, weekOf);
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

    private String resolveStaffName(String requestedName, BranchStaffSchedule existing, String staffId) {
        if (StringUtils.hasText(requestedName)) {
            return requestedName;
        }
        if (existing != null && StringUtils.hasText(existing.getEmployeeName())) {
            return existing.getEmployeeName();
        }
        return staffId;
    }

    private String resolveRole(String requestedRole, BranchStaffSchedule existing) {
        if (StringUtils.hasText(requestedRole)) {
            return requestedRole;
        }
        if (existing != null && StringUtils.hasText(existing.getRole())) {
            return existing.getRole();
        }
        return "BRANCH_STAFF";
    }

    private String normalizeShiftType(String shiftType) {
        if (!StringUtils.hasText(shiftType)) {
            return "OFF";
        }
        return shiftType.trim().toUpperCase();
    }

    private void applyShiftHours(BranchStaffSchedule schedule) {
        switch (normalizeShiftType(schedule.getShiftType())) {
            case "MORNING" -> {
                schedule.setStartTime(java.time.LocalTime.of(8, 0));
                schedule.setEndTime(java.time.LocalTime.of(13, 0));
            }
            case "AFTERNOON" -> {
                schedule.setStartTime(java.time.LocalTime.of(13, 0));
                schedule.setEndTime(java.time.LocalTime.of(18, 0));
            }
            case "FULL_DAY" -> {
                schedule.setStartTime(java.time.LocalTime.of(8, 0));
                schedule.setEndTime(java.time.LocalTime.of(18, 0));
            }
            case "ON_LEAVE", "OFF" -> {
                schedule.setStartTime(null);
                schedule.setEndTime(null);
            }
            default -> {
                schedule.setStartTime(null);
                schedule.setEndTime(null);
            }
        }
    }

    public record BranchStaffScheduleView(String staffId, String staffName, String role, Map<String, String> schedule) {}
}
