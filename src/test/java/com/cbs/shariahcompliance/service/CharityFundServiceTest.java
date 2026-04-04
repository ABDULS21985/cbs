package com.cbs.shariahcompliance.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.shariahcompliance.dto.CharityFundDtos;
import com.cbs.shariahcompliance.entity.CharityCategory;
import com.cbs.shariahcompliance.entity.CharityRecipient;
import com.cbs.shariahcompliance.repository.CharityFundBatchDisbursementRepository;
import com.cbs.shariahcompliance.repository.CharityFundLedgerEntryRepository;
import com.cbs.shariahcompliance.repository.CharityRecipientRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import org.junit.jupiter.api.DisplayName;
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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CharityFundServiceTest {

    @Mock private CharityFundLedgerEntryRepository ledgerRepository;
    @Mock private CharityFundBatchDisbursementRepository batchRepository;
    @Mock private CharityRecipientRepository recipientRepository;
    @Mock private com.cbs.gl.service.GeneralLedgerService generalLedgerService;
    @Mock private CurrentActorProvider actorProvider;
    @Mock private CurrentTenantResolver tenantResolver;

    @InjectMocks private CharityFundService service;

    @Test
    @DisplayName("inflow breakdown separates late penalties by contract type")
    void getInflowBreakdown_separatesLatePenaltyByContractType() {
        when(ledgerRepository.sumInflowsBySourceTypeAndSourceContractTypeBetween(
                "LATE_PAYMENT_PENALTY", "MURABAHA", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 3, 31)))
                .thenReturn(new BigDecimal("600.00"));
        when(ledgerRepository.sumInflowsBySourceTypeAndSourceContractTypeBetween(
                "LATE_PAYMENT_PENALTY", "IJARAH", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 3, 31)))
                .thenReturn(new BigDecimal("300.00"));
        when(ledgerRepository.sumInflowsBySourceTypeAndSourceContractTypeBetween(
                "LATE_PAYMENT_PENALTY", "MUSHARAKAH", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 3, 31)))
                .thenReturn(new BigDecimal("100.00"));
        when(ledgerRepository.sumInflowsBySourceTypeBetween(
                "SNCI_PURIFICATION", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 3, 31)))
                .thenReturn(new BigDecimal("250.00"));

        CharityFundDtos.CharityFundBreakdown breakdown = service.getInflowBreakdown(
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 3, 31));

        assertThat(breakdown.getLatePenaltiesByContractType())
                .containsEntry("MURABAHA", new BigDecimal("600.00"))
                .containsEntry("IJARAH", new BigDecimal("300.00"))
                .containsEntry("MUSHARAKAH", new BigDecimal("100.00"));
        assertThat(breakdown.getSnciByType()).containsEntry("SNCI_PURIFICATION", new BigDecimal("250.00"));
    }

    @Test
    @DisplayName("direct disbursement rejects recipients without active SSB approval")
    void disburseFunds_rejectsUnapprovedRecipient() {
        when(recipientRepository.findById(10L)).thenReturn(Optional.of(
                CharityRecipient.builder()
                        .id(10L)
                        .recipientCode("CHR-10")
                        .name("Unapproved Charity")
                        .category(CharityCategory.EDUCATION)
                        .ssbApproved(false)
                        .status("INACTIVE")
                        .build()));

        assertThatThrownBy(() -> service.disburseFunds(CharityFundDtos.DisburseFundsRequest.builder()
                .charityRecipientId(10L)
                .amount(new BigDecimal("100.00"))
                .currencyCode("SAR")
                .reference("DISB-1")
                .build()))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo("CHARITY_RECIPIENT_NOT_APPROVED");
    }
}
