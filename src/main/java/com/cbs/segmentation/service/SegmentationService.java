package com.cbs.segmentation.service;

import com.cbs.account.repository.AccountRepository;
import com.cbs.common.exception.DuplicateResourceException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.segmentation.dto.SegmentDto;
import com.cbs.segmentation.dto.SegmentRuleDto;
import com.cbs.segmentation.entity.*;
import com.cbs.segmentation.engine.SegmentRuleEvaluator;
import com.cbs.segmentation.mapper.SegmentMapper;
import com.cbs.segmentation.repository.CustomerSegmentRepository;
import com.cbs.segmentation.repository.SegmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SegmentationService {

    private final SegmentRepository segmentRepository;
    private final CustomerSegmentRepository customerSegmentRepository;
    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final SegmentMapper segmentMapper;
    private final SegmentRuleEvaluator ruleEvaluator;

    // ========================================================================
    // SEGMENT CRUD
    // ========================================================================

    public List<SegmentDto> getAllActiveSegments() {
        List<Segment> segments = segmentRepository.findByIsActiveTrueOrderByPriorityAsc();
        List<SegmentDto> dtos = segmentMapper.toDtoList(segments);
        dtos.forEach(dto -> dto.setCustomerCount(customerSegmentRepository.countCustomersInSegment(dto.getId())));
        return dtos;
    }

    public SegmentDto getSegment(Long segmentId) {
        Segment segment = segmentRepository.findByIdWithRules(segmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Segment", "id", segmentId));
        SegmentDto dto = segmentMapper.toDto(segment);
        dto.setRules(segmentMapper.toRuleDtoList(segment.getRules()));
        enrichSegmentMetrics(dto, segmentId);
        return dto;
    }

    public SegmentDto getSegmentByCode(String code) {
        Segment segment = segmentRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Segment", "code", code));
        return segmentMapper.toDto(segment);
    }

    @Transactional
    public SegmentDto createSegment(SegmentDto request) {
        if (segmentRepository.existsByCode(request.getCode())) {
            throw new DuplicateResourceException("Segment", "code", request.getCode());
        }

        Segment segment = segmentMapper.toEntity(request);

        if (!CollectionUtils.isEmpty(request.getRules())) {
            for (SegmentRuleDto ruleDto : request.getRules()) {
                SegmentRule rule = segmentMapper.toRuleEntity(ruleDto);
                segment.addRule(rule);
            }
        }

        Segment saved = segmentRepository.save(segment);
        log.info("Segment created: code={}, type={}", saved.getCode(), saved.getSegmentType());
        return segmentMapper.toDto(saved);
    }

    @Transactional
    public SegmentDto updateSegment(Long segmentId, SegmentDto request) {
        Segment segment = segmentRepository.findByIdWithRules(segmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Segment", "id", segmentId));

        segmentMapper.updateEntity(request, segment);

        // Replace rules if provided
        if (request.getRules() != null) {
            segment.getRules().clear();
            for (SegmentRuleDto ruleDto : request.getRules()) {
                SegmentRule rule = segmentMapper.toRuleEntity(ruleDto);
                segment.addRule(rule);
            }
        }

        Segment saved = segmentRepository.save(segment);
        log.info("Segment updated: code={}", saved.getCode());
        return segmentMapper.toDto(saved);
    }

    @Transactional
    public void deleteSegment(Long segmentId) {
        Segment segment = segmentRepository.findById(segmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Segment", "id", segmentId));
        segmentRepository.delete(segment);
        log.info("Segment deleted: code={}", segment.getCode());
    }

    /** Get segment by code, with rules and customer count populated. */
    public SegmentDto getSegmentByCodeWithRules(String code) {
        Segment segment = segmentRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Segment", "code", code));
        Segment withRules = segmentRepository.findByIdWithRules(segment.getId()).orElse(segment);
        SegmentDto dto = segmentMapper.toDto(withRules);
        dto.setRules(segmentMapper.toRuleDtoList(withRules.getRules()));
        enrichSegmentMetrics(dto, withRules.getId());
        return dto;
    }

    /** Update segment by code (convenience wrapper). */
    @Transactional
    public SegmentDto updateSegmentByCode(String code, SegmentDto request) {
        Segment segment = segmentRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Segment", "code", code));
        return updateSegment(segment.getId(), request);
    }

    /** Delete segment by code. */
    @Transactional
    public void deleteSegmentByCode(String code) {
        Segment segment = segmentRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Segment", "code", code));
        segmentRepository.delete(segment);
        log.info("Segment deleted: code={}", segment.getCode());
    }

    /** Per-segment analytics: customer count, total and avg balance. */
    public List<Map<String, Object>> getSegmentsAnalytics() {
        List<Segment> segments = segmentRepository.findByIsActiveTrueOrderByPriorityAsc();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Segment s : segments) {
            long count = customerSegmentRepository.countCustomersInSegment(s.getId());
            BigDecimal total = accountRepository.sumAvailableBalanceForSegment(s.getId());
            BigDecimal avg = count > 0
                    ? total.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("code", s.getCode());
            row.put("name", s.getName());
            row.put("colorCode", s.getColorCode());
            row.put("customerCount", count);
            row.put("totalBalance", total);
            row.put("avgBalance", avg);
            result.add(row);
        }
        return result;
    }

    /** Customer summaries for a segment (lightweight projection). */
    public List<Map<String, Object>> getSegmentCustomerSummaries(String code, Pageable pageable) {
        Segment segment = segmentRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Segment", "code", code));
        Page<CustomerSegment> page = customerSegmentRepository.findCustomersInSegment(segment.getId(), pageable);
        List<Map<String, Object>> result = new ArrayList<>();
        for (CustomerSegment cs : page.getContent()) {
            Customer c = cs.getCustomer();
            BigDecimal balance = accountRepository.sumAvailableBalanceByCustomerId(c.getId());
            long productCount = accountRepository.countByCustomerId(c.getId());
            String displayName = c.getDisplayName();
            String firstName = c.isIndividual()
                    ? (c.getFirstName() != null ? c.getFirstName() : displayName)
                    : displayName;
            String lastName = c.isIndividual()
                    ? (c.getLastName() != null ? c.getLastName() : "")
                    : "";
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", c.getId());
            row.put("customerNumber", c.getCifNumber());
            row.put("firstName", firstName != null ? firstName : "");
            row.put("lastName", lastName);
            row.put("customerType", c.getCustomerType() != null ? c.getCustomerType().name() : "INDIVIDUAL");
            row.put("status", c.getStatus() != null ? c.getStatus().name() : "ACTIVE");
            row.put("riskRating", c.getRiskRating() != null ? c.getRiskRating().name() : "MEDIUM");
            row.put("totalBalance", balance != null ? balance : BigDecimal.ZERO);
            row.put("productCount", productCount);
            row.put("memberSince", c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
            result.add(row);
        }
        return result;
    }

    /** Evaluate all customers against a single segment (by code) and assign matches. */
    @Transactional
    public int evaluateSegmentForAllCustomers(String code) {
        Segment segment = segmentRepository.findByIdWithRules(
                segmentRepository.findByCode(code)
                        .orElseThrow(() -> new ResourceNotFoundException("Segment", "code", code))
                        .getId())
                .orElseThrow(() -> new ResourceNotFoundException("Segment", "code", code));

        if (segment.getSegmentType() != SegmentType.RULE_BASED || CollectionUtils.isEmpty(segment.getRules())) {
            log.info("Segment {} is not RULE_BASED or has no rules — skipping evaluation", code);
            return 0;
        }

        int assigned = 0;
        int pageSize = 500;
        Page<Customer> page = customerRepository.findAll(
                org.springframework.data.domain.PageRequest.of(0, pageSize));
        while (!page.isEmpty()) {
            for (Customer customer : page.getContent()) {
                boolean matches = ruleEvaluator.evaluate(customer, segment.getRules());
                if (matches && !customerSegmentRepository.existsByCustomerIdAndSegmentId(
                        customer.getId(), segment.getId())) {
                    CustomerSegment assignment = CustomerSegment.builder()
                            .customer(customer)
                            .segment(segment)
                            .assignmentType(AssignmentType.AUTO)
                            .assignedAt(Instant.now())
                            .confidenceScore(BigDecimal.ONE)
                            .isActive(true)
                            .build();
                    customerSegmentRepository.save(assignment);
                    assigned++;
                }
            }
            if (page.hasNext()) {
                page = customerRepository.findAll(page.nextPageable());
            } else {
                break;
            }
        }
        log.info("Segment {} evaluation complete: {} new assignments", code, assigned);
        return assigned;
    }

    // ========================================================================
    // CUSTOMER SEGMENT ASSIGNMENT
    // ========================================================================

    public List<SegmentDto> getCustomerSegments(Long customerId) {
        customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));

        List<CustomerSegment> assignments = customerSegmentRepository.findActiveSegmentsForCustomer(customerId);
        return assignments.stream()
                .map(cs -> {
                    SegmentDto dto = segmentMapper.toDto(cs.getSegment());
                    return dto;
                })
                .toList();
    }

    @Transactional
    public void assignCustomerToSegment(Long customerId, Long segmentId, AssignmentType assignmentType) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
        Segment segment = segmentRepository.findById(segmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Segment", "id", segmentId));

        if (customerSegmentRepository.existsByCustomerIdAndSegmentId(customerId, segmentId)) {
            log.debug("Customer {} already in segment {}", customerId, segment.getCode());
            return;
        }

        CustomerSegment assignment = CustomerSegment.builder()
                .customer(customer)
                .segment(segment)
                .assignmentType(assignmentType)
                .assignedAt(Instant.now())
                .isActive(true)
                .build();

        customerSegmentRepository.save(assignment);
        log.info("Customer {} assigned to segment {}", customer.getCifNumber(), segment.getCode());
    }

    @Transactional
    public void removeCustomerFromSegment(Long customerId, Long segmentId) {
        CustomerSegment assignment = customerSegmentRepository.findByCustomerIdAndSegmentId(customerId, segmentId)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerSegment", "customerId+segmentId",
                        customerId + "+" + segmentId));
        assignment.setIsActive(false);
        customerSegmentRepository.save(assignment);
        log.info("Customer {} removed from segment {}", customerId, segmentId);
    }

    public Page<Long> getCustomerIdsInSegment(Long segmentId, Pageable pageable) {
        segmentRepository.findById(segmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Segment", "id", segmentId));
        return customerSegmentRepository.findCustomersInSegment(segmentId, pageable)
                .map(cs -> cs.getCustomer().getId());
    }

    // ========================================================================
    // RULE-BASED EVALUATION ENGINE
    // ========================================================================

    @Transactional
    public int evaluateAndAssignSegments(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));

        List<Segment> activeSegments = segmentRepository.findAllActiveWithRules();
        int assignedCount = 0;

        for (Segment segment : activeSegments) {
            if (segment.getSegmentType() != SegmentType.RULE_BASED) {
                continue;
            }
            if (CollectionUtils.isEmpty(segment.getRules())) {
                continue;
            }

            boolean matches = ruleEvaluator.evaluate(customer, segment.getRules());
            if (matches) {
                if (!customerSegmentRepository.existsByCustomerIdAndSegmentId(customerId, segment.getId())) {
                    CustomerSegment assignment = CustomerSegment.builder()
                            .customer(customer)
                            .segment(segment)
                            .assignmentType(AssignmentType.AUTO)
                            .assignedAt(Instant.now())
                            .confidenceScore(BigDecimal.ONE)
                            .isActive(true)
                            .build();
                    customerSegmentRepository.save(assignment);
                    assignedCount++;
                    log.debug("Auto-assigned customer {} to segment {}", customer.getCifNumber(), segment.getCode());
                }
            }
        }

        log.info("Segment evaluation for customer {}: {} new assignments", customer.getCifNumber(), assignedCount);
        return assignedCount;
    }

    @Transactional
    public int evaluateAllCustomers() {
        List<Segment> activeSegments = segmentRepository.findAllActiveWithRules();
        List<Segment> ruleBasedSegments = activeSegments.stream()
                .filter(s -> s.getSegmentType() == SegmentType.RULE_BASED && !CollectionUtils.isEmpty(s.getRules()))
                .toList();

        if (ruleBasedSegments.isEmpty()) {
            log.info("No rule-based segments with rules found for evaluation");
            return 0;
        }

        int totalAssignments = 0;
        int pageSize = 500;
        Page<Customer> page = customerRepository.findAll(
                org.springframework.data.domain.PageRequest.of(0, pageSize));

        while (!page.isEmpty()) {
            for (Customer customer : page.getContent()) {
                for (Segment segment : ruleBasedSegments) {
                    boolean matches = ruleEvaluator.evaluate(customer, segment.getRules());
                    if (matches && !customerSegmentRepository.existsByCustomerIdAndSegmentId(
                            customer.getId(), segment.getId())) {
                        CustomerSegment assignment = CustomerSegment.builder()
                                .customer(customer)
                                .segment(segment)
                                .assignmentType(AssignmentType.AUTO)
                                .assignedAt(Instant.now())
                                .confidenceScore(BigDecimal.ONE)
                                .isActive(true)
                                .build();
                        customerSegmentRepository.save(assignment);
                        totalAssignments++;
                    }
                }
            }
            if (page.hasNext()) {
                page = customerRepository.findAll(page.nextPageable());
            } else {
                break;
            }
        }

        log.info("Bulk segment evaluation complete: {} total new assignments", totalAssignments);
        return totalAssignments;
    }

    private void enrichSegmentMetrics(SegmentDto dto, Long segmentId) {
        long customerCount = customerSegmentRepository.countCustomersInSegment(segmentId);
        BigDecimal totalBalance = accountRepository.sumAvailableBalanceForSegment(segmentId);
        BigDecimal safeTotalBalance = totalBalance != null ? totalBalance : BigDecimal.ZERO;
        BigDecimal avgBalance = customerCount > 0
                ? safeTotalBalance.divide(BigDecimal.valueOf(customerCount), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        dto.setCustomerCount(customerCount);
        dto.setTotalBalance(safeTotalBalance);
        dto.setAvgBalance(avgBalance);
    }
}
