package com.cbs.integration;

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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CardSchemeContractTest {

    @Mock
    private CardSwitchTransactionRepository repository;

    @InjectMocks
    private CardSwitchService cardSwitchService;

    @Test
    @DisplayName("ISO 8583 authorization request format is valid")
    void iso8583AuthorizationFormat() {
        CardSwitchService.Iso8583Message message = cardSwitchService.buildAuthorizationRequest(
                new CardSwitchService.CardAuthorizationRequest(
                        "5399831234567890",
                        "000000",
                        new BigDecimal("1000.00"),
                        "123456",
                        "566"
                )
        );

        assertThat(message.mti()).isEqualTo("0100");
        assertThat(message.getField(2)).matches("\\d{16,19}");
        assertThat(message.getField(4)).matches("\\d{12}");
        assertThat(message.getField(7)).matches("\\d{10}");
        assertThat(message.getField(11)).matches("\\d{6}");
        assertThat(message.getField(49)).isEqualTo("566");
    }

    @Test
    @DisplayName("Response code mapping remains stable")
    void responseCodeMapping() {
        assertThat(cardSwitchService.mapResponseCode("00")).isEqualTo("APPROVED");
        assertThat(cardSwitchService.mapResponseCode("51")).isEqualTo("INSUFFICIENT_FUNDS");
        assertThat(cardSwitchService.mapResponseCode("05")).isEqualTo("DO_NOT_HONOUR");
        assertThat(cardSwitchService.mapResponseCode("14")).isEqualTo("INVALID_CARD");
    }

    @Test
    @DisplayName("Approved response code keeps transaction non-declined")
    void approvedResponseCode() {
        CardSwitchTransaction txn = CardSwitchTransaction.builder()
                .transactionType("PURCHASE")
                .cardHash("hash-1")
                .cardScheme("VISA")
                .amount(new BigDecimal("250.00"))
                .responseCode("00")
                .build();
        when(repository.save(any(CardSwitchTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CardSwitchTransaction result = cardSwitchService.processTransaction(txn);

        assertThat(result.getSwitchRef()).startsWith("CSW-");
        assertThat(result.getIsDeclined()).isFalse();
    }

    @Test
    @DisplayName("Decline response code 51 sets declined flag")
    void insufficientFundsResponseCode() {
        CardSwitchTransaction txn = CardSwitchTransaction.builder()
                .transactionType("PURCHASE")
                .cardHash("hash-2")
                .cardScheme("MASTERCARD")
                .amount(new BigDecimal("9999.99"))
                .responseCode("51")
                .build();
        when(repository.save(any(CardSwitchTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CardSwitchTransaction result = cardSwitchService.processTransaction(txn);

        assertThat(result.getIsDeclined()).isTrue();
    }
}
