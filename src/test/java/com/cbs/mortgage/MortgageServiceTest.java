package com.cbs.mortgage;

import com.cbs.common.exception.BusinessException;
import com.cbs.mortgage.entity.MortgageLoan;
import com.cbs.mortgage.repository.MortgageLoanRepository;
import com.cbs.mortgage.service.MortgageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MortgageServiceTest {

    @Mock private MortgageLoanRepository mortgageRepository;
    @InjectMocks private MortgageService mortgageService;

    @Test @DisplayName("LTV > 95% rejected at origination")
    void ltvExceeded() {
        MortgageLoan m = MortgageLoan.builder().customerId(1L).accountId(1L)
                .mortgageType("RESIDENTIAL").repaymentType("CAPITAL_AND_INTEREST").rateType("FIXED")
                .propertyAddress("123 Main St").propertyType("DETACHED")
                .propertyValuation(new BigDecimal("200000")).valuationDate(LocalDate.now()).valuationType("FULL")
                .principalAmount(new BigDecimal("195000")).interestRate(new BigDecimal("4.5")).termMonths(300).build();
        assertThatThrownBy(() -> mortgageService.originate(m))
                .isInstanceOf(BusinessException.class).hasMessageContaining("95%");
    }

    @Test @DisplayName("Valid mortgage calculates LTV and monthly payment")
    void validOrigination() {
        when(mortgageRepository.save(any())).thenAnswer(inv -> { MortgageLoan m = inv.getArgument(0); m.setId(1L); return m; });
        MortgageLoan m = MortgageLoan.builder().customerId(1L).accountId(1L)
                .mortgageType("RESIDENTIAL").repaymentType("CAPITAL_AND_INTEREST").rateType("FIXED")
                .propertyAddress("456 Oak Ave").propertyType("SEMI_DETACHED")
                .propertyValuation(new BigDecimal("300000")).valuationDate(LocalDate.now()).valuationType("FULL")
                .principalAmount(new BigDecimal("240000")).interestRate(new BigDecimal("4.5")).termMonths(300).build();
        MortgageLoan result = mortgageService.originate(m);
        assertThat(result.getLtvAtOrigination()).isEqualByComparingTo(new BigDecimal("80.0000"));
        assertThat(result.getMonthlyPayment()).isGreaterThan(BigDecimal.ZERO);
        assertThat(result.getMortgageNumber()).startsWith("MTG-");
    }

    @Test @DisplayName("Status transition APPLICATION → VALUATION valid, APPLICATION → ACTIVE invalid")
    void statusTransitions() {
        MortgageLoan m = MortgageLoan.builder().id(1L).mortgageNumber("MTG-TEST").status("APPLICATION").build();
        when(mortgageRepository.findByMortgageNumber("MTG-TEST")).thenReturn(Optional.of(m));
        when(mortgageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MortgageLoan advanced = mortgageService.advanceStatus("MTG-TEST", "VALUATION");
        assertThat(advanced.getStatus()).isEqualTo("VALUATION");

        m.setStatus("APPLICATION");
        assertThatThrownBy(() -> mortgageService.advanceStatus("MTG-TEST", "ACTIVE"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Invalid transition");
    }

    @Test @DisplayName("SVR reversion changes rate type and recalculates payment")
    void svrReversion() {
        MortgageLoan m = MortgageLoan.builder().id(1L).mortgageNumber("MTG-SVR")
                .status("ACTIVE").rateType("FIXED").interestRate(new BigDecimal("3.5"))
                .reversionRate(new BigDecimal("6.5")).currentBalance(new BigDecimal("200000"))
                .repaymentType("CAPITAL_AND_INTEREST").remainingMonths(240).build();
        when(mortgageRepository.findByMortgageNumber("MTG-SVR")).thenReturn(Optional.of(m));
        when(mortgageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MortgageLoan reverted = mortgageService.revertToSvr("MTG-SVR");
        assertThat(reverted.getInterestRate()).isEqualByComparingTo(new BigDecimal("6.5"));
        assertThat(reverted.getRateType()).isEqualTo("VARIABLE");
    }
}
