package com.cbs.ijarah.service;

import com.cbs.account.repository.ProductRepository;
import com.cbs.account.service.AccountService;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.ijarah.dto.IjarahRequests;
import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.entity.IjarahAsset;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.ijarah.repository.IjarahRentalInstallmentRepository;
import com.cbs.ijarah.repository.IjarahTransferMechanismRepository;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import com.cbs.shariahcompliance.service.ShariahScreeningService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IjarahContractServiceTest {

    @Mock private IjarahContractRepository contractRepository;
    @Mock private IjarahTransferMechanismRepository transferRepository;
    @Mock private IjarahRentalInstallmentRepository installmentRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private ProductRepository productRepository;
    @Mock private IslamicProductTemplateRepository islamicProductTemplateRepository;
    @Mock private AccountService accountService;
    @Mock private IjarahAssetService assetService;
    @Mock private IjarahRentalService rentalService;
    @Mock private IjarahTransferService transferService;
    @Mock private IslamicPostingRuleService postingRuleService;
    @Mock private PoolAssetManagementService poolAssetManagementService;
    @Mock private ShariahScreeningService shariahScreeningService;

    @InjectMocks
    private IjarahContractService service;

    @Test
    void executeContract_withoutBankOwnership_rejected() {
        IjarahContract contract = IjarahContract.builder()
                .id(1L)
                .contractRef("IJR-FIN-2026-000001")
                .ijarahType(IjarahDomainEnums.IjarahType.OPERATING_IJARAH)
                .assetOwnedByBank(false)
                .assetAcquisitionCost(new BigDecimal("100000.00"))
                .status(IjarahDomainEnums.ContractStatus.DRAFT)
                .build();
        when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> service.executeContract(1L, "officer"))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("SHARIAH-IJR-001");
    }

    @Test
    void executeContract_withoutInsurance_rejected() {
        IjarahContract contract = IjarahContract.builder()
                .id(1L)
                .contractRef("IJR-FIN-2026-000001")
                .ijarahType(IjarahDomainEnums.IjarahType.OPERATING_IJARAH)
                .assetOwnedByBank(true)
                .ijarahAssetId(10L)
                .assetAcquisitionCost(new BigDecimal("100000.00"))
                .status(IjarahDomainEnums.ContractStatus.ASSET_OWNED)
                .build();
        when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> service.executeContract(1L, "officer"))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("MISSING_IJARAH_INSURANCE");
    }

    @Test
    void confirmAssetOwnership_usesSupplierDetailsFromRequest() {
        IjarahContract contract = IjarahContract.builder()
                .id(1L)
                .contractRef("IJR-FIN-2026-000001")
                .assetCategory(IjarahDomainEnums.AssetCategory.VEHICLE)
                .assetDescription("Toyota Prado")
                .assetAcquisitionCost(new BigDecimal("150000.00"))
                .currencyCode("SAR")
                .status(IjarahDomainEnums.ContractStatus.ASSET_PROCUREMENT)
                .build();
        when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(assetService.registerAsset(any())).thenReturn(IjarahAsset.builder().id(10L).build());
        when(postingRuleService.postIslamicTransaction(any()))
                .thenReturn(com.cbs.gl.entity.JournalEntry.builder().journalNumber("JRN-1").build());

        IjarahRequests.AssetOwnershipConfirmationRequest request = new IjarahRequests.AssetOwnershipConfirmationRequest();
        request.setRegisteredOwner("Bank Legal Name");
        request.setOwnershipEvidenceRef("OWN-1");
        request.setSupplierName("Vehicle World LLC");
        request.setSupplierInvoiceRef("INV-778");

        service.confirmAssetOwnership(1L, request);

        org.mockito.ArgumentCaptor<IjarahRequests.RegisterAssetRequest> captor =
                org.mockito.ArgumentCaptor.forClass(IjarahRequests.RegisterAssetRequest.class);
        verify(assetService).registerAsset(captor.capture());
        IjarahRequests.RegisterAssetRequest captured = captor.getValue();
        org.assertj.core.api.Assertions.assertThat(captured.getSupplierName()).isEqualTo("Vehicle World LLC");
        org.assertj.core.api.Assertions.assertThat(captured.getSupplierInvoiceRef()).isEqualTo("INV-778");
    }
}
