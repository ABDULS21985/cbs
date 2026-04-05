package com.cbs.merchant;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.merchant.entity.MerchantProfile;
import com.cbs.merchant.repository.MerchantProfileRepository;
import com.cbs.merchant.service.MerchantService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MerchantServiceTest {

    @Mock private MerchantProfileRepository merchantRepository;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private MerchantService service;

    @Nested
    @DisplayName("Merchant Onboarding")
    class OnboardingTests {

        @Test
        @DisplayName("Onboarding sets PENDING status and generates MCH- prefixed ID")
        void onboard() {
            when(merchantRepository.save(any())).thenAnswer(inv -> {
                MerchantProfile m = inv.getArgument(0);
                m.setId(1L);
                return m;
            });

            MerchantProfile m = MerchantProfile.builder()
                    .merchantName("Coffee Shop")
                    .merchantCategoryCode("5812")
                    .businessType("SOLE_PROPRIETOR")
                    .mdrRate(new BigDecimal("1.500"))
                    .build();

            MerchantProfile result = service.onboard(m);

            assertThat(result.getMerchantId()).startsWith("MCH-");
            assertThat(result.getMerchantId()).hasSize(14); // "MCH-" + 10 chars
            assertThat(result.getStatus()).isEqualTo("PENDING");
            verify(merchantRepository).save(any());
        }

        @Test
        @DisplayName("Each onboarding generates unique merchant ID")
        void onboardGeneratesUniqueIds() {
            when(merchantRepository.save(any())).thenAnswer(inv -> {
                MerchantProfile m = inv.getArgument(0);
                m.setId(1L);
                return m;
            });

            MerchantProfile m1 = service.onboard(MerchantProfile.builder()
                    .merchantName("Shop A").merchantCategoryCode("5411")
                    .businessType("LIMITED_COMPANY").mdrRate(BigDecimal.ONE).build());
            MerchantProfile m2 = service.onboard(MerchantProfile.builder()
                    .merchantName("Shop B").merchantCategoryCode("5411")
                    .businessType("LIMITED_COMPANY").mdrRate(BigDecimal.ONE).build());

            assertThat(m1.getMerchantId()).isNotEqualTo(m2.getMerchantId());
        }
    }

    @Nested
    @DisplayName("Merchant Activation")
    class ActivationTests {

        @Test
        @DisplayName("Activation sets ACTIVE status and timestamps")
        void activateSetsActiveStatus() {
            MerchantProfile m = MerchantProfile.builder()
                    .id(1L).merchantId("MCH-GOOD123456")
                    .riskCategory("LOW").status("PENDING")
                    .build();

            when(merchantRepository.findByMerchantId("MCH-GOOD123456")).thenReturn(Optional.of(m));
            when(merchantRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            MerchantProfile result = service.activate("MCH-GOOD123456");

            assertThat(result.getStatus()).isEqualTo("ACTIVE");
            assertThat(result.getOnboardedAt()).isNotNull();
            assertThat(result.getUpdatedAt()).isNotNull();
        }

        @Test
        @DisplayName("Cannot activate PROHIBITED merchant")
        void prohibitedActivation() {
            MerchantProfile m = MerchantProfile.builder()
                    .id(1L).merchantId("MCH-BAD0000000")
                    .riskCategory("PROHIBITED").build();

            when(merchantRepository.findByMerchantId("MCH-BAD0000000")).thenReturn(Optional.of(m));

            assertThatThrownBy(() -> service.activate("MCH-BAD0000000"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("PROHIBITED");
        }

        @Test
        @DisplayName("Activation throws when merchant not found")
        void activateThrowsNotFound() {
            when(merchantRepository.findByMerchantId("MCH-NONEXIST00")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.activate("MCH-NONEXIST00"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Merchant Suspension")
    class SuspensionTests {

        @Test
        @DisplayName("Suspension sets SUSPENDED status")
        void suspendSetsSuspendedStatus() {
            MerchantProfile m = MerchantProfile.builder()
                    .id(1L).merchantId("MCH-ACTIVE1234")
                    .status("ACTIVE").riskCategory("LOW")
                    .build();

            when(merchantRepository.findByMerchantId("MCH-ACTIVE1234")).thenReturn(Optional.of(m));
            when(merchantRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            MerchantProfile result = service.suspend("MCH-ACTIVE1234", "Compliance violation");

            assertThat(result.getStatus()).isEqualTo("SUSPENDED");
        }

        @Test
        @DisplayName("Suspension throws when merchant not found")
        void suspendThrowsNotFound() {
            when(merchantRepository.findByMerchantId("MCH-NONEXIST00")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.suspend("MCH-NONEXIST00", "reason"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Merchant Queries")
    class QueryTests {

        @Test
        @DisplayName("getActive returns merchants with ACTIVE status")
        void getActiveReturnsActiveOnly() {
            MerchantProfile active = MerchantProfile.builder()
                    .id(1L).merchantId("MCH-A").status("ACTIVE").build();

            when(merchantRepository.findByStatusOrderByMerchantNameAsc("ACTIVE"))
                    .thenReturn(List.of(active));

            List<MerchantProfile> result = service.getActive();

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getStatus()).isEqualTo("ACTIVE");
        }

        @Test
        @DisplayName("getHighRisk returns HIGH risk merchants sorted by chargeback rate")
        void getHighRiskReturnsHighRiskSorted() {
            MerchantProfile m1 = MerchantProfile.builder()
                    .id(1L).riskCategory("HIGH").chargebackRate(new BigDecimal("5.0")).build();
            MerchantProfile m2 = MerchantProfile.builder()
                    .id(2L).riskCategory("HIGH").chargebackRate(new BigDecimal("3.0")).build();

            when(merchantRepository.findByRiskCategoryOrderByChargebackRateDesc("HIGH"))
                    .thenReturn(List.of(m1, m2));

            List<MerchantProfile> result = service.getHighRisk();

            assertThat(result).hasSize(2);
            assertThat(result.get(0).getChargebackRate())
                    .isGreaterThan(result.get(1).getChargebackRate());
        }
    }
}
