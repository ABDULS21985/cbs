package com.cbs.integration;

import com.cbs.common.exception.BusinessException;
import com.cbs.integration.entity.*;
import com.cbs.integration.repository.*;
import com.cbs.integration.service.MarketplaceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MarketplaceServiceTest {

    @Mock private MarketplaceApiProductRepository productRepository;
    @Mock private MarketplaceSubscriptionRepository subscriptionRepository;
    @Mock private MarketplaceUsageLogRepository usageLogRepository;
    @InjectMocks private MarketplaceService marketplaceService;

    @Test
    @DisplayName("DRAFT product can be published")
    void publishDraft() {
        MarketplaceApiProduct product = MarketplaceApiProduct.builder().id(1L)
                .productCode("ACCT-API").status("DRAFT").build();
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MarketplaceApiProduct result = marketplaceService.publishProduct(1L);
        assertThat(result.getStatus()).isEqualTo("PUBLISHED");
        assertThat(result.getPublishedAt()).isNotNull();
    }

    @Test
    @DisplayName("Subscription to published product with auto-approval creates ACTIVE subscription")
    void subscribeAutoApproval() {
        MarketplaceApiProduct product = MarketplaceApiProduct.builder().id(1L)
                .productCode("PAY-API").status("PUBLISHED").requiresApproval(false).build();
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(subscriptionRepository.save(any())).thenAnswer(inv -> { MarketplaceSubscription s = inv.getArgument(0); s.setId(1L); return s; });

        MarketplaceSubscription result = marketplaceService.subscribe(1L, "Fintech Corp", "dev@fintech.com", "PREMIUM");
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
        assertThat(result.getMonthlyCallLimit()).isEqualTo(100000);
        assertThat(result.getSubscriptionId()).startsWith("SUB-");
    }

    @Test
    @DisplayName("Usage exceeding monthly limit is rejected")
    void callLimitExceeded() {
        MarketplaceSubscription sub = MarketplaceSubscription.builder().id(1L)
                .subscriptionId("SUB-LIMIT").status("ACTIVE")
                .monthlyCallLimit(100).callsThisMonth(100).build();
        when(subscriptionRepository.findById(1L)).thenReturn(Optional.of(sub));

        assertThatThrownBy(() -> marketplaceService.recordUsage(1L, "/accounts", "GET", 200, 50, "1.2.3.4"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("limit exceeded");
    }

    @Test
    @DisplayName("Cannot subscribe to non-published product")
    void subscribeToUnpublished() {
        MarketplaceApiProduct draft = MarketplaceApiProduct.builder().id(1L).status("DRAFT").build();
        when(productRepository.findById(1L)).thenReturn(Optional.of(draft));

        assertThatThrownBy(() -> marketplaceService.subscribe(1L, "Test", null, "STANDARD"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("non-published");
    }
}
