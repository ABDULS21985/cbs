package com.cbs.leasingitem;
import com.cbs.leasingitem.entity.LeasedAsset;
import com.cbs.leasingitem.repository.LeasedAssetRepository;
import com.cbs.leasingitem.service.LeasedAssetService;
import org.junit.jupiter.api.*; import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*; import org.mockito.junit.jupiter.MockitoExtension;
import java.time.LocalDate; import java.util.Optional;
import static org.assertj.core.api.Assertions.*; import static org.mockito.ArgumentMatchers.*; import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeasedAssetServiceTest {
    @Mock private LeasedAssetRepository repository;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private LeasedAssetService service;

    @Test @DisplayName("Return sets condition + timestamp + RETURNED status")
    void returnAsset() {
        LeasedAsset asset = new LeasedAsset(); asset.setId(1L); asset.setAssetCode("LA-TEST"); asset.setStatus("ACTIVE");
        when(repository.findByAssetCode("LA-TEST")).thenReturn(Optional.of(asset));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LeasedAsset result = service.returnAsset("LA-TEST", "GOOD");
        assertThat(result.getReturnCondition()).isEqualTo("GOOD");
        assertThat(result.getReturnedAt()).isNotNull();
        assertThat(result.getStatus()).isEqualTo("RETURNED");
    }

    @Test @DisplayName("Inspection updates condition and next due date")
    void inspectionUpdate() {
        LeasedAsset asset = new LeasedAsset(); asset.setId(1L); asset.setAssetCode("LA-INSP"); asset.setStatus("ACTIVE");
        when(repository.findByAssetCode("LA-INSP")).thenReturn(Optional.of(asset));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        LocalDate nextDue = LocalDate.now().plusMonths(6);
        LeasedAsset result = service.recordInspection("LA-INSP", "FAIR", nextDue);
        assertThat(result.getCondition()).isEqualTo("FAIR");
        assertThat(result.getLastInspectionDate()).isEqualTo(LocalDate.now());
        assertThat(result.getNextInspectionDue()).isEqualTo(nextDue);
    }
}
