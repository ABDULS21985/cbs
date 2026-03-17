package com.cbs.virtualaccount;

import com.cbs.common.exception.BusinessException;
import com.cbs.virtualaccount.entity.VirtualAccount;
import com.cbs.virtualaccount.repository.VirtualAccountRepository;
import com.cbs.virtualaccount.service.VirtualAccountService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VirtualAccountServiceTest {

    @Mock private VirtualAccountRepository vaRepository;
    @InjectMocks private VirtualAccountService vaService;

    @Test @DisplayName("Credit increases virtual balance")
    void creditIncreasesBalance() {
        VirtualAccount va = VirtualAccount.builder().id(1L).virtualAccountNumber("VA-TEST")
                .virtualBalance(new BigDecimal("1000")).isActive(true).autoSweepEnabled(false).build();
        when(vaRepository.findByVirtualAccountNumber("VA-TEST")).thenReturn(Optional.of(va));
        when(vaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        VirtualAccount result = vaService.credit("VA-TEST", new BigDecimal("500"), "INV-001");
        assertThat(result.getVirtualBalance()).isEqualByComparingTo(new BigDecimal("1500"));
    }

    @Test @DisplayName("Auto-sweep triggers when balance exceeds threshold")
    void autoSweepTriggers() {
        VirtualAccount va = VirtualAccount.builder().id(1L).virtualAccountNumber("VA-SWEEP")
                .virtualBalance(new BigDecimal("5000")).isActive(true)
                .autoSweepEnabled(true).sweepThreshold(new BigDecimal("10000"))
                .sweepTargetBalance(new BigDecimal("2000")).sweepDirection("TO_MASTER").build();
        when(vaRepository.findByVirtualAccountNumber("VA-SWEEP")).thenReturn(Optional.of(va));
        when(vaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Credit 8000 → balance becomes 13000 → exceeds 10000 → sweep down to 2000
        VirtualAccount result = vaService.credit("VA-SWEEP", new BigDecimal("8000"), null);
        assertThat(result.getVirtualBalance()).isEqualByComparingTo(new BigDecimal("2000"));
    }

    @Test @DisplayName("Debit rejected when insufficient balance")
    void insufficientBalance() {
        VirtualAccount va = VirtualAccount.builder().id(1L).virtualAccountNumber("VA-LOW")
                .virtualBalance(new BigDecimal("100")).isActive(true).build();
        when(vaRepository.findByVirtualAccountNumber("VA-LOW")).thenReturn(Optional.of(va));

        assertThatThrownBy(() -> vaService.debit("VA-LOW", new BigDecimal("500")))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Insufficient");
    }

    @Test @DisplayName("Cannot deactivate VA with non-zero balance")
    void cannotDeactivateWithBalance() {
        VirtualAccount va = VirtualAccount.builder().id(1L).virtualAccountNumber("VA-BAL")
                .virtualBalance(new BigDecimal("50")).isActive(true).build();
        when(vaRepository.findByVirtualAccountNumber("VA-BAL")).thenReturn(Optional.of(va));

        assertThatThrownBy(() -> vaService.deactivate("VA-BAL"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("non-zero");
    }
}
