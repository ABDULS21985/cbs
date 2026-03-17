package com.cbs.segmentation.service;

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
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SegmentationService {

    private final SegmentRepository segmentRepository;
    private final CustomerSegmentRepository customerSegmentRepository;
    private final CustomerRepository customerRepository;
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
        dto.setCustomerCount(customerSegmentRepository.countCustomersInSegment(segmentId));
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
}
