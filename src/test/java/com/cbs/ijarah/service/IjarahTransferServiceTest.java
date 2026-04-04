package com.cbs.ijarah.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.ijarah.dto.IjarahRequests;
import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.ijarah.repository.IjarahGradualTransferUnitRepository;
import com.cbs.ijarah.repository.IjarahRentalInstallmentRepository;
import com.cbs.ijarah.repository.IjarahTransferMechanismRepository;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IjarahTransferServiceTest {

    @Mock private IjarahContractRepository contractRepository;
    @Mock private IjarahTransferMechanismRepository transferRepository;
    @Mock private IjarahGradualTransferUnitRepository unitRepository;
    @Mock private IjarahRentalInstallmentRepository installmentRepository;
    @Mock private IjarahAssetService assetService;
    @Mock private IslamicPostingRuleService postingRuleService;
    @Mock private PoolAssetManagementService poolAssetManagementService;

    @InjectMocks
    private IjarahTransferService service;

    @Test
    void createTransferMechanism_withoutSeparateDocument_rejected() {
        IjarahContract contract = IjarahContract.builder()
                .id(1L)
                .contractRef("IJR-FIN-2026-000001")
                .customerId(2L)
                .tenantId(1L)
                .ijarahType(IjarahDomainEnums.IjarahType.IJARAH_MUNTAHIA_BITTAMLEEK)
                .build();
        when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));

        IjarahRequests.CreateTransferMechanismRequest request = IjarahRequests.CreateTransferMechanismRequest.builder()
                .transferType(IjarahDomainEnums.TransferType.GIFT_HIBAH)
                .isSeparateDocument(false)
                .documentReference("IJR-FIN-2026-000001")
                .documentDate(java.time.LocalDate.now())
                .documentType(IjarahDomainEnums.TransferDocumentType.WAAD_PROMISE)
                .build();

        assertThatThrownBy(() -> service.createTransferMechanism(1L, request))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("SHARIAH-IJR-004");
    }
}
