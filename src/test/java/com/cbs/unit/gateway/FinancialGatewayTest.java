package com.cbs.unit.gateway;

import com.cbs.achops.entity.AchBatch;
import com.cbs.achops.repository.AchBatchRepository;
import com.cbs.achops.service.AchService;
import com.cbs.cardswitch.entity.CardSwitchTransaction;
import com.cbs.cardswitch.repository.CardSwitchTransactionRepository;
import com.cbs.cardswitch.service.CardSwitchService;
import com.cbs.common.guard.SyntheticCapabilityGuard;
import com.cbs.common.exception.BusinessException;
import com.cbs.fingateway.entity.FinancialGateway;
import com.cbs.fingateway.entity.GatewayMessage;
import com.cbs.fingateway.repository.FinancialGatewayRepository;
import com.cbs.fingateway.repository.GatewayMessageRepository;
import com.cbs.fingateway.service.FinancialGatewayService;
import com.cbs.merchant.entity.MerchantProfile;
import com.cbs.merchant.repository.MerchantProfileRepository;
import com.cbs.merchant.service.MerchantService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Financial Gateway - Messaging, Card Switch, Clearing, ACH & Merchant")
class FinancialGatewayTest {

    // ── Financial Gateway Service ────────────────────────────────

    @Nested
    @DisplayName("Financial Gateway Service")
    class GatewayServiceTests {

        @Mock private FinancialGatewayRepository gatewayRepository;
        @Mock private GatewayMessageRepository messageRepository;
        @InjectMocks private FinancialGatewayService financialGatewayService;

        @BeforeEach
        void setUp() {
            SyntheticCapabilityGuard.enableSyntheticServicesForTesting();
        }

        @Test
        @DisplayName("sendMessage assigns ref, sanctions check, and delivers when gateway is CONNECTED")
        void sendMessage_connectedGateway_sendsSuccessfully() {
            FinancialGateway gw = FinancialGateway.builder()
                    .id(1L).gatewayCode("SWIFT-01").gatewayName("SWIFT Gateway")
                    .gatewayType("SWIFT").protocol("ISO20022")
                    .connectionStatus("CONNECTED").messagesToday(5)
                    .valueToday(BigDecimal.valueOf(100000)).build();
            GatewayMessage msg = GatewayMessage.builder()
                    .gatewayId(1L).direction("OUTBOUND").messageType("MT103")
                    .messageFormat("ISO20022").amount(BigDecimal.valueOf(50000))
                    .currency("USD").build();

            when(gatewayRepository.findById(1L)).thenReturn(Optional.of(gw));
            when(gatewayRepository.save(any(FinancialGateway.class))).thenAnswer(inv -> inv.getArgument(0));
            when(messageRepository.save(any(GatewayMessage.class))).thenAnswer(inv -> inv.getArgument(0));

            GatewayMessage result = financialGatewayService.sendMessage(msg);

            assertThat(result.getMessageRef()).startsWith("GW-");
            assertThat(result.getDeliveryStatus()).isEqualTo("SENT");
            assertThat(result.getSanctionsChecked()).isTrue();
            assertThat(result.getSanctionsResult()).isEqualTo("CLEAR");
            assertThat(result.getDeliveryAttempts()).isEqualTo(1);
            assertThat(gw.getMessagesToday()).isEqualTo(6);
        }

        @Test
        @DisplayName("sendMessage throws BusinessException when gateway is DISCONNECTED")
        void sendMessage_disconnectedGateway_throwsException() {
            FinancialGateway gw = FinancialGateway.builder()
                    .id(2L).gatewayCode("SWIFT-02").gatewayName("Backup SWIFT")
                    .gatewayType("SWIFT").protocol("ISO20022")
                    .connectionStatus("DISCONNECTED").build();
            GatewayMessage msg = GatewayMessage.builder()
                    .gatewayId(2L).direction("OUTBOUND").messageType("MT202")
                    .messageFormat("ISO20022").build();

            when(gatewayRepository.findById(2L)).thenReturn(Optional.of(gw));

            assertThatThrownBy(() -> financialGatewayService.sendMessage(msg))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Gateway not connected");
        }

        @Test
        @DisplayName("acknowledgeMessage sets ACKNOWLEDGED status and ack reference")
        void acknowledgeMessage_setsStatusAndRef() {
            GatewayMessage msg = GatewayMessage.builder()
                    .id(10L).messageRef("GW-ABC123").deliveryStatus("SENT")
                    .gatewayId(1L).direction("OUTBOUND").messageType("MT103")
                    .messageFormat("ISO20022").build();

            when(messageRepository.findByMessageRef("GW-ABC123")).thenReturn(Optional.of(msg));
            when(messageRepository.save(any(GatewayMessage.class))).thenAnswer(inv -> inv.getArgument(0));

            GatewayMessage result = financialGatewayService.acknowledgeMessage("GW-ABC123", "ACK-REF-001");

            assertThat(result.getDeliveryStatus()).isEqualTo("ACKNOWLEDGED");
            assertThat(result.getAckReference()).isEqualTo("ACK-REF-001");
            assertThat(result.getAckAt()).isNotNull();
        }
    }

    // ── Card Switch Service ──────────────────────────────────────

    @Nested
    @DisplayName("Card Switch Service")
    class CardSwitchTests {

        @Mock private CardSwitchTransactionRepository repository;
        @InjectMocks private CardSwitchService cardSwitchService;

        @Test
        @DisplayName("processTransaction generates switchRef and marks approved for response code 00")
        void processTransaction_approved_setsRefAndNotDeclined() {
            CardSwitchTransaction txn = CardSwitchTransaction.builder()
                    .transactionType("PURCHASE").cardHash("hash123").cardScheme("VISA")
                    .merchantId("MCH-001").amount(BigDecimal.valueOf(250))
                    .responseCode("00").build();

            when(repository.save(any(CardSwitchTransaction.class))).thenAnswer(inv -> inv.getArgument(0));

            CardSwitchTransaction result = cardSwitchService.processTransaction(txn);

            assertThat(result.getSwitchRef()).startsWith("CSW-");
            assertThat(result.getIsDeclined()).isFalse();
            assertThat(result.getProcessedAt()).isNotNull();
        }

        @Test
        @DisplayName("processTransaction marks declined for non-00 response code")
        void processTransaction_declined_isDeclinedTrue() {
            CardSwitchTransaction txn = CardSwitchTransaction.builder()
                    .transactionType("PURCHASE").cardHash("hash456").cardScheme("MASTERCARD")
                    .merchantId("MCH-002").amount(BigDecimal.valueOf(9999))
                    .responseCode("51").build();

            when(repository.save(any(CardSwitchTransaction.class))).thenAnswer(inv -> inv.getArgument(0));

            CardSwitchTransaction result = cardSwitchService.processTransaction(txn);

            assertThat(result.getIsDeclined()).isTrue();
        }
    }

    // ── ACH Service ──────────────────────────────────────────────

    @Nested
    @DisplayName("ACH Service")
    class AchTests {

        @Mock private AchBatchRepository batchRepository;
        @InjectMocks private AchService achService;

        @Test
        @DisplayName("submit transitions CREATED batch to SUBMITTED with timestamp")
        void submit_createdBatch_setsSubmitted() {
            AchBatch batch = AchBatch.builder()
                    .id(1L).batchId("ACH-BATCH001").achOperator("FED")
                    .batchType("CREDIT").originatorId("ORG-001").originatorName("Corp Inc")
                    .originatorAccountId(500L).effectiveDate(LocalDate.now())
                    .status("CREATED").build();

            when(batchRepository.findByBatchId("ACH-BATCH001")).thenReturn(Optional.of(batch));
            when(batchRepository.save(any(AchBatch.class))).thenAnswer(inv -> inv.getArgument(0));

            AchBatch result = achService.submit("ACH-BATCH001");

            assertThat(result.getStatus()).isEqualTo("SUBMITTED");
            assertThat(result.getSubmittedAt()).isNotNull();
        }

        @Test
        @DisplayName("submit throws BusinessException when batch is already SETTLED")
        void submit_settledBatch_throwsException() {
            AchBatch batch = AchBatch.builder()
                    .id(2L).batchId("ACH-SETTLED1").achOperator("FED")
                    .batchType("DEBIT").originatorId("ORG-002").originatorName("Debit Corp")
                    .originatorAccountId(501L).effectiveDate(LocalDate.now())
                    .status("SETTLED").build();

            when(batchRepository.findByBatchId("ACH-SETTLED1")).thenReturn(Optional.of(batch));

            assertThatThrownBy(() -> achService.submit("ACH-SETTLED1"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("not ready for submission");
        }
    }

    // ── Merchant Service ─────────────────────────────────────────

    @Nested
    @DisplayName("Merchant Service")
    class MerchantTests {

        @Mock private MerchantProfileRepository merchantRepository;
        @InjectMocks private MerchantService merchantService;

        @Test
        @DisplayName("activate throws BusinessException for PROHIBITED risk category merchant")
        void activate_prohibitedMerchant_throwsException() {
            MerchantProfile merchant = MerchantProfile.builder()
                    .id(1L).merchantId("MCH-PROHIB01").merchantName("Blocked Shop")
                    .merchantCategoryCode("5999").businessType("RETAIL")
                    .mdrRate(BigDecimal.valueOf(2.5)).riskCategory("PROHIBITED")
                    .status("PENDING").build();

            when(merchantRepository.findByMerchantId("MCH-PROHIB01")).thenReturn(Optional.of(merchant));

            assertThatThrownBy(() -> merchantService.activate("MCH-PROHIB01"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Cannot activate PROHIBITED merchant");
        }
    }
}
