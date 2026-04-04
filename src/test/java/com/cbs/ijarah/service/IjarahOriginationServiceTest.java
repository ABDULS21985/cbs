package com.cbs.ijarah.service;

import com.cbs.account.entity.Product;
import com.cbs.account.repository.ProductRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.repository.CustomerIdentificationRepository;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.ijarah.dto.IjarahRequests;
import com.cbs.ijarah.dto.IjarahResponses;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.repository.IjarahApplicationRepository;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.productfactory.islamic.entity.IslamicContractType;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
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
class IjarahOriginationServiceTest {

    @Mock private IjarahApplicationRepository applicationRepository;
    @Mock private IjarahContractRepository contractRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private CustomerIdentificationRepository customerIdentificationRepository;
    @Mock private ProductRepository productRepository;
    @Mock private IslamicProductTemplateRepository islamicProductTemplateRepository;
    @Mock private CurrentTenantResolver currentTenantResolver;
    @Mock private CurrentActorProvider actorProvider;

    @InjectMocks
    private IjarahOriginationService service;

    @Test
    void createApplication_withVerifiedKyc_calculatesRental() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(activeCustomer()));
        when(customerIdentificationRepository.findVerifiedByCustomerId(1L))
                .thenReturn(List.of(com.cbs.customer.entity.CustomerIdentification.builder().id(99L).build()));
        when(islamicProductTemplateRepository.findByProductCodeIgnoreCase("IJR-VEH-SAR-001"))
                .thenReturn(Optional.of(activeIjarahProduct()));
        when(productRepository.findByCode("IJR-VEH-SAR-001"))
                .thenReturn(Optional.of(Product.builder().code("IJR-VEH-SAR-001").build()));
        when(currentTenantResolver.getCurrentTenantId()).thenReturn(1L);
        when(applicationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        IjarahRequests.CreateApplicationRequest request = new IjarahRequests.CreateApplicationRequest();
        request.setCustomerId(1L);
        request.setProductCode("IJR-VEH-SAR-001");
        request.setIjarahType(IjarahDomainEnums.IjarahType.OPERATING_IJARAH);
        request.setRequestedAssetDescription("Toyota Hilux");
        request.setRequestedAssetCategory(IjarahDomainEnums.AssetCategory.VEHICLE);
        request.setEstimatedAssetCost(new BigDecimal("100000.00"));
        request.setRequestedTenorMonths(12);
        request.setCurrencyCode("SAR");
        request.setMonthlyIncome(new BigDecimal("50000.00"));
        request.setExistingObligations(new BigDecimal("5000.00"));

        IjarahResponses.IjarahApplicationResponse response = service.createApplication(request);

        assertThat(response.getProposedRentalAmount()).isEqualByComparingTo("9166.67");
        assertThat(response.getDsrWithProposedRental()).isEqualByComparingTo("28.3333");
        assertThat(response.getStatus()).isEqualTo(IjarahDomainEnums.ApplicationStatus.DRAFT);
    }

    @Test
    void createApplication_withoutVerifiedKyc_rejected() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(activeCustomer()));
        when(customerIdentificationRepository.findVerifiedByCustomerId(1L)).thenReturn(List.of());

        IjarahRequests.CreateApplicationRequest request = new IjarahRequests.CreateApplicationRequest();
        request.setCustomerId(1L);
        request.setProductCode("IJR-VEH-SAR-001");
        request.setIjarahType(IjarahDomainEnums.IjarahType.OPERATING_IJARAH);
        request.setRequestedAssetDescription("Toyota Hilux");
        request.setRequestedAssetCategory(IjarahDomainEnums.AssetCategory.VEHICLE);
        request.setEstimatedAssetCost(new BigDecimal("100000.00"));
        request.setRequestedTenorMonths(12);
        request.setCurrencyCode("SAR");

        assertThatThrownBy(() -> service.createApplication(request))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("KYC_NOT_VERIFIED");
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

    private IslamicProductTemplate activeIjarahProduct() {
        return IslamicProductTemplate.builder()
                .id(10L)
                .productCode("IJR-VEH-SAR-001")
                .contractType(IslamicContractType.builder().code("IJARAH").build())
                .status(IslamicDomainEnums.IslamicProductStatus.ACTIVE)
                .shariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT)
                .minAmount(new BigDecimal("30000.00"))
                .maxAmount(new BigDecimal("500000.00"))
                .minTenorMonths(12)
                .maxTenorMonths(60)
                .build();
    }
}
