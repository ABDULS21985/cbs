package com.cbs.card;

import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.card.dto.IssueIslamicCardRequest;
import com.cbs.card.entity.*;
import com.cbs.card.repository.CardRepository;
import com.cbs.card.repository.IslamicCardDetailsRepository;
import com.cbs.card.repository.IslamicCardProductRepository;
import com.cbs.card.repository.IslamicCardProfileRepository;
import com.cbs.card.service.CardService;
import com.cbs.card.service.IslamicCardAuthorizationService;
import com.cbs.card.service.IslamicCardService;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerIdentification;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.repository.CustomerIdentificationRepository;
import com.cbs.fees.islamic.dto.IslamicFeeResponses;
import com.cbs.fees.islamic.service.IslamicFeeService;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.cbs.wadiah.entity.WadiahAccount;
import com.cbs.wadiah.entity.WadiahDomainEnums;
import com.cbs.wadiah.repository.WadiahAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IslamicCardServiceTest {

    @Mock private IslamicCardProductRepository islamicCardProductRepository;
    @Mock private IslamicCardProfileRepository islamicCardProfileRepository;
    @Mock private IslamicCardDetailsRepository islamicCardDetailsRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private CardRepository cardRepository;
    @Mock private CardService cardService;
    @Mock private WadiahAccountRepository wadiahAccountRepository;
    @Mock private MudarabahAccountRepository mudarabahAccountRepository;
    @Mock private CustomerIdentificationRepository customerIdentificationRepository;
    @Mock private IslamicFeeService islamicFeeService;
    @Mock private CurrentTenantResolver tenantResolver;
    @Mock private IslamicCardAuthorizationService islamicCardAuthorizationService;

    @InjectMocks private IslamicCardService islamicCardService;

    private Customer customer;
    private Account account;
    private IslamicCardProfile profile;
    private IslamicCardProduct product;

    @BeforeEach
    void setUp() {
        customer = Customer.builder()
                .id(1L)
                .customerType(CustomerType.INDIVIDUAL)
                .firstName("Aisha")
                .lastName("Khan")
                .status(CustomerStatus.ACTIVE)
                .build();

        account = Account.builder()
                .id(10L)
                .accountNumber("1000000010")
                .accountName("Aisha Khan")
                .customer(customer)
                .product(Product.builder().id(5L).code("WAD-STD").build())
                .currencyCode("USD")
                .status(AccountStatus.ACTIVE)
                .bookBalance(new BigDecimal("5000.00"))
                .availableBalance(new BigDecimal("5000.00"))
                .lienAmount(BigDecimal.ZERO)
                .overdraftLimit(BigDecimal.ZERO)
                .allowDebit(true)
                .build();

        profile = IslamicCardProfile.builder()
                .id(20L)
                .profileCode("ISLAMIC_STANDARD_MCC")
                .profileName("Islamic Standard MCC Block List")
                .restrictedMccs(List.of("7995"))
                .active(true)
                .build();

        product = IslamicCardProduct.builder()
                .id(30L)
                .productCode("ISL_WADIAH_DEBIT")
                .productName("Islamic Wadiah Debit Card")
                .contractType(IslamicCardContractType.WADIAH)
                .cardScheme(CardScheme.VISA)
                .cardTier("CLASSIC")
                .restrictionProfile(profile)
                .settlementGlCode("2100-ISL-CARD-SETTLE")
                .feeGlCode("4100-ISL-CARDFEE")
                .issuanceFeeCode("ISL_CARD_ISS_WADIAH")
                .allowAtm(true)
                .allowPos(true)
                .allowOnline(true)
                .allowInternational(false)
                .allowContactless(true)
                .requireVerifiedKyc(true)
                .allowOverdraft(false)
                .active(true)
                .build();
    }

    @Test
    @DisplayName("issueIslamicDebitCard: issues a Wadiah-linked card, persists profile binding, and charges issuance fee")
    void issueIslamicDebitCard_WadiahSuccess() {
        WadiahAccount wadiahAccount = WadiahAccount.builder()
                .id(40L)
                .account(account)
                .wadiahType(WadiahDomainEnums.WadiahType.YAD_DHAMANAH)
                .contractReference("WAD-001")
                .contractTypeCode("WADIAH")
                .debitCardEnabled(false)
                .build();
        Card issuedCard = Card.builder()
                .id(50L)
                .cardReference("CRD-ISL-001")
                .account(account)
                .customer(customer)
                .cardType(CardType.DEBIT)
                .cardScheme(CardScheme.VISA)
                .cardholderName("AISHA KHAN")
                .expiryDate(LocalDate.now().plusYears(3))
                .currencyCode("USD")
                .status(CardStatus.PENDING_ACTIVATION)
                .build();
        IslamicFeeResponses.FeeChargeResult feeChargeResult = IslamicFeeResponses.FeeChargeResult.builder()
                .feeChargeLogId(88L)
                .chargedAmount(new BigDecimal("10.00"))
                .journalRef("JRN-001")
                .glAccountCode("4100-ISL-CARDFEE")
                .build();

        when(islamicCardProductRepository.findByProductCode("ISL_WADIAH_DEBIT")).thenReturn(Optional.of(product));
        when(accountRepository.findByIdWithProduct(10L)).thenReturn(Optional.of(account));
        when(customerIdentificationRepository.findVerifiedByCustomerId(1L)).thenReturn(List.of(
                CustomerIdentification.builder().id(2L).customer(customer).idType("PASSPORT").idNumber("P123").isVerified(true).build()
        ));
        when(tenantResolver.getCurrentTenantId()).thenReturn(7L);
        when(islamicCardDetailsRepository.findByCardAccountIdAndCardStatusIn(eq(10L), any())).thenReturn(Optional.empty());
        when(wadiahAccountRepository.findByAccountId(10L)).thenReturn(Optional.of(wadiahAccount));
        when(wadiahAccountRepository.save(any(WadiahAccount.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cardService.issueCard(eq(10L), eq(CardType.DEBIT), eq(CardScheme.VISA), eq("CLASSIC"), anyString(), any(), any(), any(), any(), any(), eq(BigDecimal.ZERO), anyString(), eq(CardStatus.PENDING_ACTIVATION)))
                .thenReturn(issuedCard);
        when(cardRepository.save(any(Card.class))).thenAnswer(inv -> inv.getArgument(0));
        when(islamicFeeService.chargeFee(any())).thenReturn(feeChargeResult);
        when(islamicCardDetailsRepository.save(any(IslamicCardDetails.class))).thenAnswer(inv -> {
            IslamicCardDetails details = inv.getArgument(0);
            details.setId(90L);
            return details;
        });

        Card card = islamicCardService.issueIslamicDebitCard(IssueIslamicCardRequest.builder()
                .accountId(10L)
                .productCode("ISL_WADIAH_DEBIT")
                .cardholderName("AISHA KHAN")
                .branchCode("BR001")
                .build());

        assertThat(card.getStatus()).isEqualTo(CardStatus.PENDING_ACTIVATION);
        assertThat(card.getIsInternationalEnabled()).isFalse();
        assertThat(wadiahAccount.getDebitCardEnabled()).isTrue();
        verify(islamicFeeService).chargeFee(any());
        verify(islamicCardAuthorizationService, never()).refreshMudarabahWeightage(anyLong());

        ArgumentCaptor<IslamicCardDetails> captor = ArgumentCaptor.forClass(IslamicCardDetails.class);
        verify(islamicCardDetailsRepository).save(captor.capture());
        assertThat(captor.getValue().getProduct().getProductCode()).isEqualTo("ISL_WADIAH_DEBIT");
        assertThat(captor.getValue().getRestrictionProfile().getProfileCode()).isEqualTo("ISLAMIC_STANDARD_MCC");
        assertThat(captor.getValue().getIssuedFeeJournalRef()).isEqualTo("JRN-001");
    }

    @Test
    @DisplayName("issueIslamicDebitCard: rejects issuance when verified KYC is missing")
    void issueIslamicDebitCard_RejectsWithoutVerifiedKyc() {
        when(islamicCardProductRepository.findByProductCode("ISL_WADIAH_DEBIT")).thenReturn(Optional.of(product));
        when(accountRepository.findByIdWithProduct(10L)).thenReturn(Optional.of(account));
        when(customerIdentificationRepository.findVerifiedByCustomerId(1L)).thenReturn(List.of());

        assertThatThrownBy(() -> islamicCardService.issueIslamicDebitCard(IssueIslamicCardRequest.builder()
                .accountId(10L)
                .productCode("ISL_WADIAH_DEBIT")
                .build()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Verified KYC is required");

        verify(cardService, never()).issueCard(anyLong(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }
}