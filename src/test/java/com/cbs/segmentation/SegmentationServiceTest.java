package com.cbs.segmentation;

import com.cbs.account.repository.AccountRepository;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.entity.RiskRating;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.segmentation.dto.SegmentDto;
import com.cbs.segmentation.engine.SegmentRuleEvaluator;
import com.cbs.segmentation.entity.CustomerSegment;
import com.cbs.segmentation.entity.Segment;
import com.cbs.segmentation.entity.SegmentType;
import com.cbs.segmentation.mapper.SegmentMapper;
import com.cbs.segmentation.repository.CustomerSegmentRepository;
import com.cbs.segmentation.repository.SegmentRepository;
import com.cbs.segmentation.service.SegmentationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SegmentationServiceTest {

    @Mock private SegmentRepository segmentRepository;
    @Mock private CustomerSegmentRepository customerSegmentRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private SegmentMapper segmentMapper;
    @Mock private SegmentRuleEvaluator ruleEvaluator;

    private SegmentationService service;

    @BeforeEach
    void setUp() {
        service = new SegmentationService(
                segmentRepository,
                customerSegmentRepository,
                customerRepository,
                accountRepository,
                segmentMapper,
                ruleEvaluator
        );
    }

    @Test
    void getSegmentByCodeWithRulesPopulatesBalanceMetrics() {
        Segment segment = Segment.builder()
                .id(6L)
                .code("CORPORATE_TIER1")
                .name("Corporate Tier 1")
                .segmentType(SegmentType.RULE_BASED)
                .build();
        SegmentDto dto = SegmentDto.builder()
                .id(6L)
                .code("CORPORATE_TIER1")
                .name("Corporate Tier 1")
                .build();

        when(segmentRepository.findByCode("CORPORATE_TIER1")).thenReturn(Optional.of(segment));
        when(segmentRepository.findByIdWithRules(6L)).thenReturn(Optional.of(segment));
        when(segmentMapper.toDto(segment)).thenReturn(dto);
        when(segmentMapper.toRuleDtoList(segment.getRules())).thenReturn(List.of());
        when(customerSegmentRepository.countCustomersInSegment(6L)).thenReturn(4L);
        when(accountRepository.sumAvailableBalanceForSegment(6L)).thenReturn(new BigDecimal("1200000.00"));

        SegmentDto result = service.getSegmentByCodeWithRules("CORPORATE_TIER1");

        assertThat(result.getCustomerCount()).isEqualTo(4L);
        assertThat(result.getTotalBalance()).isEqualByComparingTo("1200000.00");
        assertThat(result.getAvgBalance()).isEqualByComparingTo("300000.00");
    }

    @Test
    void getSegmentCustomerSummariesUsesDisplayNameForCorporateCustomers() {
        Segment segment = Segment.builder()
                .id(6L)
                .code("CORPORATE_TIER1")
                .name("Corporate Tier 1")
                .segmentType(SegmentType.RULE_BASED)
                .build();
        Customer customer = Customer.builder()
                .id(91L)
                .cifNumber("CIF-00091")
                .customerType(CustomerType.CORPORATE)
                .registeredName("BellBank Industries Plc")
                .status(CustomerStatus.ACTIVE)
                .riskRating(RiskRating.LOW)
                .build();
        CustomerSegment assignment = CustomerSegment.builder()
                .customer(customer)
                .segment(segment)
                .build();

        when(segmentRepository.findByCode("CORPORATE_TIER1")).thenReturn(Optional.of(segment));
        when(customerSegmentRepository.findCustomersInSegment(6L, PageRequest.of(0, 20)))
                .thenReturn(new PageImpl<>(List.of(assignment)));
        when(accountRepository.sumAvailableBalanceByCustomerId(91L)).thenReturn(new BigDecimal("450000.00"));
        when(accountRepository.countByCustomerId(91L)).thenReturn(3L);

        List<java.util.Map<String, Object>> result = service.getSegmentCustomerSummaries("CORPORATE_TIER1", PageRequest.of(0, 20));

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().get("firstName")).isEqualTo("BellBank Industries Plc");
        assertThat(result.getFirst().get("lastName")).isEqualTo("");
        assertThat(result.getFirst().get("totalBalance")).isEqualTo(new BigDecimal("450000.00"));
    }
}
