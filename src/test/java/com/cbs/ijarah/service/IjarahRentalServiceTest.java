package com.cbs.ijarah.service;

import com.cbs.account.repository.AccountRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.ijarah.dto.IjarahRequests;
import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.entity.IjarahRentalInstallment;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.ijarah.repository.IjarahRentalInstallmentRepository;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IjarahRentalServiceTest {

    @Mock private IjarahContractRepository contractRepository;
    @Mock private IjarahRentalInstallmentRepository installmentRepository;
    @Mock private HijriCalendarService hijriCalendarService;
    @Mock private IslamicPostingRuleService postingRuleService;
    @Mock private AccountRepository accountRepository;
    @Mock private PoolAssetManagementService poolAssetManagementService;

    @InjectMocks
    private IjarahRentalService service;

    @Test
    void applyRentalReview_beforeAgreedDate_rejected() {
        IjarahContract contract = IjarahContract.builder()
                .id(1L)
                .nextRentalReviewDate(LocalDate.now().plusDays(7))
                .build();
        when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));

        assertThatThrownBy(() -> service.applyRentalReview(1L, new BigDecimal("1250.00"), LocalDate.now()))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("SHARIAH-IJR-005");
    }

    @Test
    void processRentalPayment_postsIncomeAndMarksInstallmentPaid() {
        LocalDate today = LocalDate.now();
        IjarahContract contract = IjarahContract.builder()
                .id(1L)
                .contractRef("IJR-FIN-2026-000001")
                .accountId(100L)
                .currencyCode("SAR")
                .status(IjarahDomainEnums.ContractStatus.ACTIVE)
                .investmentPoolId(55L)
                .poolAssetAssignmentId(77L)
                .totalLatePenalties(BigDecimal.ZERO)
                .totalCharityFromLatePenalties(BigDecimal.ZERO)
                .totalRentalsReceived(BigDecimal.ZERO)
                .totalRentalArrears(BigDecimal.ZERO)
                .totalRentalsExpected(new BigDecimal("1000.00"))
                .build();
        IjarahRentalInstallment installment = IjarahRentalInstallment.builder()
                .id(10L)
                .contractId(1L)
                .installmentNumber(1)
                .dueDate(today)
                .rentalAmount(new BigDecimal("1000.00"))
                .netRentalAmount(new BigDecimal("1000.00"))
                .status(IjarahDomainEnums.RentalInstallmentStatus.DUE)
                .paidAmount(BigDecimal.ZERO)
                .latePenaltyAmount(BigDecimal.ZERO)
                .build();

        when(contractRepository.findById(1L)).thenReturn(Optional.of(contract));
        when(installmentRepository.findByContractIdOrderByInstallmentNumberAsc(1L))
                .thenReturn(List.of(installment));
        when(installmentRepository.findByContractIdAndStatusInOrderByInstallmentNumberAsc(any(), any()))
                .thenReturn(List.of(installment));
        when(installmentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(contractRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(postingRuleService.postIslamicTransaction(any()))
                .thenReturn(JournalEntry.builder().journalNumber("JRN-100").build());

        IjarahRequests.ProcessRentalPaymentRequest request = IjarahRequests.ProcessRentalPaymentRequest.builder()
                .paymentAmount(new BigDecimal("1000.00"))
                .paymentDate(today)
                .narration("Rental payment")
                .build();

        IjarahRentalInstallment result = service.processRentalPayment(1L, request);

        assertThat(result.getStatus()).isEqualTo(IjarahDomainEnums.RentalInstallmentStatus.PAID);
        assertThat(result.getPaidAmount()).isEqualByComparingTo("1000.00");
        assertThat(contract.getTotalRentalsReceived()).isEqualByComparingTo("1000.00");
        verify(poolAssetManagementService).recordIncome(any(), any());
        verify(postingRuleService).postIslamicTransaction(any());
    }
}
