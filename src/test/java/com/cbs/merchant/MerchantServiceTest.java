package com.cbs.merchant;

import com.cbs.common.exception.BusinessException;
import com.cbs.merchant.entity.MerchantProfile;
import com.cbs.merchant.repository.MerchantProfileRepository;
import com.cbs.merchant.service.MerchantService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MerchantServiceTest {

    @Mock private MerchantProfileRepository merchantRepository;
    @InjectMocks private MerchantService service;

    @Test @DisplayName("Merchant onboarding sets PENDING status and generates ID")
    void onboard() {
        when(merchantRepository.save(any())).thenAnswer(inv -> { MerchantProfile m = inv.getArgument(0); m.setId(1L); return m; });
        MerchantProfile m = MerchantProfile.builder().merchantName("Coffee Shop").merchantCategoryCode("5812")
                .businessType("SOLE_PROPRIETOR").mdrRate(new BigDecimal("1.500")).build();
        MerchantProfile result = service.onboard(m);
        assertThat(result.getMerchantId()).startsWith("MCH-");
        assertThat(result.getStatus()).isEqualTo("PENDING");
    }

    @Test @DisplayName("Cannot activate PROHIBITED merchant")
    void prohibitedActivation() {
        MerchantProfile m = MerchantProfile.builder().id(1L).merchantId("MCH-BAD").riskCategory("PROHIBITED").build();
        when(merchantRepository.findByMerchantId("MCH-BAD")).thenReturn(Optional.of(m));
        assertThatThrownBy(() -> service.activate("MCH-BAD"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("PROHIBITED");
    }
}
