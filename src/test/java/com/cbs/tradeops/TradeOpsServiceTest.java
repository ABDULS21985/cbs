package com.cbs.tradeops;

import com.cbs.tradeops.entity.ClearingSubmission;
import com.cbs.tradeops.entity.TradeConfirmation;
import com.cbs.tradeops.repository.ClearingSubmissionRepository;
import com.cbs.tradeops.repository.OrderAllocationRepository;
import com.cbs.tradeops.repository.TradeConfirmationRepository;
import com.cbs.tradeops.repository.TradeReportRepository;
import com.cbs.tradeops.service.TradeOpsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TradeOpsServiceTest {

    @Mock
    private TradeConfirmationRepository confirmationRepository;

    @Mock
    private OrderAllocationRepository allocationRepository;

    @Mock
    private TradeReportRepository reportRepository;

    @Mock
    private ClearingSubmissionRepository clearingRepository;

    @InjectMocks
    private TradeOpsService service;

    @Test
    @DisplayName("Matching auto-detects breaks when details differ")
    void matchingAutoDetectsBreaks() {
        TradeConfirmation a = new TradeConfirmation();
        a.setId(1L);
        a.setConfirmationRef("TC-AAAAAAAAAA");
        a.setOurDetails(Map.of("amount", "1000000", "rate", "1.25"));
        a.setMatchStatus("UNMATCHED");
        a.setStatus("PENDING");

        TradeConfirmation b = new TradeConfirmation();
        b.setId(2L);
        b.setConfirmationRef("TC-BBBBBBBBBB");
        b.setOurDetails(Map.of("amount", "1000000", "rate", "1.30"));
        b.setMatchStatus("UNMATCHED");
        b.setStatus("PENDING");

        when(confirmationRepository.findByConfirmationRef("TC-AAAAAAAAAA")).thenReturn(Optional.of(a));
        when(confirmationRepository.findByConfirmationRef("TC-BBBBBBBBBB")).thenReturn(Optional.of(b));
        when(confirmationRepository.save(any(TradeConfirmation.class))).thenAnswer(i -> i.getArgument(0));

        List<TradeConfirmation> results = service.matchConfirmation("TC-AAAAAAAAAA", "TC-BBBBBBBBBB");

        assertThat(results).hasSize(2);
        assertThat(results.get(0).getMatchStatus()).isEqualTo("DISPUTED");
        assertThat(results.get(0).getBreakFields()).containsKey("rate");
        assertThat(results.get(0).getBreakFields()).doesNotContainKey("amount");
    }

    @Test
    @DisplayName("Clearing submission sets SUBMITTED status and timestamp")
    void clearingSubmissionLifecycle() {
        ClearingSubmission submission = new ClearingSubmission();
        submission.setCcpName("LCH");
        submission.setTradeRef("T-001");
        submission.setInstrumentType("IRS");
        submission.setTradeDate(LocalDate.now());
        submission.setCurrency("USD");
        submission.setNotionalAmount(new BigDecimal("5000000"));

        when(clearingRepository.save(any(ClearingSubmission.class))).thenAnswer(i -> i.getArgument(0));

        ClearingSubmission result = service.submitForClearing(submission);

        assertThat(result.getSubmissionRef()).startsWith("CS-");
        assertThat(result.getStatus()).isEqualTo("SUBMITTED");
        assertThat(result.getSubmittedAt()).isNotNull();
    }
}
