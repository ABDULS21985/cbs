package com.cbs.account.service;

import com.cbs.account.dto.TransactionAnalyticsDto;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.TransactionDisputeRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.aml.repository.AmlAlertRepository;
import com.cbs.common.audit.CurrentCustomerProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransactionServiceAnalyticsTest {

    @Mock
    private TransactionJournalRepository transactionJournalRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private AmlAlertRepository amlAlertRepository;

    @Mock
    private TransactionDisputeRepository transactionDisputeRepository;

    @Mock
    private TransactionAuditService transactionAuditService;

    @Mock
    private CurrentCustomerProvider currentCustomerProvider;

    @InjectMocks
    private TransactionService transactionService;

    @Test
    void getAnalyticsSummaryMapsSingleAggregateRowWithoutNestedArrayParsingFailure() {
        when(transactionJournalRepository.aggregateAnalyticsSummary(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Collections.singletonList(new Object[]{
                        42L,
                        new BigDecimal("1500000.00"),
                        new BigDecimal("35714.29"),
                        3L,
                        2L
                }));
        when(transactionJournalRepository.findTopByPostingDateBetweenAndTransactionTypeNotOrderByAmountDescCreatedAtDesc(
                any(LocalDate.class),
                any(LocalDate.class),
                any(TransactionType.class)))
                .thenReturn(Optional.empty());
        when(transactionJournalRepository.aggregateChannelMetrics(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());

        TransactionAnalyticsDto.Summary summary = transactionService.getAnalyticsSummary(
                LocalDate.of(2026, 3, 1),
                LocalDate.of(2026, 3, 22)
        );

        assertThat(summary.totalTransactions()).isEqualTo(42L);
        assertThat(summary.totalValue()).isEqualByComparingTo("1500000.00");
        assertThat(summary.averageTransactionValue()).isEqualByComparingTo("35714.29");
        assertThat(summary.failureRate()).isEqualByComparingTo("7.14");
        assertThat(summary.reversalRate()).isEqualByComparingTo("4.76");
        assertThat(summary.mostUsedChannel()).isNull();
    }
}
