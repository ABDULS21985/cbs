package com.cbs.loyalty;

import com.cbs.common.exception.BusinessException;
import com.cbs.loyalty.entity.*;
import com.cbs.loyalty.repository.*;
import com.cbs.loyalty.service.LoyaltyService;
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
class LoyaltyServiceTest {

    @Mock private LoyaltyProgramRepository programRepository;
    @Mock private LoyaltyAccountRepository accountRepository;
    @Mock private LoyaltyTransactionRepository transactionRepository;
    @InjectMocks private LoyaltyService loyaltyService;

    @Test @DisplayName("Earning points increases balance and YTD")
    void earnPoints() {
        LoyaltyAccount account = LoyaltyAccount.builder().id(1L).membershipNumber("LYL-001")
                .pointsBalance(1000L).pointsEarnedYtd(5000L).lifetimePoints(10000L).status("ACTIVE").build();
        when(accountRepository.findByMembershipNumber("LYL-001")).thenReturn(Optional.of(account));
        when(accountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(transactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        LoyaltyAccount result = loyaltyService.earnPoints("LYL-001", 500L, "Purchase reward", null);
        assertThat(result.getPointsBalance()).isEqualTo(1500L);
        assertThat(result.getPointsEarnedYtd()).isEqualTo(5500L);
        assertThat(result.getLifetimePoints()).isEqualTo(10500L);
    }

    @Test @DisplayName("Redemption fails with insufficient points")
    void insufficientPoints() {
        LoyaltyProgram program = LoyaltyProgram.builder().id(1L).minRedemptionPoints(100)
                .pointsValueCurrency(new BigDecimal("0.01")).build();
        LoyaltyAccount account = LoyaltyAccount.builder().id(1L).membershipNumber("LYL-LOW")
                .programId(1L).pointsBalance(50L).status("ACTIVE").build();
        when(accountRepository.findByMembershipNumber("LYL-LOW")).thenReturn(Optional.of(account));
        when(programRepository.findById(1L)).thenReturn(Optional.of(program));

        assertThatThrownBy(() -> loyaltyService.redeemPoints("LYL-LOW", 200L, "STATEMENT_CREDIT"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Insufficient");
    }

    @Test @DisplayName("Successful redemption decreases balance and tracks value")
    void redeemPoints() {
        LoyaltyProgram program = LoyaltyProgram.builder().id(1L).minRedemptionPoints(100)
                .pointsValueCurrency(new BigDecimal("0.01")).build();
        LoyaltyAccount account = LoyaltyAccount.builder().id(1L).membershipNumber("LYL-RDM")
                .programId(1L).pointsBalance(5000L).pointsRedeemedYtd(1000L).status("ACTIVE").build();
        when(accountRepository.findByMembershipNumber("LYL-RDM")).thenReturn(Optional.of(account));
        when(programRepository.findById(1L)).thenReturn(Optional.of(program));
        when(accountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(transactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        LoyaltyAccount result = loyaltyService.redeemPoints("LYL-RDM", 2000L, "STATEMENT_CREDIT");
        assertThat(result.getPointsBalance()).isEqualTo(3000L);
        assertThat(result.getPointsRedeemedYtd()).isEqualTo(3000L);
    }
}
