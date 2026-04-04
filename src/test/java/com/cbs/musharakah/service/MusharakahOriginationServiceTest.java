package com.cbs.musharakah.service;

import com.cbs.account.entity.Product;
import com.cbs.account.repository.ProductRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.repository.CustomerIdentificationRepository;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.musharakah.dto.MusharakahRequests;
import com.cbs.musharakah.dto.MusharakahResponses;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.repository.MusharakahApplicationRepository;
import com.cbs.musharakah.repository.MusharakahContractRepository;
import com.cbs.productfactory.islamic.entity.IslamicContractType;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import com.cbs.tenant.service.CurrentTenantResolver;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MusharakahOriginationServiceTest {

    @Mock private MusharakahApplicationRepository applicationRepository;
    @Mock private MusharakahContractRepository contractRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private CustomerIdentificationRepository customerIdentificationRepository;
    @Mock private ProductRepository productRepository;
    @Mock private IslamicProductTemplateRepository islamicProductTemplateRepository;
    @Mock private DecisionTableEvaluator decisionTableEvaluator;
    @Mock private CurrentTenantResolver currentTenantResolver;
    @Mock private CurrentActorProvider actorProvider;

    @InjectMocks
    private MusharakahOriginationService service;

    @Test
    void createApplication_withVerifiedKyc_calculatesDiminishingPayment() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(activeCustomer()));
        when(customerIdentificationRepository.findVerifiedByCustomerId(1L))
                .thenReturn(List.of(com.cbs.customer.entity.CustomerIdentification.builder().id(77L).build()));
        when(islamicProductTemplateRepository.findByProductCodeIgnoreCase("MSH-HOME-SAR-001"))
                .thenReturn(Optional.of(activeMusharakahProduct()));
        when(productRepository.findByCode("MSH-HOME-SAR-001"))
                .thenReturn(Optional.of(Product.builder().code("MSH-HOME-SAR-001").build()));
        when(currentTenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(applicationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        MusharakahRequests.CreateApplicationRequest request = MusharakahRequests.CreateApplicationRequest.builder()
                .customerId(1L)
                .productCode("MSH-HOME-SAR-001")
                .musharakahType(MusharakahDomainEnums.MusharakahType.DIMINISHING_MUSHARAKAH)
                .requestedFinancingAmount(new BigDecimal("800000.00"))
                .customerEquityAmount(new BigDecimal("200000.00"))
                .totalPropertyValue(new BigDecimal("1000000.00"))
                .currencyCode("SAR")
                .requestedTenorMonths(240)
                .assetDescription("Residential villa")
                .assetCategory(MusharakahDomainEnums.AssetCategory.RESIDENTIAL_PROPERTY)
                .monthlyIncome(new BigDecimal("25000.00"))
                .existingObligations(new BigDecimal("2000.00"))
                .build();

        MusharakahResponses.MusharakahApplicationResponse response = service.createApplication(request);

        assertThat(response.getProposedBankPercentage()).isEqualByComparingTo("80.0000");
        assertThat(response.getProposedCustomerPercentage()).isEqualByComparingTo("20.0000");
        assertThat(response.getProposedRentalRate()).isEqualByComparingTo("5.5000");
        assertThat(response.getEstimatedMonthlyPayment()).isEqualByComparingTo("6999.67");
        assertThat(response.getDsr()).isEqualByComparingTo("35.9987");
        assertThat(response.getStatus()).isEqualTo(MusharakahDomainEnums.ApplicationStatus.DRAFT);
    }

    @Test
    void createApplication_withCapitalOverfinancing_rejected() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(activeCustomer()));
        when(customerIdentificationRepository.findVerifiedByCustomerId(1L))
                .thenReturn(List.of(com.cbs.customer.entity.CustomerIdentification.builder().id(77L).build()));
        when(islamicProductTemplateRepository.findByProductCodeIgnoreCase("MSH-HOME-SAR-001"))
                .thenReturn(Optional.of(activeMusharakahProduct()));
        when(productRepository.findByCode("MSH-HOME-SAR-001"))
                .thenReturn(Optional.of(Product.builder().code("MSH-HOME-SAR-001").build()));

        MusharakahRequests.CreateApplicationRequest request = MusharakahRequests.CreateApplicationRequest.builder()
                .customerId(1L)
                .productCode("MSH-HOME-SAR-001")
                .musharakahType(MusharakahDomainEnums.MusharakahType.DIMINISHING_MUSHARAKAH)
                .requestedFinancingAmount(new BigDecimal("850000.00"))
                .customerEquityAmount(new BigDecimal("200000.00"))
                .totalPropertyValue(new BigDecimal("1000000.00"))
                .currencyCode("SAR")
                .requestedTenorMonths(240)
                .assetDescription("Residential villa")
                .assetCategory(MusharakahDomainEnums.AssetCategory.RESIDENTIAL_PROPERTY)
                .build();

        assertThatThrownBy(() -> service.createApplication(request))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("INVALID_CAPITAL_CONSERVATION");
    }

    private Customer activeCustomer() {
        return Customer.builder()
                .id(1L)
                .customerType(CustomerType.INDIVIDUAL)
                .status(CustomerStatus.ACTIVE)
                .firstName("Amina")
                .lastName("Saleh")
                .build();
    }

    private IslamicProductTemplate activeMusharakahProduct() {
        return IslamicProductTemplate.builder()
                .id(10L)
                .productCode("MSH-HOME-SAR-001")
                .contractType(IslamicContractType.builder().code("MUSHARAKAH").build())
                .status(IslamicDomainEnums.IslamicProductStatus.ACTIVE)
                .shariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT)
                .baseRate(new BigDecimal("4.0000"))
                .margin(new BigDecimal("1.5000"))
                .customerSharePercentage(new BigDecimal("20.0000"))
                .diminishingUnitsTotal(100)
                .minAmount(new BigDecimal("200000.00"))
                .maxAmount(new BigDecimal("5000000.00"))
                .minTenorMonths(60)
                .maxTenorMonths(300)
                .build();
    }
}
