package com.cbs.wadiah;

import com.cbs.account.entity.*;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.hijri.dto.HijriDateResponse;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.wadiah.dto.WadiahStatement;
import com.cbs.wadiah.entity.WadiahAccount;
import com.cbs.wadiah.entity.WadiahDomainEnums;
import com.cbs.wadiah.entity.WadiahStatementConfig;
import com.cbs.wadiah.repository.WadiahAccountRepository;
import com.cbs.wadiah.repository.WadiahStatementConfigRepository;
import com.cbs.wadiah.service.WadiahAccountService;
import com.cbs.wadiah.service.WadiahStatementService;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WadiahStatementServiceTest {

    @Mock private WadiahAccountRepository wadiahAccountRepository;
    @Mock private WadiahStatementConfigRepository wadiahStatementConfigRepository;
    @Mock private TransactionJournalRepository transactionJournalRepository;
    @Mock private HijriCalendarService hijriCalendarService;
    @Mock private WadiahAccountService wadiahAccountService;
    @Mock private IslamicProductTemplateRepository islamicProductTemplateRepository;

    @InjectMocks
    private WadiahStatementService wadiahStatementService;

    @Test
    void generateStatement_usesIslamicHibahTerminology() {
        Account account = Account.builder()
                .id(5L)
                .accountNumber("00056789")
                .accountName("Wadiah A/C")
                .customer(com.cbs.customer.entity.Customer.builder().id(1L).firstName("Layla").lastName("Omar").build())
                .product(Product.builder().code("WAD-CUR-SAR-001").name("Wadiah Current").productCategory(ProductCategory.CURRENT).glAccountCode("2100-WAD-001").build())
                .currencyCode("SAR")
                .accountType(AccountType.INDIVIDUAL)
                .status(AccountStatus.ACTIVE)
                .bookBalance(new BigDecimal("110.00"))
                .availableBalance(new BigDecimal("110.00"))
                .branchCode("HEAD")
                .openedDate(LocalDate.now().minusMonths(6))
                .build();
        WadiahAccount wadiahAccount = WadiahAccount.builder()
                .id(15L)
                .account(account)
                .islamicProductTemplateId(99L)
                .preferredLanguage(WadiahDomainEnums.PreferredLanguage.EN)
                .statementFrequency(WadiahDomainEnums.StatementFrequency.MONTHLY)
                .build();
        WadiahStatementConfig config = WadiahStatementConfig.builder()
                .wadiahAccountId(15L)
                .language(WadiahDomainEnums.PreferredLanguage.EN)
                .includeHibahDisclaimer(true)
                .includeZakatSummary(true)
                .includeIslamicDates(true)
                .showAverageBalance(true)
                .build();
        TransactionJournal hibahTxn = TransactionJournal.builder()
                .id(1L)
                .transactionRef("TXN-HIBAH")
                .account(account)
                .transactionType(TransactionType.CREDIT)
                .amount(new BigDecimal("10.00"))
                .currencyCode("SAR")
                .runningBalance(new BigDecimal("110.00"))
                .narration("Hibah (Gift)")
                .postingDate(LocalDate.now())
                .valueDate(LocalDate.now())
                .status("POSTED")
                .build();

        when(wadiahAccountRepository.findByAccountId(5L)).thenReturn(Optional.of(wadiahAccount));
        when(wadiahStatementConfigRepository.findByWadiahAccountId(15L)).thenReturn(Optional.of(config));
        when(transactionJournalRepository.findByAccountIdAndDateRange(any(Long.class), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(hibahTxn));
        when(transactionJournalRepository.findAverageBalanceInPeriod(any(Long.class), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(new BigDecimal("100.00"));
        when(hijriCalendarService.toHijri(any(LocalDate.class)))
                .thenReturn(HijriDateResponse.builder().hijriDay(1).hijriMonthName("Ramadan").hijriYear(1448).build());
        when(wadiahAccountService.calculateZakatableBalance(5L, LocalDate.now())).thenReturn(BigDecimal.ZERO);
        when(islamicProductTemplateRepository.findById(99L))
                .thenReturn(Optional.of(IslamicProductTemplate.builder().id(99L).nameAr("حساب وديعة").build()));

        WadiahStatement statement = wadiahStatementService.generateWadiahStatement(
                5L, LocalDate.now().minusDays(1), LocalDate.now(), "EN");

        assertThat(statement.getTotalHibahReceived()).isEqualByComparingTo("10.00");
        assertThat(statement.getTransactions()).hasSize(1);
        assertThat(statement.getTransactions().get(0).getDescription()).isEqualTo("Hibah (Gift)");
        assertThat(statement.getTransactions().get(0).getDescription()).doesNotContainIgnoringCase("interest");
        assertThat(statement.getHibahDisclaimer()).contains("not guaranteed");
    }
}
