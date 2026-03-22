package com.cbs.promotion;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.promotion.entity.PromotionalEvent;
import com.cbs.promotion.repository.PromotionalEventRepository;
import com.cbs.promotion.service.PromotionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PromotionServiceTest {

    @Mock private PromotionalEventRepository repository;
    @InjectMocks private PromotionService service;

    private PromotionalEvent buildPromo(String code, String status) {
        return PromotionalEvent.builder()
                .id(1L)
                .eventCode("EVT-" + code)
                .eventName("Test Promo")
                .eventType("SEASONAL")
                .promoCode(code)
                .discountType("PERCENTAGE")
                .discountValue(BigDecimal.TEN)
                .maxRedemptions(100)
                .currentRedemptions(0)
                .status(status)
                .startDate(java.time.LocalDate.now().minusDays(7))
                .endDate(java.time.LocalDate.now().plusDays(30))
                .budgetAmount(BigDecimal.valueOf(500000))
                .spentAmount(BigDecimal.ZERO)
                .build();
    }

    @Test
    @DisplayName("getActivePromotions returns promotions within date range")
    void getActive_ReturnsDateFiltered() {
        when(repository.findByStatusAndStartDateBeforeAndEndDateAfter(eq("ACTIVE"), any(), any()))
                .thenReturn(List.of(buildPromo("SPRING10", "ACTIVE")));

        List<PromotionalEvent> result = service.getActivePromotions();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getPromoCode()).isEqualTo("SPRING10");
    }

    @Test
    @DisplayName("getByEventType returns promotions by type")
    void getByType_ReturnsFiltered() {
        when(repository.findByEventType("SEASONAL")).thenReturn(List.of(buildPromo("SUMMER", "ACTIVE")));
        List<PromotionalEvent> result = service.getByEventType("SEASONAL");
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("activate changes DRAFT promotion to ACTIVE")
    void activate_DraftToActive() {
        PromotionalEvent promo = buildPromo("NEW10", "DRAFT");
        when(repository.findByPromoCode("NEW10")).thenReturn(Optional.of(promo));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PromotionalEvent result = service.activate("NEW10");
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
        verify(repository).save(promo);
    }

    @Test
    @DisplayName("activate changes PAUSED promotion to ACTIVE")
    void activate_PausedToActive() {
        PromotionalEvent promo = buildPromo("RESUME10", "PAUSED");
        when(repository.findByPromoCode("RESUME10")).thenReturn(Optional.of(promo));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PromotionalEvent result = service.activate("RESUME10");
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("activate rejects COMPLETED promotion")
    void activate_RejectsCompleted() {
        PromotionalEvent promo = buildPromo("DONE10", "COMPLETED");
        when(repository.findByPromoCode("DONE10")).thenReturn(Optional.of(promo));

        assertThatThrownBy(() -> service.activate("DONE10"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("DRAFT or PAUSED");
    }

    @Test
    @DisplayName("redeem increments redemption count")
    void redeem_IncrementsCount() {
        PromotionalEvent promo = buildPromo("SALE10", "ACTIVE");
        promo.setCurrentRedemptions(5);
        when(repository.findByPromoCode("SALE10")).thenReturn(Optional.of(promo));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PromotionalEvent result = service.redeem("SALE10");
        assertThat(result.getCurrentRedemptions()).isEqualTo(6);
    }

    @Test
    @DisplayName("redeem rejects non-ACTIVE promotion")
    void redeem_RejectsInactive() {
        PromotionalEvent promo = buildPromo("DRAFT10", "DRAFT");
        when(repository.findByPromoCode("DRAFT10")).thenReturn(Optional.of(promo));

        assertThatThrownBy(() -> service.redeem("DRAFT10"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("ACTIVE");
    }

    @Test
    @DisplayName("redeem rejects expired promotion")
    void redeem_RejectsExpired() {
        PromotionalEvent promo = buildPromo("OLD10", "ACTIVE");
        promo.setEndDate(java.time.LocalDate.now().minusDays(1));
        when(repository.findByPromoCode("OLD10")).thenReturn(Optional.of(promo));

        assertThatThrownBy(() -> service.redeem("OLD10"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("expired");
    }

    @Test
    @DisplayName("redeem rejects maxed-out promotion")
    void redeem_RejectsMaxedOut() {
        PromotionalEvent promo = buildPromo("MAX10", "ACTIVE");
        promo.setMaxRedemptions(10);
        promo.setCurrentRedemptions(10);
        when(repository.findByPromoCode("MAX10")).thenReturn(Optional.of(promo));

        assertThatThrownBy(() -> service.redeem("MAX10"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("maximum redemptions");
    }

    @Test
    @DisplayName("findByPromoCode throws ResourceNotFoundException for unknown code")
    void findByPromoCode_ThrowsNotFound() {
        when(repository.findByPromoCode("UNKNOWN")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findByPromoCode("UNKNOWN"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
