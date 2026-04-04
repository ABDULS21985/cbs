package com.cbs.murabaha.service;

import com.cbs.account.entity.Product;
import com.cbs.account.entity.ProductCategory;
import com.cbs.account.repository.ProductRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.repository.CustomerIdentificationRepository;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.murabaha.dto.CreateMurabahaApplicationRequest;
import com.cbs.murabaha.dto.MurabahaApplicationResponse;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.murabaha.repository.MurabahaApplicationRepository;
import com.cbs.murabaha.repository.MurabahaContractRepository;
import com.cbs.productfactory.islamic.entity.IslamicContractType;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import com.cbs.tenant.service.CurrentTenantResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MurabahaOriginationServiceTest {

    @Mock
    private MurabahaApplicationRepository applicationRepository;
    @Mock
    private MurabahaContractRepository contractRepository;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private CustomerIdentificationRepository customerIdentificationRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private IslamicProductTemplateRepository islamicProductTemplateRepository;
    @Mock
    private DecisionTableEvaluator decisionTableEvaluator;
    @Mock
    private CurrentTenantResolver currentTenantResolver;
    @Mock
    private CurrentActorProvider actorProvider;

    @InjectMocks
    private MurabahaOriginationService service;

    private Customer customer;
    private IslamicProductTemplate murabahaProduct;

    @BeforeEach
    void setUp() {
        customer = Customer.builder()
                .id(1L)
                .customerType(CustomerType.INDIVIDUAL)
                .status(CustomerStatus.ACTIVE)
                .firstName("Aisha")
                .lastName("Khan")
                .build();

        murabahaProduct = IslamicProductTemplate.builder()
                .id(10L)
                .productCode("MRB-COMM-SAR-001")
                .contractType(IslamicContractType.builder().code("MURABAHA").build())
                .status(IslamicDomainEnums.IslamicProductStatus.ACTIVE)
                .shariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT)
                .markupRate(new BigDecimal("15.00"))
                .gracePeriodDays(5)
                .build();
    }

    @Test
    void createApplication_withValidData_calculatesSellingPrice() {
        CreateMurabahaApplicationRequest request = CreateMurabahaApplicationRequest.builder()
                .customerId(1L)
                .productCode("MRB-COMM-SAR-001")
                .murabahahType(MurabahaDomainEnums.MurabahahType.COMMODITY_MURABAHA)
                .requestedAmount(new BigDecimal("100000.00"))
                .currencyCode("SAR")
                .requestedTenorMonths(12)
                .purpose(MurabahaDomainEnums.Purpose.PERSONAL)
                .monthlyIncome(new BigDecimal("50000.00"))
                .existingFinancingObligations(new BigDecimal("5000.00"))
                .proposedCostPrice(new BigDecimal("100000.00"))
                .proposedDownPayment(BigDecimal.ZERO)
                .channel(MurabahaDomainEnums.ApplicationChannel.BRANCH)
                .build();

        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(customerIdentificationRepository.findVerifiedByCustomerId(1L)).thenReturn(List.of());
        when(islamicProductTemplateRepository.findByProductCodeIgnoreCase("MRB-COMM-SAR-001"))
                .thenReturn(Optional.of(murabahaProduct));
        when(productRepository.findByCode("MRB-COMM-SAR-001"))
                .thenReturn(Optional.of(Product.builder().code("MRB-COMM-SAR-001").productCategory(ProductCategory.PERSONAL_LOAN).build()));
        when(currentTenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(applicationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        // KYC repo returns empty list if no verified IDs; populate one verified stub instead.
        when(customerIdentificationRepository.findVerifiedByCustomerId(1L)).thenReturn(List.of(
                com.cbs.customer.entity.CustomerIdentification.builder().id(100L).build()
        ));

        MurabahaApplicationResponse response = service.createApplication(request);

        assertNotNull(response);
        assertEquals(0, new BigDecimal("115000.00").compareTo(response.getProposedSellingPrice()));
        assertEquals(0, new BigDecimal("9583.33").compareTo(response.getProposedInstallmentAmount()));
    }
}
