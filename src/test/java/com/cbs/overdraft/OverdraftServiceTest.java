package com.cbs.overdraft;

import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.overdraft.dto.*;
import com.cbs.overdraft.entity.*;
import com.cbs.overdraft.repository.*;
import com.cbs.overdraft.service.OverdraftService;
import com.cbs.provider.interest.DayCountEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OverdraftServiceTest {

    @Mock private CreditFacilityRepository facilityRepository;
    @Mock private FacilityUtilizationLogRepository utilizationLogRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private AccountPostingService accountPostingService;
    @Mock private DayCountEngine dayCountEngine;
    @Mock private CbsProperties cbsProperties;

    @InjectMocks private OverdraftService overdraftService;

    private Account account;
    private CreditFacility facility;

    @BeforeEach
    void setUp() {
        CbsProperties.LedgerConfig ledgerConfig = new CbsProperties.LedgerConfig();
        ledgerConfig.setOverdraftAssetGlCode("1400");
        when(cbsProperties.getLedger()).thenReturn(ledgerConfig);
        Customer customer = Customer.builder().id(1L).firstName("Test").lastName("User")
                .customerType(CustomerType.INDIVIDUAL).build();
        account = Account.builder().id(1L).accountNumber("1000000001").customer(customer)
                .currencyCode("USD").status(AccountStatus.ACTIVE)
                .bookBalance(new BigDecimal("10000")).availableBalance(new BigDecimal("10000"))
                .lienAmount(BigDecimal.ZERO).overdraftLimit(new BigDecimal("50000"))
                .product(Product.builder().id(1L).code("CA-STD").build()).build();

        facility = CreditFacility.builder()
                .id(1L).facilityNumber("CF000000900001")
                .account(account).customer(customer)
                .facilityType(FacilityType.OVERDRAFT)
                .sanctionedLimit(new BigDecimal("50000"))
                .availableLimit(new BigDecimal("50000"))
                .utilizedAmount(BigDecimal.ZERO)
                .currencyCode("USD").interestRate(new BigDecimal("18.00"))
                .penaltyRate(BigDecimal.ZERO)
                .effectiveDate(LocalDate.now().minusMonths(1))
                .expiryDate(LocalDate.now().plusYears(1))
                .accruedInterest(BigDecimal.ZERO)
                .totalInterestCharged(BigDecimal.ZERO)
                .totalInterestPaid(BigDecimal.ZERO)
                .autoRenewal(false).renewalCount(0)
                .status(FacilityStatus.ACTIVE).build();
    }

    @Test
    @DisplayName("Should create overdraft facility and update account limit")
    void createFacility_Success() {
        CreateFacilityRequest request = CreateFacilityRequest.builder()
                .accountId(1L).facilityType(FacilityType.OVERDRAFT)
                .sanctionedLimit(new BigDecimal("50000"))
                .interestRate(new BigDecimal("18.00"))
                .expiryDate(LocalDate.now().plusYears(1)).build();

        CbsProperties.InterestConfig ic = new CbsProperties.InterestConfig();
        when(cbsProperties.getInterest()).thenReturn(ic);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        when(facilityRepository.getNextFacilitySequence()).thenReturn(900001L);
        when(facilityRepository.save(any())).thenAnswer(inv -> { CreditFacility f = inv.getArgument(0); f.setId(1L); return f; });
        when(accountRepository.save(any())).thenReturn(account);

        FacilityResponse result = overdraftService.createFacility(request);

        assertThat(result.getFacilityNumber()).startsWith("CF");
        assertThat(result.getSanctionedLimit()).isEqualByComparingTo(new BigDecimal("50000"));
        assertThat(result.getStatus()).isEqualTo(FacilityStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should drawdown from facility and credit account")
    void drawdown_Success() {
        when(facilityRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(facility));
        when(accountRepository.save(any())).thenReturn(account);
        when(facilityRepository.save(any())).thenReturn(facility);
        when(utilizationLogRepository.save(any())).thenReturn(new FacilityUtilizationLog());
        when(accountPostingService.postCreditAgainstGl(any(Account.class), any(), any(), anyString(), any(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(TransactionJournal.builder().id(1L).build());

        FacilityResponse result = overdraftService.drawdown(1L, new BigDecimal("20000"), "Working capital");

        assertThat(facility.getUtilizedAmount()).isEqualByComparingTo(new BigDecimal("20000"));
        assertThat(facility.getAvailableLimit()).isEqualByComparingTo(new BigDecimal("30000"));
    }

    @Test
    @DisplayName("Should reject drawdown exceeding available limit")
    void drawdown_ExceedsLimit() {
        when(facilityRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(facility));

        assertThatThrownBy(() -> overdraftService.drawdown(1L, new BigDecimal("60000"), "Too much"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("exceeds available limit");
    }

    @Test
    @DisplayName("Should repay facility and restore available limit")
    void repay_Success() {
        facility.setUtilizedAmount(new BigDecimal("30000"));
        facility.setAvailableLimit(new BigDecimal("20000"));

        when(facilityRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(facility));
        when(accountRepository.save(any())).thenReturn(account);
        when(facilityRepository.save(any())).thenReturn(facility);
        when(utilizationLogRepository.save(any())).thenReturn(new FacilityUtilizationLog());
        when(accountPostingService.postDebitAgainstGl(any(Account.class), any(), any(), anyString(), any(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(TransactionJournal.builder().id(2L).build());

        overdraftService.repay(1L, new BigDecimal("10000"), "Repayment");

        assertThat(facility.getUtilizedAmount()).isEqualByComparingTo(new BigDecimal("20000"));
        assertThat(facility.getAvailableLimit()).isEqualByComparingTo(new BigDecimal("30000"));
    }

    @Test
    @DisplayName("Should accrue interest on utilized amount")
    void accrueInterest_Success() {
        facility.setUtilizedAmount(new BigDecimal("30000"));

        when(facilityRepository.findById(1L)).thenReturn(Optional.of(facility));
        when(dayCountEngine.calculateDailyAccrual(any(), any(), any())).thenReturn(new BigDecimal("14.7945"));
        when(facilityRepository.save(any())).thenReturn(facility);

        BigDecimal accrued = overdraftService.accrueInterest(1L);

        assertThat(accrued).isEqualByComparingTo(new BigDecimal("14.7945"));
        assertThat(facility.getAccruedInterest()).isEqualByComparingTo(new BigDecimal("14.7945"));
    }

    @Test
    @DisplayName("Should auto-renew expired facility")
    void processExpiry_AutoRenew() {
        facility.setExpiryDate(LocalDate.now().minusDays(1));
        facility.setAutoRenewal(true);
        facility.setMaxRenewals(3);

        when(facilityRepository.findExpiredFacilities(any())).thenReturn(List.of(facility));
        when(facilityRepository.save(any())).thenReturn(facility);

        int count = overdraftService.processExpiredFacilities();

        assertThat(count).isEqualTo(1);
        assertThat(facility.getRenewalCount()).isEqualTo(1);
        assertThat(facility.getExpiryDate()).isAfter(LocalDate.now());
        assertThat(facility.getStatus()).isEqualTo(FacilityStatus.ACTIVE);
    }
}
