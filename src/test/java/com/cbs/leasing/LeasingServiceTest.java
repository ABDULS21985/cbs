package com.cbs.leasing;

import com.cbs.common.exception.BusinessException;
import com.cbs.leasing.entity.LeaseContract;
import com.cbs.leasing.repository.LeaseContractRepository;
import com.cbs.leasing.service.LeasingService;
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
class LeasingServiceTest {

    @Mock private LeaseContractRepository leaseRepository;
    @Mock private com.cbs.gl.service.GeneralLedgerService generalLedgerService;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private LeasingService leasingService;

    @Test @DisplayName("IFRS 16 lease calculates ROU asset and lease liability")
    void ifrs16RouCalculation() {
        when(leaseRepository.save(any())).thenAnswer(inv -> { LeaseContract l = inv.getArgument(0); l.setId(1L); return l; });
        LeaseContract lease = LeaseContract.builder().customerId(1L).accountId(1L)
                .leaseType("FINANCE_LEASE").ifrs16Classification("RIGHT_OF_USE")
                .assetCategory("VEHICLE").assetDescription("2024 Toyota Land Cruiser")
                .assetFairValue(new BigDecimal("80000")).residualValue(new BigDecimal("20000"))
                .principalAmount(new BigDecimal("60000")).implicitRate(new BigDecimal("8.0"))
                .termMonths(48).paymentFrequency("MONTHLY").periodicPayment(new BigDecimal("1465"))
                .securityDeposit(new BigDecimal("5000")).build();
        LeaseContract result = leasingService.createLease(lease);
        assertThat(result.getLeaseLiability()).isGreaterThan(BigDecimal.ZERO);
        assertThat(result.getRouAssetAmount()).isGreaterThan(result.getLeaseLiability()); // ROU = liability + deposit
        assertThat(result.getLeaseNumber()).startsWith("LSE-");
    }

    @Test @DisplayName("Purchase option exercise zeroes balance")
    void purchaseOption() {
        LeaseContract lease = LeaseContract.builder().id(1L).leaseNumber("LSE-BUYOUT")
                .status("ACTIVE").currentBalance(new BigDecimal("15000"))
                .purchaseOptionPrice(new BigDecimal("10000")).build();
        when(leaseRepository.findByLeaseNumber("LSE-BUYOUT")).thenReturn(Optional.of(lease));
        when(leaseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        LeaseContract result = leasingService.exercisePurchaseOption("LSE-BUYOUT");
        assertThat(result.getStatus()).isEqualTo("BUYOUT_EXERCISED");
        assertThat(result.getCurrentBalance()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test @DisplayName("Cannot exercise purchase option if not available")
    void noPurchaseOption() {
        LeaseContract lease = LeaseContract.builder().id(1L).leaseNumber("LSE-NOPT")
                .status("ACTIVE").purchaseOptionPrice(null).build();
        when(leaseRepository.findByLeaseNumber("LSE-NOPT")).thenReturn(Optional.of(lease));
        assertThatThrownBy(() -> leasingService.exercisePurchaseOption("LSE-NOPT"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("purchase option");
    }
}
