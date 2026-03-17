package com.cbs.bankdraft;

import com.cbs.common.exception.BusinessException;
import com.cbs.bankdraft.entity.BankDraft;
import com.cbs.bankdraft.repository.BankDraftRepository;
import com.cbs.bankdraft.service.BankDraftService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BankDraftServiceTest {

    @Mock private BankDraftRepository draftRepository;
    @InjectMocks private BankDraftService bankDraftService;

    @Test @DisplayName("Issued draft has 6-month expiry and serial number")
    void issueDraft() {
        when(draftRepository.save(any())).thenAnswer(inv -> { BankDraft d = inv.getArgument(0); d.setId(1L); return d; });
        BankDraft draft = BankDraft.builder().customerId(1L).debitAccountId(100L)
                .draftType("DEMAND_DRAFT").payeeName("Supplier Corp").amount(new BigDecimal("50000")).build();
        BankDraft result = bankDraftService.issue(draft);
        assertThat(result.getDraftNumber()).startsWith("DD-");
        assertThat(result.getExpiryDate()).isEqualTo(LocalDate.now().plusMonths(6));
        assertThat(result.getSerialNumber()).startsWith("SER-");
        assertThat(result.getStatus()).isEqualTo("ISSUED");
    }

    @Test @DisplayName("Full lifecycle: ISSUED → PRESENTED → PAID")
    void fullLifecycle() {
        BankDraft draft = BankDraft.builder().id(1L).draftNumber("DD-LIFECYCLE")
                .status("ISSUED").expiryDate(LocalDate.now().plusMonths(3)).build();
        when(draftRepository.findByDraftNumber("DD-LIFECYCLE")).thenReturn(Optional.of(draft));
        when(draftRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        BankDraft presented = bankDraftService.present("DD-LIFECYCLE");
        assertThat(presented.getStatus()).isEqualTo("PRESENTED");
        assertThat(presented.getPresentedAt()).isNotNull();

        BankDraft paid = bankDraftService.pay("DD-LIFECYCLE");
        assertThat(paid.getStatus()).isEqualTo("PAID");
        assertThat(paid.getPaidAt()).isNotNull();
    }

    @Test @DisplayName("Cannot stop a paid draft")
    void cannotStopPaid() {
        BankDraft paid = BankDraft.builder().id(1L).draftNumber("DD-PAID").status("PAID").build();
        when(draftRepository.findByDraftNumber("DD-PAID")).thenReturn(Optional.of(paid));
        assertThatThrownBy(() -> bankDraftService.stopPayment("DD-PAID", "Error"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("paid");
    }

    @Test @DisplayName("Reissue creates new draft and links to original")
    void reissueDraft() {
        BankDraft stopped = BankDraft.builder().id(1L).draftNumber("DD-STOPPED").status("STOPPED")
                .customerId(1L).debitAccountId(100L).draftType("DEMAND_DRAFT")
                .payeeName("Vendor").amount(new BigDecimal("25000")).build();
        when(draftRepository.findByDraftNumber("DD-STOPPED")).thenReturn(Optional.of(stopped));
        when(draftRepository.save(any())).thenAnswer(inv -> { BankDraft d = inv.getArgument(0); if (d.getId() == null) d.setId(2L); return d; });

        BankDraft reissued = bankDraftService.reissue("DD-STOPPED");
        assertThat(reissued.getDraftNumber()).startsWith("DD-");
        assertThat(reissued.getDraftNumber()).isNotEqualTo("DD-STOPPED");
        assertThat(stopped.getReissuedAs()).isEqualTo(reissued.getDraftNumber());
        assertThat(stopped.getStatus()).isEqualTo("REISSUED");
    }
}
