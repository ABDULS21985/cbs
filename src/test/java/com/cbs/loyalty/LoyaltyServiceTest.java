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

    @Test @DisplayName("Earning points increases balance and lifetime")
    void earnPoints() {
        LoyaltyAccount account = LoyaltyAccount.builder().id(1L).loyaltyNumber("LYL-001")
                .currentBalance(1000).lifetimeEarned(5000).status("ACTIVE").build();
        when(accountRepository.findByLoyaltyNumber("LYL-001")).thenReturn(Optional.of(account));
        when(accountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(transactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        LoyaltyAccount result = loyaltyService.earnPoints("LYL-001", 500, "Purchase reward", null);
        assertThat(result.getCurrentBalance()).isEqualTo(1500);
        assertThat(result.getLifetimeEarned()).isEqualTo(5500);
    }

    @Test @DisplayName("Redemption fails with insufficient points")
    void insufficientPoints() {
        LoyaltyProgram program = LoyaltyProgram.builder().id(1L).minRedemptionPoints(100)
                .pointValue(new BigDecimal("0.01")).build();
        LoyaltyAccount account = LoyaltyAccount.builder().id(1L).loyaltyNumber("LYL-LOW")
                .programId(1L).currentBalance(50).status("ACTIVE").build();
        when(accountRepository.findByLoyaltyNumber("LYL-LOW")).thenReturn(Optional.of(account));
        when(programRepository.findById(1L)).thenReturn(Optional.of(program));

        assertThatThrownBy(() -> loyaltyService.redeemPoints("LYL-LOW", 200, "Statement credit"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Insufficient");
    }

    @Test @DisplayName("Successful redemption decreases balance")
    void redeemPoints() {
        LoyaltyProgram program = LoyaltyProgram.builder().id(1L).minRedemptionPoints(100)
                .pointValue(new BigDecimal("0.01")).build();
        LoyaltyAccount account = LoyaltyAccount.builder().id(1L).loyaltyNumber("LYL-RDM")
                .programId(1L).currentBalance(5000).lifetimeRedeemed(1000).status("ACTIVE").build();
        when(accountRepository.findByLoyaltyNumber("LYL-RDM")).thenReturn(Optional.of(account));
        when(programRepository.findById(1L)).thenReturn(Optional.of(program));
        when(accountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(transactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        LoyaltyAccount result = loyaltyService.redeemPoints("LYL-RDM", 2000, "Statement credit");
        assertThat(result.getCurrentBalance()).isEqualTo(3000);
        assertThat(result.getLifetimeRedeemed()).isEqualTo(3000);
    }
}
