package com.cbs.productfactory;

import com.cbs.common.exception.BusinessException;
import com.cbs.productfactory.entity.ProductTemplate;
import com.cbs.productfactory.repository.ProductTemplateRepository;
import com.cbs.productfactory.service.ProductFactoryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductFactoryServiceTest {

    @Mock private ProductTemplateRepository templateRepository;
    @InjectMocks private ProductFactoryService productFactoryService;

    @Test
    @DisplayName("Full lifecycle: DRAFT → PENDING → APPROVED → ACTIVE")
    void fullLifecycle() {
        ProductTemplate template = ProductTemplate.builder().id(1L).templateCode("SAV-PREMIUM")
                .templateName("Premium Savings").productCategory("SAVINGS")
                .interestConfig(Map.of("base_rate", 5.0, "tiered", true))
                .feeConfig(Map.of("monthly_fee", 10.00))
                .templateVersion(1).status("DRAFT").build();

        when(templateRepository.findById(1L)).thenReturn(Optional.of(template));
        when(templateRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Submit
        ProductTemplate submitted = productFactoryService.submitForApproval(1L);
        assertThat(submitted.getStatus()).isEqualTo("PENDING_APPROVAL");

        // Approve
        ProductTemplate approved = productFactoryService.approveTemplate(1L, "product_mgr");
        assertThat(approved.getStatus()).isEqualTo("APPROVED");
        assertThat(approved.getApprovedBy()).isEqualTo("product_mgr");

        // Activate
        ProductTemplate active = productFactoryService.activateTemplate(1L);
        assertThat(active.getStatus()).isEqualTo("ACTIVE");
        assertThat(active.getActivatedAt()).isNotNull();
    }

    @Test
    @DisplayName("Cannot activate unapproved template")
    void cannotActivateUnapproved() {
        ProductTemplate draft = ProductTemplate.builder().id(2L).status("DRAFT").build();
        when(templateRepository.findById(2L)).thenReturn(Optional.of(draft));

        assertThatThrownBy(() -> productFactoryService.activateTemplate(2L))
                .isInstanceOf(BusinessException.class).hasMessageContaining("APPROVED");
    }

    @Test
    @DisplayName("New version clones template with incremented version")
    void createNewVersion() {
        ProductTemplate v1 = ProductTemplate.builder().id(1L).templateCode("SAV-PREMIUM")
                .templateName("Premium Savings").productCategory("SAVINGS")
                .interestConfig(Map.of("base_rate", 5.0)).feeConfig(Map.of("monthly_fee", 10.00))
                .templateVersion(1).status("ACTIVE").build();

        when(templateRepository.findById(1L)).thenReturn(Optional.of(v1));
        when(templateRepository.save(any())).thenAnswer(inv -> { ProductTemplate t = inv.getArgument(0); t.setId(2L); return t; });

        ProductTemplate v2 = productFactoryService.createNewVersion(1L);

        assertThat(v2.getTemplateVersion()).isEqualTo(2);
        assertThat(v2.getParentTemplateId()).isEqualTo(1L);
        assertThat(v2.getStatus()).isEqualTo("DRAFT");
        assertThat(v2.getInterestConfig()).containsEntry("base_rate", 5.0);
    }
}
