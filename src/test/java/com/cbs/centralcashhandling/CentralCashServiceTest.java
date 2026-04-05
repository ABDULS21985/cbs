package com.cbs.centralcashhandling;
import com.cbs.centralcashhandling.entity.CashMovement;
import com.cbs.centralcashhandling.entity.CashVault;
import com.cbs.centralcashhandling.repository.CashMovementRepository;
import com.cbs.centralcashhandling.repository.CashVaultRepository;
import com.cbs.centralcashhandling.service.CentralCashHandlingService;
import org.junit.jupiter.api.*; import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*; import org.mockito.junit.jupiter.MockitoExtension; import org.mockito.junit.jupiter.MockitoSettings;
import java.math.BigDecimal; import java.util.Optional;
import static org.assertj.core.api.Assertions.*; import static org.mockito.ArgumentMatchers.*; import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
class CentralCashServiceTest {
    @Mock private CashVaultRepository vaultRepository;
    @Mock private CashMovementRepository movementRepository;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private CentralCashHandlingService service;

    @Test @DisplayName("Movement debits source vault and credits destination")
    void movementUpdatesVaults() {
        CashVault from = new CashVault(); from.setId(1L); from.setVaultCode("VLT-SRC"); from.setTotalBalance(new BigDecimal("10000000")); from.setStatus("ACTIVE");
        CashVault to = new CashVault(); to.setId(2L); to.setVaultCode("VLT-DST"); to.setTotalBalance(new BigDecimal("2000000")); to.setStatus("ACTIVE");
        CashMovement movement = new CashMovement(); movement.setFromVaultCode("VLT-SRC"); movement.setToVaultCode("VLT-DST");
        movement.setMovementType("VAULT_TRANSFER"); movement.setAmount(new BigDecimal("3000000")); movement.setCurrency("NGN");
        movement.setAuthorizedBy("SUPERVISOR");
        when(currentActorProvider.getCurrentActor()).thenReturn("TELLER");
        when(vaultRepository.findByVaultCode("VLT-SRC")).thenReturn(Optional.of(from));
        when(vaultRepository.findByVaultCode("VLT-DST")).thenReturn(Optional.of(to));
        when(vaultRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(movementRepository.save(any())).thenAnswer(i -> { CashMovement m = i.getArgument(0); m.setId(1L); return m; });
        service.recordMovement(movement);
        assertThat(from.getTotalBalance()).isEqualByComparingTo("7000000");
        assertThat(to.getTotalBalance()).isEqualByComparingTo("5000000");
    }

    @Test @DisplayName("Confirm delivery sets actual date and CONFIRMED status")
    void confirmDelivery() {
        CashMovement movement = new CashMovement(); movement.setId(1L); movement.setMovementRef("CMV-TEST"); movement.setStatus("IN_TRANSIT");
        when(movementRepository.findByMovementRef("CMV-TEST")).thenReturn(Optional.of(movement));
        when(movementRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        CashMovement result = service.confirmDelivery("CMV-TEST");
        assertThat(result.getStatus()).isEqualTo("CONFIRMED");
        assertThat(result.getActualDate()).isNotNull();
    }
}
