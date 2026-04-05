package com.cbs.card;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.Product;
import com.cbs.card.dto.CardMapper;
import com.cbs.card.dto.CardResponse;
import com.cbs.card.dto.CardTransactionResponse;
import com.cbs.card.entity.*;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CardMapperTest {

    private Card card;
    private CardTransaction txn;

    @BeforeEach
    void setUp() {
        Customer customer = Customer.builder().id(10L).firstName("Alice").lastName("Smith")
                .customerType(CustomerType.INDIVIDUAL).build();

        Account account = Account.builder().id(5L).accountNumber("2000000001")
                .customer(customer).currencyCode("NGN")
                .bookBalance(BigDecimal.ZERO).availableBalance(BigDecimal.ZERO)
                .lienAmount(BigDecimal.ZERO).overdraftLimit(BigDecimal.ZERO)
                .product(Product.builder().id(1L).code("CA-STD").build()).build();

        card = Card.builder()
                .id(1L).cardReference("CRD-ABCDE12345")
                .cardNumberHash("hash123").cardNumberMasked("411111******1234")
                .account(account).customer(customer)
                .cardType(CardType.DEBIT).cardScheme(CardScheme.VISA)
                .cardTier("GOLD").cardholderName("ALICE SMITH")
                .issueDate(LocalDate.of(2025, 1, 1))
                .expiryDate(LocalDate.of(2028, 1, 1))
                .dailyPosLimit(new BigDecimal("500000"))
                .dailyAtmLimit(new BigDecimal("200000"))
                .dailyOnlineLimit(new BigDecimal("300000"))
                .singleTxnLimit(new BigDecimal("100000"))
                .isContactlessEnabled(true).isOnlineEnabled(true)
                .isInternationalEnabled(false).isAtmEnabled(true).isPosEnabled(true)
                .pinRetriesRemaining(3).status(CardStatus.ACTIVE)
                .currencyCode("NGN").branchCode("BR001")
                .build();

        txn = CardTransaction.builder()
                .id(100L).transactionRef("CTX-TX001")
                .card(card).account(account)
                .transactionType("REFUND").channel("SYSTEM")
                .amount(new BigDecimal("15000")).currencyCode("NGN")
                .billingAmount(new BigDecimal("15000")).billingCurrency("NGN")
                .originalTransaction(CardTransaction.builder().id(99L).transactionRef("CTX-ORIGINAL").build())
                .originalTransactionRef("CTX-ORIGINAL").adjustmentReason("Merchant refund")
                .merchantName("Shoprite").merchantId("MRC001")
                .merchantCategoryCode("5411").terminalId("TRM001")
                .authCode("123456").responseCode("00")
                .islamicCardId(99L).shariahScreeningRef("SSR-100").shariahDecision("ALLOWED").shariahReason(null)
                .status("AUTHORIZED").isInternational(false).isDisputed(false)
                .transactionDate(Instant.now())
                .build();
    }

    @Test
    @DisplayName("CardMapper.toResponse maps all Card entity fields to CardResponse DTO")
    void toResponse_MapsAllFields() {
        CardResponse dto = CardMapper.toResponse(card);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(1L);
        assertThat(dto.cardReference()).isEqualTo("CRD-ABCDE12345");
        assertThat(dto.cardNumberMasked()).isEqualTo("411111******1234");
        assertThat(dto.accountId()).isEqualTo(5L);
        assertThat(dto.accountNumber()).isEqualTo("2000000001");
        assertThat(dto.customerId()).isEqualTo(10L);
        assertThat(dto.customerDisplayName()).isNotNull();
        assertThat(dto.cardType()).isEqualTo(CardType.DEBIT);
        assertThat(dto.cardScheme()).isEqualTo(CardScheme.VISA);
        assertThat(dto.cardTier()).isEqualTo("GOLD");
        assertThat(dto.cardholderName()).isEqualTo("ALICE SMITH");
        assertThat(dto.issueDate()).isEqualTo(LocalDate.of(2025, 1, 1));
        assertThat(dto.expiryDate()).isEqualTo(LocalDate.of(2028, 1, 1));
        assertThat(dto.dailyPosLimit()).isEqualByComparingTo(new BigDecimal("500000"));
        assertThat(dto.contactlessEnabled()).isTrue();
        assertThat(dto.internationalEnabled()).isFalse();
        assertThat(dto.status()).isEqualTo(CardStatus.ACTIVE);
        assertThat(dto.currencyCode()).isEqualTo("NGN");
        assertThat(dto.branchCode()).isEqualTo("BR001");
    }

    @Test
    @DisplayName("CardMapper.toResponse handles null card")
    void toResponse_NullCard() {
        assertThat(CardMapper.toResponse(null)).isNull();
    }

    @Test
    @DisplayName("CardMapper.toResponseList converts list of entities")
    void toResponseList_ConvertsList() {
        List<CardResponse> dtos = CardMapper.toResponseList(List.of(card));
        assertThat(dtos).hasSize(1);
        assertThat(dtos.get(0).cardReference()).isEqualTo("CRD-ABCDE12345");
    }

    @Test
    @DisplayName("CardMapper.toTxnResponse maps all CardTransaction fields")
    void toTxnResponse_MapsAllFields() {
        CardTransactionResponse dto = CardMapper.toTxnResponse(txn);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(100L);
        assertThat(dto.transactionRef()).isEqualTo("CTX-TX001");
        assertThat(dto.cardId()).isEqualTo(1L);
        assertThat(dto.cardReference()).isEqualTo("CRD-ABCDE12345");
        assertThat(dto.accountId()).isEqualTo(5L);
        assertThat(dto.accountNumber()).isEqualTo("2000000001");
        assertThat(dto.transactionType()).isEqualTo("REFUND");
        assertThat(dto.channel()).isEqualTo("SYSTEM");
        assertThat(dto.amount()).isEqualByComparingTo(new BigDecimal("15000"));
        assertThat(dto.currencyCode()).isEqualTo("NGN");
        assertThat(dto.billingAmount()).isEqualByComparingTo(new BigDecimal("15000"));
        assertThat(dto.billingCurrency()).isEqualTo("NGN");
        assertThat(dto.originalTransactionId()).isEqualTo(99L);
        assertThat(dto.originalTransactionRef()).isEqualTo("CTX-ORIGINAL");
        assertThat(dto.adjustmentReason()).isEqualTo("Merchant refund");
        assertThat(dto.merchantName()).isEqualTo("Shoprite");
        assertThat(dto.merchantCategoryCode()).isEqualTo("5411");
        assertThat(dto.authCode()).isEqualTo("123456");
        assertThat(dto.responseCode()).isEqualTo("00");
        assertThat(dto.islamicCardId()).isEqualTo(99L);
        assertThat(dto.shariahScreeningRef()).isEqualTo("SSR-100");
        assertThat(dto.shariahDecision()).isEqualTo("ALLOWED");
        assertThat(dto.status()).isEqualTo("AUTHORIZED");
        assertThat(dto.international()).isFalse();
        assertThat(dto.disputed()).isFalse();
    }

    @Test
    @DisplayName("CardMapper.toTxnResponse handles null transaction")
    void toTxnResponse_NullTxn() {
        assertThat(CardMapper.toTxnResponse(null)).isNull();
    }
}
