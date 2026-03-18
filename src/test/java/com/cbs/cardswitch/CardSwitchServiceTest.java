package com.cbs.cardswitch;

import com.cbs.cardswitch.entity.CardSwitchTransaction;
import com.cbs.cardswitch.repository.CardSwitchTransactionRepository;
import com.cbs.cardswitch.service.CardSwitchService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CardSwitchServiceTest {
    @Mock private CardSwitchTransactionRepository repository;
    @InjectMocks private CardSwitchService service;

    @Test @DisplayName("Response code 00 → isDeclined = false")
    void approvedTransaction() {
        CardSwitchTransaction txn = CardSwitchTransaction.builder()
                .transactionType("AUTHORIZATION").cardHash("abc123").cardScheme("VISA")
                .amount(new BigDecimal("100")).responseCode("00").build();
        when(repository.save(any())).thenAnswer(i -> { CardSwitchTransaction t = i.getArgument(0); t.setId(1L); return t; });
        CardSwitchTransaction result = service.processTransaction(txn);
        assertThat(result.getSwitchRef()).startsWith("CSW-");
        assertThat(result.getIsDeclined()).isFalse();
    }

    @Test @DisplayName("Response code 51 → isDeclined = true")
    void declinedTransaction() {
        CardSwitchTransaction txn = CardSwitchTransaction.builder()
                .transactionType("AUTHORIZATION").cardHash("def456").cardScheme("MASTERCARD")
                .amount(new BigDecimal("5000")).responseCode("51").build();
        when(repository.save(any())).thenAnswer(i -> { CardSwitchTransaction t = i.getArgument(0); t.setId(2L); return t; });
        CardSwitchTransaction result = service.processTransaction(txn);
        assertThat(result.getIsDeclined()).isTrue();
    }
}
