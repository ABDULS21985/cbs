package com.cbs.fundmgmt;

import com.cbs.fundmgmt.entity.ManagedFund;
import com.cbs.fundmgmt.repository.ManagedFundRepository;
import com.cbs.fundmgmt.service.FundManagementService;
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
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
class FundManagementServiceTest {

    @Mock private ManagedFundRepository fundRepository;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private FundManagementService service;

    @Test
    @DisplayName("Fund creation generates code starting with FND-")
    void createGeneratesCode() {
        ManagedFund fund = new ManagedFund();
        fund.setFundName("Sharia Growth Fund");
        fund.setFundType("SHARIA_FUND");
        fund.setFundManager("Al Baraka AM");

        when(fundRepository.save(any())).thenAnswer(inv -> {
            ManagedFund saved = inv.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        ManagedFund result = service.create(fund);

        assertThat(result.getFundCode()).startsWith("FND-");
        assertThat(result.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    @DisplayName("NAV update recalculates AUM = NAV × units outstanding")
    void navUpdateRecalculatesAum() {
        ManagedFund fund = new ManagedFund();
        fund.setId(1L);
        fund.setFundCode("FND-TEST");
        fund.setTotalUnitsOutstanding(new BigDecimal("1000000"));
        fund.setStatus("ACTIVE");

        when(fundRepository.findByFundCode("FND-TEST")).thenReturn(Optional.of(fund));
        when(fundRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ManagedFund result = service.updateNav("FND-TEST", new BigDecimal("25.50"));

        assertThat(result.getNavPerUnit()).isEqualByComparingTo("25.50");
        // AUM = 25.50 × 1,000,000 = 25,500,000
        assertThat(result.getTotalAum()).isEqualByComparingTo("25500000.000000");
        assertThat(result.getNavDate()).isNotNull();
    }
}
