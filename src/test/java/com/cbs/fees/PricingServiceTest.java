package com.cbs.fees;

import com.cbs.common.exception.BusinessException;
import com.cbs.fees.entity.*;
import com.cbs.fees.repository.*;
import com.cbs.fees.service.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PricingServiceTest {

    @Mock private DiscountSchemeRepository discountRepo;
    @Mock private SpecialPricingAgreementRepository specialRepo;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private PricingService service;

    @Test
    @DisplayName("Discount evaluation returns best applicable scheme by priority")
    void discountEvaluationReturnsBestScheme() {
        DiscountScheme scheme1 = new DiscountScheme();
        scheme1.setId(1L);
        scheme1.setSchemeCode("DS-001");
        scheme1.setSchemeName("Standard Discount");
        scheme1.setStatus("ACTIVE");
        scheme1.setPriorityOrder(2);
        scheme1.setEffectiveFrom(LocalDate.now().minusDays(30));
        scheme1.setEffectiveTo(LocalDate.now().plusDays(30));
        scheme1.setApplicableFeeIds(List.of("FEE-001"));
        scheme1.setMaxTotalBudget(new BigDecimal("10000"));
        scheme1.setCurrentUtilization(new BigDecimal("5000"));

        DiscountScheme scheme2 = new DiscountScheme();
        scheme2.setId(2L);
        scheme2.setSchemeCode("DS-002");
        scheme2.setSchemeName("Priority Discount");
        scheme2.setStatus("ACTIVE");
        scheme2.setPriorityOrder(1);
        scheme2.setEffectiveFrom(LocalDate.now().minusDays(30));
        scheme2.setEffectiveTo(LocalDate.now().plusDays(30));
        scheme2.setApplicableFeeIds(List.of("FEE-001"));
        scheme2.setMaxTotalBudget(new BigDecimal("10000"));
        scheme2.setCurrentUtilization(new BigDecimal("5000"));

        when(discountRepo.findByStatusOrderByPriorityOrderAsc("ACTIVE"))
                .thenReturn(List.of(scheme2, scheme1));

        PricingService.DiscountResult result = service.evaluateDiscounts(1L, "FEE-001", new BigDecimal("500"));

        assertThat(result.scheme()).isEqualTo(scheme2);
        assertThat(result.scheme().getPriorityOrder()).isEqualTo(1);
        assertThat(result.discountAmount()).isNotNull();
    }

    @Test
    @DisplayName("Budget exhaustion sets scheme status to EXHAUSTED")
    void budgetExhaustionSetsStatusToExhausted() {
        DiscountScheme scheme = new DiscountScheme();
        scheme.setId(1L);
        scheme.setSchemeCode("DS-EXH");
        scheme.setSchemeName("Exhausted Discount");
        scheme.setStatus("ACTIVE");
        scheme.setPriorityOrder(1);
        scheme.setEffectiveFrom(LocalDate.now().minusDays(30));
        scheme.setEffectiveTo(LocalDate.now().plusDays(30));
        scheme.setApplicableFeeIds(List.of("FEE-001"));
        scheme.setMaxTotalBudget(new BigDecimal("1000"));
        scheme.setCurrentUtilization(new BigDecimal("1000"));

        when(discountRepo.findByStatusOrderByPriorityOrderAsc("ACTIVE"))
                .thenReturn(List.of(scheme));
        when(discountRepo.save(any(DiscountScheme.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        PricingService.DiscountResult result = service.evaluateDiscounts(1L, "FEE-001", new BigDecimal("500"));

        assertThat(result.scheme()).isNull();
        assertThat(result.discountAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(result.netAmount()).isEqualByComparingTo("500");
        assertThat(scheme.getStatus()).isEqualTo("EXHAUSTED");
        verify(discountRepo).save(scheme);
    }
}
