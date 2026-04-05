package com.cbs.card;

import com.cbs.account.entity.Account;
import com.cbs.card.controller.CardController;
import com.cbs.card.dto.CardTransactionAdjustmentRequest;
import com.cbs.card.entity.Card;
import com.cbs.card.entity.CardScheme;
import com.cbs.card.entity.CardStatus;
import com.cbs.card.entity.CardTransaction;
import com.cbs.card.entity.CardType;
import com.cbs.card.repository.CardRepository;
import com.cbs.card.service.CardService;
import com.cbs.common.exception.GlobalExceptionHandler;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.Instant;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CardControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock private CardService cardService;
    @Mock private CardRepository cardRepository;

    @InjectMocks private CardController controller;

    private CardTransaction sampleAdjustment;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        Customer customer = Customer.builder()
                .id(1L)
                .firstName("Amina")
                .lastName("Bello")
                .customerType(CustomerType.INDIVIDUAL)
                .build();
        Account account = Account.builder()
                .id(10L)
                .accountNumber("1000000010")
                .customer(customer)
                .currencyCode("USD")
                .build();
        Card card = Card.builder()
                .id(20L)
                .cardReference("CRD-ADJ-001")
                .account(account)
                .customer(customer)
                .cardType(CardType.DEBIT)
                .cardScheme(CardScheme.VISA)
                .cardholderName("AMINA BELLO")
                .currencyCode("USD")
                .status(CardStatus.ACTIVE)
                .build();
        CardTransaction original = CardTransaction.builder()
                .id(30L)
                .transactionRef("CTX-ORIGINAL-001")
                .card(card)
                .account(account)
                .transactionType("PURCHASE")
                .channel("POS")
                .amount(new BigDecimal("5000.00"))
                .currencyCode("USD")
                .billingAmount(new BigDecimal("5000.00"))
                .billingCurrency("USD")
                .status("AUTHORIZED")
                .transactionDate(Instant.now())
                .build();
        sampleAdjustment = CardTransaction.builder()
                .id(31L)
                .transactionRef("REF-1234567890AB")
                .card(card)
                .account(account)
                .transactionType("REFUND")
                .channel("SYSTEM")
                .amount(new BigDecimal("1000.00"))
                .currencyCode("USD")
                .billingAmount(new BigDecimal("1000.00"))
                .billingCurrency("USD")
                .originalTransaction(original)
                .originalTransactionRef("CTX-ORIGINAL-001")
                .adjustmentReason("Merchant refund")
                .status("SETTLED")
                .transactionDate(Instant.now())
                .build();
    }

    @Test
    @DisplayName("POST /v1/cards/transactions/{txnId}/refund returns the mapped refund transaction")
    void refund_ReturnsAdjustment() throws Exception {
        when(cardService.refundTransaction(eq(30L), eq(new BigDecimal("1000.00")), eq("Merchant refund")))
                .thenReturn(sampleAdjustment);

        mockMvc.perform(post("/v1/cards/transactions/30/refund")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CardTransactionAdjustmentRequest(
                                new BigDecimal("1000.00"),
                                "Merchant refund"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.transactionType").value("REFUND"))
                .andExpect(jsonPath("$.data.originalTransactionRef").value("CTX-ORIGINAL-001"))
                .andExpect(jsonPath("$.data.adjustmentReason").value("Merchant refund"))
                .andExpect(jsonPath("$.data.billingAmount").value(1000.00));

        verify(cardService).refundTransaction(30L, new BigDecimal("1000.00"), "Merchant refund");
    }

    @Test
    @DisplayName("POST /v1/cards/transactions/{txnId}/reversal returns the mapped reversal transaction")
    void reversal_ReturnsAdjustment() throws Exception {
        CardTransaction reversal = CardTransaction.builder()
                .id(32L)
                .transactionRef("REV-1234567890AB")
                .card(sampleAdjustment.getCard())
                .account(sampleAdjustment.getAccount())
                .transactionType("REVERSAL")
                .channel("SYSTEM")
                .amount(new BigDecimal("5000.00"))
                .currencyCode("USD")
                .billingAmount(new BigDecimal("5000.00"))
                .billingCurrency("USD")
                .originalTransaction(sampleAdjustment.getOriginalTransaction())
                .originalTransactionRef("CTX-ORIGINAL-001")
                .adjustmentReason("Terminal timeout")
                .status("SETTLED")
                .transactionDate(Instant.now())
                .build();
        when(cardService.reverseTransaction(eq(30L), eq(new BigDecimal("5000.00")), eq("Terminal timeout")))
                .thenReturn(reversal);

        mockMvc.perform(post("/v1/cards/transactions/30/reversal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CardTransactionAdjustmentRequest(
                                new BigDecimal("5000.00"),
                                "Terminal timeout"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.transactionType").value("REVERSAL"))
                .andExpect(jsonPath("$.data.originalTransactionRef").value("CTX-ORIGINAL-001"))
                .andExpect(jsonPath("$.data.adjustmentReason").value("Terminal timeout"));

        verify(cardService).reverseTransaction(30L, new BigDecimal("5000.00"), "Terminal timeout");
    }

    @Test
    @DisplayName("POST /v1/cards/transactions/{txnId}/refund rejects an empty reason")
    void refund_ValidationFailure() throws Exception {
        mockMvc.perform(post("/v1/cards/transactions/30/refund")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CardTransactionAdjustmentRequest(
                                new BigDecimal("1000.00"),
                                ""
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.reason").value("reason is required"));
    }
}