package com.cbs.card;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.Product;
import com.cbs.card.entity.*;
import com.cbs.card.repository.IslamicCardDetailsRepository;
import com.cbs.card.service.IslamicCardAuthorizationDecision;
import com.cbs.card.service.IslamicCardAuthorizationService;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.mudarabah.entity.MudarabahAccount;
import com.cbs.mudarabah.entity.PoolWeightageRecord;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.mudarabah.repository.PoolWeightageRecordRepository;
import com.cbs.mudarabah.service.PoolWeightageService;
import com.cbs.shariahcompliance.dto.ShariahScreeningResultResponse;
import com.cbs.shariahcompliance.entity.ScreeningActionTaken;
import com.cbs.shariahcompliance.service.ShariahScreeningService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IslamicCardAuthorizationServiceTest {

    @Mock private IslamicCardDetailsRepository islamicCardDetailsRepository;
    @Mock private ShariahScreeningService shariahScreeningService;
    @Mock private PoolWeightageRecordRepository poolWeightageRecordRepository;
    @Mock private MudarabahAccountRepository mudarabahAccountRepository;
    @Mock private PoolWeightageService poolWeightageService;

    @InjectMocks private IslamicCardAuthorizationService islamicCardAuthorizationService;

    private Card card;
    private IslamicCardDetails islamicCardDetails;
    private CardTransaction txn;

    @BeforeEach
    void setUp() {
        Customer customer = Customer.builder().id(1L).firstName("Fatima").lastName("Ali")
                .customerType(CustomerType.INDIVIDUAL).build();
        Account account = Account.builder().id(10L).accountNumber("1000000010")
                .customer(customer).product(Product.builder().id(1L).code("MUD-SAV").build())
                .currencyCode("USD").bookBalance(new BigDecimal("2000.00"))
                .availableBalance(new BigDecimal("2000.00")).lienAmount(BigDecimal.ZERO)
                .overdraftLimit(BigDecimal.ZERO).build();
        IslamicCardProfile profile = IslamicCardProfile.builder()
                .id(30L)
                .profileCode("ISLAMIC_STANDARD_MCC")
                .profileName("Islamic Standard MCC Block List")
                .restrictedMccs(List.of("7995"))
                .active(true)
                .build();
        IslamicCardProduct product = IslamicCardProduct.builder()
                .id(40L)
                .productCode("ISL_MUDARABAH_DEBIT")
                .productName("Islamic Mudarabah Debit Card")
                .contractType(IslamicCardContractType.MUDARABAH)
                .cardScheme(CardScheme.VISA)
                .cardTier("CLASSIC")
                .restrictionProfile(profile)
                .settlementGlCode("2100-ISL-CARD-SETTLE")
                .build();
        MudarabahAccount mudarabahAccount = MudarabahAccount.builder()
                .id(50L)
                .account(account)
                .contractReference("MUD-001")
                .contractTypeCode("MUDARABAH")
                .investmentPoolId(9L)
                .lossDisclosureAccepted(true)
                .profitSharingRatioCustomer(new BigDecimal("70.0000"))
                .profitSharingRatioBank(new BigDecimal("30.0000"))
                .build();
        card = Card.builder().id(11L).cardReference("CRD-ISL-001").account(account).customer(customer)
                .cardType(CardType.DEBIT).cardScheme(CardScheme.VISA).cardholderName("FATIMA ALI")
                .expiryDate(LocalDate.now().plusYears(3)).currencyCode("USD").status(CardStatus.ACTIVE).build();
        islamicCardDetails = IslamicCardDetails.builder()
                .id(60L)
                .card(card)
                .product(product)
                .restrictionProfile(profile)
                .contractType(IslamicCardContractType.MUDARABAH)
                .mudarabahAccount(mudarabahAccount)
                .settlementGlCode("2100-ISL-CARD-SETTLE")
                .build();
        txn = CardTransaction.builder()
                .id(70L)
                .transactionRef("CTX-001")
                .card(card)
                .account(account)
                .transactionType("PURCHASE")
                .channel("POS")
                .amount(new BigDecimal("50.00"))
                .currencyCode("USD")
                .merchantName("Gaming Merchant")
                .merchantId("MRC7995")
                .merchantCategoryCode("7995")
                .transactionDate(Instant.now())
                .build();
    }

    @Test
    @DisplayName("evaluate: blocks a restricted MCC even when the screening engine allows it")
    void evaluate_BlocksRestrictedMcc() {
        when(islamicCardDetailsRepository.findByCardId(11L)).thenReturn(Optional.of(islamicCardDetails));
        when(islamicCardDetailsRepository.save(any(IslamicCardDetails.class))).thenAnswer(inv -> inv.getArgument(0));
        when(shariahScreeningService.screenTransaction(any())).thenReturn(ShariahScreeningResultResponse.builder()
                .screeningRef("SSR-001")
                .actionTaken(ScreeningActionTaken.ALLOWED)
                .build());

        IslamicCardAuthorizationDecision decision = islamicCardAuthorizationService.evaluate(card, txn);

        assertThat(decision.applicable()).isTrue();
        assertThat(decision.allowed()).isFalse();
        assertThat(decision.settlementGlCode()).isEqualTo("2100-ISL-CARD-SETTLE");
        assertThat(decision.shariahScreeningRef()).isEqualTo("SSR-001");
        assertThat(decision.shariahReason()).contains("7995");
    }

    @Test
    @DisplayName("refreshMudarabahWeightage: upserts the current-day weightage record and recalculates current weight")
    void refreshMudarabahWeightage_UpsertsRecord() {
        when(islamicCardDetailsRepository.findById(60L)).thenReturn(Optional.of(islamicCardDetails));
        when(poolWeightageRecordRepository.sumDailyProduct(eq(9L), eq(10L), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(new BigDecimal("1000.00"));
        when(poolWeightageRecordRepository.findByPoolIdAndAccountIdAndRecordDate(9L, 10L, LocalDate.now()))
                .thenReturn(Optional.empty());
        when(poolWeightageRecordRepository.save(any(PoolWeightageRecord.class))).thenAnswer(inv -> inv.getArgument(0));
        when(poolWeightageService.calculateWeightage(9L, 10L, LocalDate.now().withDayOfMonth(1), LocalDate.now()))
                .thenReturn(new BigDecimal("25.12500000"));
        when(mudarabahAccountRepository.save(any(MudarabahAccount.class))).thenAnswer(inv -> inv.getArgument(0));

        islamicCardAuthorizationService.refreshMudarabahWeightage(60L);

        ArgumentCaptor<PoolWeightageRecord> captor = ArgumentCaptor.forClass(PoolWeightageRecord.class);
        verify(poolWeightageRecordRepository).save(captor.capture());
        assertThat(captor.getValue().getClosingBalance()).isEqualByComparingTo(new BigDecimal("2000.00"));
        assertThat(captor.getValue().getCumulativeDailyProduct()).isEqualByComparingTo(new BigDecimal("3000.00"));
        assertThat(islamicCardDetails.getMudarabahAccount().getCurrentWeight()).isEqualByComparingTo(new BigDecimal("25.12500000"));
    }
}