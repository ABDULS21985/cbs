package com.cbs.collections;

import com.cbs.collections.dto.CollectionActionDto;
import com.cbs.collections.dto.CollectionCaseResponse;
import com.cbs.collections.entity.*;
import com.cbs.collections.repository.*;
import com.cbs.collections.service.CollectionsService;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.lending.entity.LoanAccount;
import com.cbs.lending.entity.LoanAccountStatus;
import com.cbs.lending.entity.LoanProduct;
import com.cbs.lending.entity.LoanType;
import com.cbs.lending.repository.LoanAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CollectionsServiceTest {

    @Mock private CollectionCaseRepository caseRepository;
    @Mock private CollectionActionRepository actionRepository;
    @Mock private LoanAccountRepository loanAccountRepository;

    @InjectMocks private CollectionsService collectionsService;

    private LoanAccount delinquentLoan;
    private Customer customer;

    @BeforeEach
    void setUp() {
        customer = Customer.builder().id(1L).firstName("Test").lastName("User")
                .customerType(CustomerType.INDIVIDUAL).build();
        LoanProduct product = LoanProduct.builder().id(1L).code("PL-USD").loanType(LoanType.PERSONAL).build();
        delinquentLoan = LoanAccount.builder()
                .id(1L).loanNumber("LN000000600001")
                .customer(customer).loanProduct(product).currencyCode("USD")
                .outstandingPrincipal(new BigDecimal("50000"))
                .accruedInterest(new BigDecimal("1500.0000"))
                .totalPenalties(new BigDecimal("500"))
                .totalPenaltiesPaid(BigDecimal.ZERO)
                .daysPastDue(45).delinquencyBucket("31-60")
                .status(LoanAccountStatus.DELINQUENT).build();
    }

    @Test
    @DisplayName("Should create collection case for delinquent loan")
    void createCase_Success() {
        when(loanAccountRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(delinquentLoan));
        when(caseRepository.findByLoanAccountIdAndStatusNot(1L, CollectionCaseStatus.CLOSED)).thenReturn(Optional.empty());
        when(caseRepository.getNextCaseSequence()).thenReturn(800001L);
        when(caseRepository.save(any())).thenAnswer(inv -> { CollectionCase c = inv.getArgument(0); c.setId(1L); return c; });
        when(actionRepository.findByCollectionCaseIdOrderByActionDateDesc(any(), any()))
                .thenReturn(new PageImpl<>(List.of()));

        CollectionCaseResponse result = collectionsService.createCase(1L);

        assertThat(result.getCaseNumber()).startsWith("CC");
        assertThat(result.getPriority()).isEqualTo(CollectionPriority.MEDIUM);
        assertThat(result.getDaysPastDue()).isEqualTo(45);
        assertThat(result.getStatus()).isEqualTo(CollectionCaseStatus.OPEN);
    }

    @Test
    @DisplayName("Should reject case creation for non-delinquent loan")
    void createCase_NotDelinquent() {
        delinquentLoan.setDaysPastDue(0);
        when(loanAccountRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(delinquentLoan));

        assertThatThrownBy(() -> collectionsService.createCase(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not delinquent");
    }

    @Test
    @DisplayName("Should escalate case when escalation action logged")
    void logAction_Escalation() {
        CollectionCase cc = CollectionCase.builder()
                .id(1L).caseNumber("CC000000800001")
                .loanAccount(delinquentLoan).customer(customer)
                .priority(CollectionPriority.HIGH).daysPastDue(45)
                .overdueAmount(new BigDecimal("2000")).totalOutstanding(new BigDecimal("50000"))
                .currencyCode("USD").delinquencyBucket("31-60")
                .status(CollectionCaseStatus.IN_PROGRESS).escalationLevel(0).build();

        CollectionActionDto actionDto = CollectionActionDto.builder()
                .actionType(CollectionActionType.ESCALATION)
                .description("Customer unreachable after 3 attempts")
                .performedBy("agent1").build();

        when(caseRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(cc));
        when(caseRepository.save(any())).thenReturn(cc);

        collectionsService.logAction(1L, actionDto);

        assertThat(cc.getEscalationLevel()).isEqualTo(1);
        assertThat(cc.getStatus()).isEqualTo(CollectionCaseStatus.ESCALATED);
    }

    @Test
    @DisplayName("Should set CRITICAL priority for DPD > 90")
    void createCase_CriticalPriority() {
        delinquentLoan.setDaysPastDue(95);
        when(loanAccountRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(delinquentLoan));
        when(caseRepository.findByLoanAccountIdAndStatusNot(1L, CollectionCaseStatus.CLOSED)).thenReturn(Optional.empty());
        when(caseRepository.getNextCaseSequence()).thenReturn(800002L);
        when(caseRepository.save(any())).thenAnswer(inv -> { CollectionCase c = inv.getArgument(0); c.setId(2L); return c; });
        when(actionRepository.findByCollectionCaseIdOrderByActionDateDesc(any(), any()))
                .thenReturn(new PageImpl<>(List.of()));

        CollectionCaseResponse result = collectionsService.createCase(1L);
        assertThat(result.getPriority()).isEqualTo(CollectionPriority.CRITICAL);
    }
}
