package com.cbs.productfactory.islamic;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.productcatalog.entity.ProductCatalogEntry;
import com.cbs.productcatalog.repository.ProductCatalogEntryRepository;
import com.cbs.productfactory.entity.ProductTemplate;
import com.cbs.productfactory.islamic.dto.IslamicProductRequest;
import com.cbs.productfactory.islamic.entity.IslamicContractType;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.entity.IslamicProductVersion;
import com.cbs.productfactory.islamic.event.FatwaExpiredEvent;
import com.cbs.productfactory.islamic.repository.IslamicProductParameterRepository;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.productfactory.islamic.repository.IslamicProductVersionRepository;
import com.cbs.productfactory.islamic.service.IslamicContractTypeService;
import com.cbs.productfactory.islamic.service.IslamicProductService;
import com.cbs.productfactory.repository.ProductTemplateRepository;
import com.cbs.rulesengine.dto.DecisionResultResponse;
import com.cbs.rulesengine.repository.BusinessRuleRepository;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import com.cbs.segmentation.repository.CustomerSegmentRepository;
import com.cbs.shariah.dto.ReviewRequestResponse;
import com.cbs.shariah.entity.FatwaCategory;
import com.cbs.shariah.entity.FatwaRecord;
import com.cbs.shariah.entity.FatwaStatus;
import com.cbs.shariah.repository.FatwaRecordRepository;
import com.cbs.shariah.repository.SsbBoardMemberRepository;
import com.cbs.shariah.service.ShariahGovernanceService;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IslamicProductServiceTest {

    @Mock private IslamicProductTemplateRepository productRepository;
    @Mock private IslamicProductParameterRepository parameterRepository;
    @Mock private IslamicProductVersionRepository versionRepository;
    @Mock private IslamicContractTypeService contractTypeService;
    @Mock private ProductTemplateRepository productTemplateRepository;
    @Mock private ProductCatalogEntryRepository productCatalogEntryRepository;
    @Mock private FatwaRecordRepository fatwaRecordRepository;
    @Mock private SsbBoardMemberRepository ssbBoardMemberRepository;
    @Mock private ShariahGovernanceService shariahGovernanceService;
    @Mock private BusinessRuleRepository businessRuleRepository;
    @Mock private DecisionTableEvaluator decisionTableEvaluator;
    @Mock private CustomerRepository customerRepository;
    @Mock private CustomerSegmentRepository customerSegmentRepository;
    @Mock private CurrentActorProvider currentActorProvider;
    @Mock private CurrentTenantResolver currentTenantResolver;

    private IslamicProductService service;
    private final AtomicLong versionIds = new AtomicLong(100L);

    @BeforeEach
    void setUp() {
        service = new IslamicProductService(
                productRepository,
                parameterRepository,
                versionRepository,
                contractTypeService,
                productTemplateRepository,
                productCatalogEntryRepository,
                fatwaRecordRepository,
                ssbBoardMemberRepository,
                shariahGovernanceService,
                businessRuleRepository,
                decisionTableEvaluator,
                customerRepository,
                customerSegmentRepository,
                currentActorProvider,
                currentTenantResolver,
                new ObjectMapper().findAndRegisterModules()
        );

        lenient().when(currentTenantResolver.getCurrentTenantId()).thenReturn(1L);
        lenient().when(currentActorProvider.getCurrentActor()).thenReturn("maker");
        lenient().when(productRepository.save(any(IslamicProductTemplate.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(productTemplateRepository.save(any(ProductTemplate.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(productCatalogEntryRepository.save(any(ProductCatalogEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(productCatalogEntryRepository.findByProductCode(anyString())).thenReturn(Optional.empty());
        lenient().when(productTemplateRepository.findById(anyLong())).thenReturn(Optional.of(baseTemplate()));
        lenient().when(parameterRepository.findByProductTemplateIdOrderByParameterNameAsc(anyLong())).thenReturn(List.of());
        lenient().when(versionRepository.findFirstByProductTemplateIdOrderByVersionNumberDesc(anyLong())).thenReturn(Optional.empty());
        lenient().when(versionRepository.save(any(IslamicProductVersion.class))).thenAnswer(invocation -> {
            IslamicProductVersion version = invocation.getArgument(0);
            if (version.getId() == null) {
                version.setId(versionIds.incrementAndGet());
            }
            return version;
        });
        lenient().doNothing().when(contractTypeService).validateProductAgainstContractType(any(IslamicProductTemplate.class));
        lenient().doNothing().when(contractTypeService).validateProductAgainstContractType(any(IslamicProductRequest.class), any(IslamicContractType.class));
    }

    @Test
    @DisplayName("Activation is blocked when the product has no active fatwa")
    void activateProduct_rejectsMissingFatwa() {
        IslamicProductTemplate product = product(IslamicDomainEnums.IslamicProductStatus.APPROVED, null,
                IslamicDomainEnums.ShariahComplianceStatus.PENDING_FATWA);
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> service.activateProduct(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("cannot be activated without an active Fatwa");
    }

    @Test
    @DisplayName("Activation succeeds when an active fatwa is linked")
    void activateProduct_succeedsWithActiveFatwa() {
        IslamicProductTemplate product = product(IslamicDomainEnums.IslamicProductStatus.APPROVED, 5L,
                IslamicDomainEnums.ShariahComplianceStatus.FATWA_ISSUED);
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(fatwaRecordRepository.findById(5L)).thenReturn(Optional.of(activeFatwa(5L)));

        service.activateProduct(1L);

        assertThat(product.getStatus()).isEqualTo(IslamicDomainEnums.IslamicProductStatus.ACTIVE);
        assertThat(product.getShariahComplianceStatus()).isEqualTo(IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT);
        assertThat(product.getCurrentVersionId()).isNotNull();
        verify(versionRepository).save(any(IslamicProductVersion.class));
    }

    @Test
    @DisplayName("Material pricing changes trigger SSB review and suspend active products")
    void updateProduct_materialChangeTriggersReview() {
        IslamicProductTemplate product = product(IslamicDomainEnums.IslamicProductStatus.ACTIVE, 5L,
                IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT);
        product.setMarkupRate(new BigDecimal("10.00"));
        product.setCurrentVersionId(88L);
        product.setProductVersion(1);
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(versionRepository.findFirstByProductTemplateIdOrderByVersionNumberDesc(1L))
                .thenReturn(Optional.of(IslamicProductVersion.builder().id(88L).versionNumber(1).build()));
        when(ssbBoardMemberRepository.findByIsActiveTrueOrderByFullNameAsc()).thenReturn(List.of(
                com.cbs.shariah.entity.SsbBoardMember.builder().id(9L).fullName("Dr. Kareem").isActive(true).build()
        ));
        when(shariahGovernanceService.createReview(any(), eq("maker")))
                .thenReturn(ReviewRequestResponse.builder().id(77L).build());

        var response = service.updateProduct(1L, IslamicProductRequest.builder()
                .markupRate(new BigDecimal("12.50"))
                .changeDescription("Increase markup after portfolio repricing")
                .build());

        assertThat(response.getStatus()).isEqualTo(IslamicDomainEnums.IslamicProductStatus.SUSPENDED);
        assertThat(response.getShariahComplianceStatus()).isEqualTo(IslamicDomainEnums.ShariahComplianceStatus.PENDING_FATWA);
        assertThat(response.getActiveFatwaId()).isNull();
        verify(shariahGovernanceService).createReview(any(), eq("maker"));
    }

    @Test
    @DisplayName("Fatwa expiry automatically suspends active products")
    void onFatwaExpired_suspendsAffectedProducts() {
        IslamicProductTemplate product = product(IslamicDomainEnums.IslamicProductStatus.ACTIVE, 5L,
                IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT);
        when(productRepository.findByActiveFatwaId(5L)).thenReturn(List.of(product));

        service.onFatwaExpired(new FatwaExpiredEvent(5L, "FTW-2026-0001", LocalDate.now()));

        assertThat(product.getStatus()).isEqualTo(IslamicDomainEnums.IslamicProductStatus.SUSPENDED);
        assertThat(product.getShariahComplianceStatus()).isEqualTo(IslamicDomainEnums.ShariahComplianceStatus.NON_COMPLIANT);
        verify(versionRepository).save(any(IslamicProductVersion.class));
    }

    @Test
    @DisplayName("Applicable profit rate can be resolved from decision table output")
    void getApplicableProfitRate_usesDecisionTable() {
        IslamicProductTemplate product = product(IslamicDomainEnums.IslamicProductStatus.ACTIVE, 5L,
                IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT);
        product.setProfitRateDecisionTableCode("MURABAHA_PROFIT_RATE_TABLE");
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(decisionTableEvaluator.evaluateByRuleCode(eq("MURABAHA_PROFIT_RATE_TABLE"), anyMap()))
                .thenReturn(DecisionResultResponse.builder()
                        .matched(true)
                        .outputs(Map.of("profitRate", new BigDecimal("8.75")))
                        .build());

        BigDecimal rate = service.getApplicableProfitRate(1L, Map.of("tenorMonths", 24, "amount", new BigDecimal("500000")));

        assertThat(rate).isEqualByComparingTo("8.75");
    }

    private IslamicProductTemplate product(
            IslamicDomainEnums.IslamicProductStatus status,
            Long fatwaId,
            IslamicDomainEnums.ShariahComplianceStatus complianceStatus
    ) {
        return IslamicProductTemplate.builder()
                .id(1L)
                .baseProductId(100L)
                .productCode("MUR-FIN-001")
                .name("Murabaha Home Finance")
                .nameAr("مرابحة")
                .contractType(contractType())
                .productCategory(IslamicDomainEnums.IslamicProductCategory.FINANCING)
                .subCategory("HOME_FINANCE")
                .profitCalculationMethod(IslamicDomainEnums.ProfitCalculationMethod.COST_PLUS_MARKUP)
                .profitRateType(IslamicDomainEnums.ProfitRateType.FIXED)
                .markupRate(new BigDecimal("10.00"))
                .costPriceRequired(true)
                .sellingPriceImmutable(true)
                .latePenaltyToCharity(true)
                .charityGlAccountCode("GL-CHARITY")
                .fatwaRequired(true)
                .activeFatwaId(fatwaId)
                .shariahComplianceStatus(complianceStatus)
                .status(status)
                .effectiveFrom(LocalDate.now().minusDays(1))
                .minAmount(new BigDecimal("1000"))
                .maxAmount(new BigDecimal("1000000"))
                .minTenorMonths(6)
                .maxTenorMonths(60)
                .currencies(List.of("USD"))
                .eligibleCustomerTypes(List.of("INDIVIDUAL"))
                .eligibleSegments(List.of())
                .eligibleCountries(List.of("USA"))
                .financingAssetGl("GL-FIN-ASSET")
                .profitReceivableGl("GL-PROFIT-REC")
                .profitIncomeGl("GL-PROFIT-INC")
                .charityGl("GL-CHARITY")
                .tenantId(1L)
                .createdBy("maker")
                .build();
    }

    private IslamicContractType contractType() {
        return IslamicContractType.builder()
                .id(10L)
                .code("MURABAHA")
                .name("Murabaha")
                .nameAr("مرابحة")
                .category(IslamicDomainEnums.ContractCategory.SALE_BASED)
                .accountingTreatment(IslamicDomainEnums.AccountingTreatment.AMORTISED_COST)
                .status(IslamicDomainEnums.ContractTypeStatus.ACTIVE)
                .keyShariahPrinciples(List.of("Asset-backed financing"))
                .tenantId(1L)
                .build();
    }

    private FatwaRecord activeFatwa(Long id) {
        return FatwaRecord.builder()
                .id(id)
                .fatwaNumber("FTW-2026-0001")
                .fatwaTitle("Murabaha permissibility")
                .fatwaCategory(FatwaCategory.PRODUCT_APPROVAL)
                .subject("Murabaha financing")
                .status(FatwaStatus.ACTIVE)
                .applicableContractTypes(List.of("MURABAHA"))
                .effectiveDate(LocalDate.now().minusDays(30))
                .expiryDate(LocalDate.now().plusDays(90))
                .build();
    }

    private ProductTemplate baseTemplate() {
        return ProductTemplate.builder()
                .id(100L)
                .templateCode("MUR-FIN-001")
                .templateName("Murabaha Home Finance")
                .productCategory("PERSONAL_LOAN")
                .build();
    }
}