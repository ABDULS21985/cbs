package com.cbs.syndicatedloan;

import com.cbs.common.exception.BusinessException;
import com.cbs.syndicatedloan.entity.SyndicateDrawdown;
import com.cbs.syndicatedloan.entity.SyndicatedLoanFacility;
import com.cbs.syndicatedloan.repository.SyndicateDrawdownRepository;
import com.cbs.syndicatedloan.repository.SyndicateParticipantRepository;
import com.cbs.syndicatedloan.repository.SyndicatedLoanFacilityRepository;
import com.cbs.syndicatedloan.service.SyndicatedLoanService;
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
class SyndicatedLoanServiceTest {

    @Mock
    private SyndicatedLoanFacilityRepository facilityRepository;

    @Mock
    private SyndicateParticipantRepository participantRepository;

    @Mock
    private SyndicateDrawdownRepository drawdownRepository;

    @InjectMocks
    private SyndicatedLoanService service;

    @Test
    @DisplayName("Fund drawdown updates facility drawn and undrawn amounts")
    void fundDrawdownUpdatesFacilityAmounts() {
        SyndicatedLoanFacility facility = new SyndicatedLoanFacility();
        facility.setId(1L);
        facility.setFacilityCode("SLF-TEST00001");
        facility.setTotalFacilityAmount(new BigDecimal("10000000"));
        facility.setDrawnAmount(new BigDecimal("2000000"));
        facility.setUndrawnAmount(new BigDecimal("8000000"));

        SyndicateDrawdown drawdown = new SyndicateDrawdown();
        drawdown.setId(1L);
        drawdown.setDrawdownRef("SDD-TEST00001");
        drawdown.setFacilityId(1L);
        drawdown.setAmount(new BigDecimal("3000000"));
        drawdown.setStatus("APPROVED");

        when(drawdownRepository.findByDrawdownRef("SDD-TEST00001")).thenReturn(Optional.of(drawdown));
        when(facilityRepository.findById(1L)).thenReturn(Optional.of(facility));
        when(facilityRepository.save(any(SyndicatedLoanFacility.class))).thenAnswer(i -> i.getArgument(0));
        when(drawdownRepository.save(any(SyndicateDrawdown.class))).thenAnswer(i -> i.getArgument(0));

        SyndicateDrawdown result = service.fundDrawdown("SDD-TEST00001");

        assertThat(result.getStatus()).isEqualTo("FUNDED");
        assertThat(facility.getDrawnAmount()).isEqualByComparingTo(new BigDecimal("5000000"));
        assertThat(facility.getUndrawnAmount()).isEqualByComparingTo(new BigDecimal("5000000"));
    }

    @Test
    @DisplayName("Fund drawdown rejects non-APPROVED drawdowns")
    void fundDrawdownRejectsNonApproved() {
        SyndicateDrawdown drawdown = new SyndicateDrawdown();
        drawdown.setId(1L);
        drawdown.setDrawdownRef("SDD-TEST00002");
        drawdown.setStatus("REQUESTED");

        when(drawdownRepository.findByDrawdownRef("SDD-TEST00002")).thenReturn(Optional.of(drawdown));

        assertThatThrownBy(() -> service.fundDrawdown("SDD-TEST00002"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("must be APPROVED");
    }
}
