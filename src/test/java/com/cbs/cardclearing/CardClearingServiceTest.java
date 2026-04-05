package com.cbs.cardclearing;

import com.cbs.cardclearing.entity.*;
import com.cbs.cardclearing.repository.*;
import com.cbs.cardclearing.service.CardClearingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CardClearingServiceTest {

    @Mock private CardClearingBatchRepository batchRepository;
    @Mock private CardSettlementPositionRepository positionRepository;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private CardClearingService service;

    @Test @DisplayName("Net settlement = total - fees - interchange")
    void netSettlementCalc() {
        when(batchRepository.save(any())).thenAnswer(inv -> { CardClearingBatch b = inv.getArgument(0); b.setId(1L); return b; });
        CardClearingBatch batch = CardClearingBatch.builder().network("VISA").batchType("CLEARING")
                .clearingDate(LocalDate.now()).currency("USD").totalTransactions(500)
                .totalAmount(new BigDecimal("1000000")).totalFees(new BigDecimal("15000"))
                .interchangeAmount(new BigDecimal("8000")).build();

        CardClearingBatch result = service.ingestBatch(batch);
        // net = 1000000 - 15000 - 8000 = 977000
        assertThat(result.getNetSettlementAmount()).isEqualByComparingTo(new BigDecimal("977000"));
        assertThat(result.getBatchId()).startsWith("CCB-");
    }

    @Test @DisplayName("Settlement position calculates net from debits/credits/interchange/fees")
    void positionNetCalc() {
        when(positionRepository.save(any())).thenAnswer(inv -> { CardSettlementPosition p = inv.getArgument(0); p.setId(1L); return p; });
        CardSettlementPosition pos = CardSettlementPosition.builder()
                .settlementDate(LocalDate.now()).network("MASTERCARD").currency("USD")
                .grossDebits(new BigDecimal("500000")).grossCredits(new BigDecimal("800000"))
                .interchangeReceivable(new BigDecimal("5000")).interchangePayable(new BigDecimal("3000"))
                .schemeFees(new BigDecimal("2000")).build();

        CardSettlementPosition result = service.createPosition(pos);
        // net = 800000 - 500000 + 5000 - 3000 - 2000 = 300000
        assertThat(result.getNetPosition()).isEqualByComparingTo(new BigDecimal("300000"));
    }
}
