package com.cbs.ijarah.service;

import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.ijarah.dto.IjarahRequests;
import com.cbs.ijarah.entity.IjarahAsset;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.repository.IjarahAssetMaintenanceRecordRepository;
import com.cbs.ijarah.repository.IjarahAssetRepository;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IjarahAssetServiceTest {

    @Mock private IjarahAssetRepository assetRepository;
    @Mock private IjarahAssetMaintenanceRecordRepository maintenanceRecordRepository;
    @Mock private IjarahContractRepository contractRepository;
    @Mock private IslamicPostingRuleService postingRuleService;
    @Mock private PoolAssetManagementService poolAssetManagementService;

    @InjectMocks
    private IjarahAssetService service;

    @Test
    void processMonthlyDepreciation_updatesAccumulatedDepreciationAndNbv() {
        IjarahAsset asset = IjarahAsset.builder()
                .id(1L)
                .assetRef("IJR-AST-1")
                .status(IjarahDomainEnums.AssetStatus.LEASED)
                .acquisitionCost(new BigDecimal("12000.00"))
                .residualValue(BigDecimal.ZERO)
                .monthlyDepreciation(new BigDecimal("1000.00"))
                .accumulatedDepreciation(BigDecimal.ZERO)
                .impairmentProvisionBalance(BigDecimal.ZERO)
                .netBookValue(new BigDecimal("12000.00"))
                .build();
        when(assetRepository.findById(1L)).thenReturn(Optional.of(asset));
        when(assetRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(postingRuleService.postIslamicTransaction(any()))
                .thenReturn(JournalEntry.builder().journalNumber("JRN-DEPR").build());

        service.processMonthlyDepreciation(1L);

        assertThat(asset.getAccumulatedDepreciation()).isEqualByComparingTo("1000.00");
        assertThat(asset.getNetBookValue()).isEqualByComparingTo("11000.00");
        verify(postingRuleService).postIslamicTransaction(any());
    }

    @Test
    void recordMaintenance_customerResponsibility_doesNotIncreaseBankSpend() {
        IjarahAsset asset = IjarahAsset.builder()
                .id(1L)
                .assetRef("IJR-AST-1")
                .currencyCode("SAR")
                .totalMaintenanceCost(BigDecimal.ZERO)
                .build();
        when(assetRepository.findById(1L)).thenReturn(Optional.of(asset));
        when(assetRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(maintenanceRecordRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        IjarahRequests.MaintenanceRecordRequest request = IjarahRequests.MaintenanceRecordRequest.builder()
                .maintenanceType(IjarahDomainEnums.MaintenanceType.ROUTINE_SCHEDULED)
                .responsibleParty(IjarahDomainEnums.ResponsibleParty.CUSTOMER)
                .description("Tyre rotation")
                .cost(new BigDecimal("150.00"))
                .currencyCode("SAR")
                .maintenanceDate(LocalDate.now())
                .build();

        service.recordMaintenance(1L, request);

        assertThat(asset.getTotalMaintenanceCost()).isEqualByComparingTo("0.00");
        verify(postingRuleService, never()).postIslamicTransaction(any());
    }
}
