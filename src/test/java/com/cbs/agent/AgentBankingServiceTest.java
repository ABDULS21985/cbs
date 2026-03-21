package com.cbs.agent;

import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.agent.entity.*;
import com.cbs.agent.repository.*;
import com.cbs.agent.service.AgentBankingService;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AgentBankingServiceTest {

    @Mock private BankingAgentRepository agentRepository;
    @Mock private AgentTransactionRepository txnRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private AccountPostingService accountPostingService;
    @Mock private CbsProperties cbsProperties;

    @InjectMocks private AgentBankingService agentService;

    private BankingAgent agent;
    private Account customerAccount;

    @BeforeEach
    void setUp() {
        CbsProperties.LedgerConfig ledgerConfig = new CbsProperties.LedgerConfig();
        ledgerConfig.setExternalClearingGlCode("2100");
        when(cbsProperties.getLedger()).thenReturn(ledgerConfig);
        agent = BankingAgent.builder().id(1L).agentCode("AGT001").agentName("Test Agent")
                .agentType("INDIVIDUAL").status("ACTIVE")
                .floatBalance(new BigDecimal("500000")).minFloatBalance(new BigDecimal("10000"))
                .commissionModel("PERCENTAGE").commissionRate(new BigDecimal("0.50"))
                .singleTxnLimit(new BigDecimal("100000")).dailyTxnLimit(new BigDecimal("1000000"))
                .commissionAccountId(20L).build();

        customerAccount = Account.builder().id(10L).accountNumber("1000000010")
                .bookBalance(new BigDecimal("50000")).availableBalance(new BigDecimal("50000"))
                .lienAmount(BigDecimal.ZERO).overdraftLimit(BigDecimal.ZERO).build();
    }

    @Test
    @DisplayName("Cash-in: credits customer account, adds to float, earns commission")
    void cashIn_Success() {
        when(agentRepository.findByAgentCode("AGT001")).thenReturn(Optional.of(agent));
        when(accountRepository.findById(10L)).thenReturn(Optional.of(customerAccount));
        when(accountRepository.findById(20L)).thenReturn(Optional.of(Account.builder().id(20L)
                .bookBalance(BigDecimal.ZERO).availableBalance(BigDecimal.ZERO)
                .lienAmount(BigDecimal.ZERO).overdraftLimit(BigDecimal.ZERO).build()));
        when(txnRepository.sumDailyVolume(eq(1L), any())).thenReturn(BigDecimal.ZERO);
        when(agentRepository.save(any())).thenReturn(agent);
        when(accountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(txnRepository.save(any())).thenAnswer(inv -> { AgentTransaction t = inv.getArgument(0); t.setId(1L); return t; });
        when(accountPostingService.postCreditAgainstGl(any(Account.class), any(), any(), anyString(), any(), anyString(), anyString(), anyString(), anyString()))
                .thenAnswer(inv -> {
                    Account customer = inv.getArgument(0);
                    BigDecimal amount = inv.getArgument(2);
                    customer.credit(amount);
                    return TransactionJournal.builder().id(1L).build();
                });

        AgentTransaction result = agentService.processTransaction("AGT001", "CASH_IN", 1L, 10L,
                new BigDecimal("20000"), "USD", null, null);

        assertThat(result.getTransactionType()).isEqualTo("CASH_IN");
        assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("20000"));
        assertThat(result.getCommissionAmount()).isEqualByComparingTo(new BigDecimal("100.00")); // 0.5% of 20000
        assertThat(customerAccount.getAvailableBalance()).isEqualByComparingTo(new BigDecimal("70000")); // +20000
        assertThat(agent.getFloatBalance()).isEqualByComparingTo(new BigDecimal("520000")); // +20000
    }

    @Test
    @DisplayName("Cash-out: rejects when insufficient float")
    void cashOut_InsufficientFloat() {
        agent.setFloatBalance(new BigDecimal("5000"));
        when(agentRepository.findByAgentCode("AGT001")).thenReturn(Optional.of(agent));
        when(txnRepository.sumDailyVolume(eq(1L), any())).thenReturn(BigDecimal.ZERO);

        assertThatThrownBy(() -> agentService.processTransaction("AGT001", "CASH_OUT", 1L, 10L,
                new BigDecimal("10000"), "USD", null, null))
                .isInstanceOf(BusinessException.class).hasMessageContaining("float");
    }

    @Test
    @DisplayName("Rejects transaction exceeding single limit")
    void exceedsSingleLimit() {
        when(agentRepository.findByAgentCode("AGT001")).thenReturn(Optional.of(agent));
        when(cbsProperties.getLedger()).thenReturn(new CbsProperties.LedgerConfig());

        assertThatThrownBy(() -> agentService.processTransaction("AGT001", "CASH_IN", 1L, 10L,
                new BigDecimal("150000"), "USD", null, null))
                .isInstanceOf(BusinessException.class).hasMessageContaining("single transaction limit");
    }
}
