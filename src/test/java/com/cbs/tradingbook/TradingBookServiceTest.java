package com.cbs.tradingbook;

import com.cbs.common.exception.BusinessException;
import com.cbs.tradingbook.entity.TradingBook;
import com.cbs.tradingbook.entity.TradingBookSnapshot;
import com.cbs.tradingbook.repository.TradingBookRepository;
import com.cbs.tradingbook.repository.TradingBookSnapshotRepository;
import com.cbs.tradingbook.service.TradingBookService;
import com.cbs.tradingmodel.entity.TradingModel;
import com.cbs.tradingmodel.repository.TradingModelRepository;
import com.cbs.tradingmodel.service.TradingModelService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TradingBookServiceTest {

    @Mock
    private TradingBookRepository bookRepository;

    @Mock
    private TradingBookSnapshotRepository snapshotRepository;

    @Mock
    private TradingModelRepository modelRepository;

    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks
    private TradingBookService bookService;

    @InjectMocks
    private TradingModelService modelService;

    @Test
    @DisplayName("EOD snapshot captures current book state")
    void eodSnapshotCapturesBookState() {
        TradingBook book = new TradingBook();
        book.setId(1L);
        book.setBookCode("TB-TEST");
        book.setBookType("FX");
        book.setPositionCount(50);
        book.setGrossPositionValue(new BigDecimal("10000000"));
        book.setNetPositionValue(new BigDecimal("5000000"));
        book.setDailyPnl(new BigDecimal("250000"));
        book.setVarAmount(new BigDecimal("150000"));
        book.setCapitalRequirement(new BigDecimal("800000"));

        when(bookRepository.findById(1L)).thenReturn(Optional.of(book));
        when(snapshotRepository.save(any(TradingBookSnapshot.class))).thenAnswer(i -> i.getArgument(0));

        TradingBookSnapshot snapshot = bookService.takeEodSnapshot(1L);

        assertThat(snapshot.getSnapshotType()).isEqualTo("EOD");
        assertThat(snapshot.getPositionCount()).isEqualTo(50);
        assertThat(snapshot.getGrossPositionValue()).isEqualByComparingTo(new BigDecimal("10000000"));
        assertThat(snapshot.getNetPositionValue()).isEqualByComparingTo(new BigDecimal("5000000"));
        assertThat(snapshot.getCapitalCharge()).isEqualByComparingTo(new BigDecimal("800000"));
    }

    @Test
    @DisplayName("Deploy to production rejects non-APPROVED model")
    void deployRejectsNonApprovedModel() {
        TradingModel model = new TradingModel();
        model.setId(1L);
        model.setModelCode("TM-TEST");
        model.setValidationResult("PENDING");
        model.setStatus("VALIDATION");

        when(modelRepository.findById(1L)).thenReturn(Optional.of(model));

        assertThatThrownBy(() -> modelService.deployToProduction(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("APPROVED");
    }
}
