package com.cbs.trade;

import com.cbs.trade.entity.FactoringFacility;
import com.cbs.trade.entity.FactoringTransaction;
import com.cbs.trade.repository.FactoringFacilityRepository;
import com.cbs.trade.repository.FactoringTransactionRepository;
import com.cbs.trade.service.FactoringService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FactoringServiceTest {

    @Mock
    private FactoringFacilityRepository facilityRepository;

    @Mock
    private FactoringTransactionRepository transactionRepository;

    @InjectMocks
    private FactoringService service;

    @Test
    @DisplayName("Advance = invoiceAmount × advanceRatePct / 100")
    void approveAndFundCalculatesAdvanceCorrectly() {
        FactoringFacility facility = new FactoringFacility();
        facility.setId(1L);
        facility.setFacilityCode("FF-TEST00001");
        facility.setFacilityLimit(new BigDecimal("10000000"));
        facility.setUtilizedAmount(BigDecimal.ZERO);
        facility.setAdvanceRatePct(new BigDecimal("85.00"));
        facility.setDiscountRatePct(new BigDecimal("8.0000"));
        facility.setServiceFeeRatePct(new BigDecimal("0.5000"));
        facility.setCollectionPeriodDays(60);

        FactoringTransaction txn = new FactoringTransaction();
        txn.setId(1L);
        txn.setFacilityId(1L);
        txn.setInvoiceRef("INV-001");
        txn.setInvoiceAmount(new BigDecimal("1000000"));

        when(transactionRepository.findById(1L)).thenReturn(Optional.of(txn));
        when(facilityRepository.findById(1L)).thenReturn(Optional.of(facility));
        when(transactionRepository.save(any(FactoringTransaction.class))).thenAnswer(i -> i.getArgument(0));
        when(facilityRepository.save(any(FactoringFacility.class))).thenAnswer(i -> i.getArgument(0));

        FactoringTransaction result = service.approveAndFund(1L);

        // advance = 1,000,000 × 85 / 100 = 850,000
        assertThat(result.getAdvanceAmount()).isEqualByComparingTo(new BigDecimal("850000.0000"));
        assertThat(result.getStatus()).isEqualTo("FUNDED");
    }

    @Test
    @DisplayName("Discount = advance × discountRate × collectionDays / 36500")
    void approveAndFundCalculatesDiscountCorrectly() {
        FactoringFacility facility = new FactoringFacility();
        facility.setId(1L);
        facility.setFacilityCode("FF-TEST00002");
        facility.setFacilityLimit(new BigDecimal("10000000"));
        facility.setUtilizedAmount(BigDecimal.ZERO);
        facility.setAdvanceRatePct(new BigDecimal("80.00"));
        facility.setDiscountRatePct(new BigDecimal("10.0000"));
        facility.setServiceFeeRatePct(BigDecimal.ZERO);
        facility.setCollectionPeriodDays(90);

        FactoringTransaction txn = new FactoringTransaction();
        txn.setId(2L);
        txn.setFacilityId(1L);
        txn.setInvoiceRef("INV-002");
        txn.setInvoiceAmount(new BigDecimal("500000"));

        when(transactionRepository.findById(2L)).thenReturn(Optional.of(txn));
        when(facilityRepository.findById(1L)).thenReturn(Optional.of(facility));
        when(transactionRepository.save(any(FactoringTransaction.class))).thenAnswer(i -> i.getArgument(0));
        when(facilityRepository.save(any(FactoringFacility.class))).thenAnswer(i -> i.getArgument(0));

        FactoringTransaction result = service.approveAndFund(2L);

        // advance = 500,000 × 80 / 100 = 400,000
        // discount = 400,000 × 10 × 90 / 36500 = 9863.0137 (rounded to 4 dp)
        BigDecimal expectedDiscount = new BigDecimal("400000")
                .multiply(new BigDecimal("10.0000"))
                .multiply(new BigDecimal("90"))
                .divide(new BigDecimal("36500"), 4, RoundingMode.HALF_UP);
        assertThat(result.getDiscountAmount()).isEqualByComparingTo(expectedDiscount);

        // net = advance - discount
        BigDecimal expectedNet = new BigDecimal("400000.0000").subtract(expectedDiscount);
        assertThat(result.getNetProceedsToSeller()).isEqualByComparingTo(expectedNet);
    }
}
