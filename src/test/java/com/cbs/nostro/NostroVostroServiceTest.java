package com.cbs.nostro;

import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.common.exception.DuplicateResourceException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.nostro.dto.*;
import com.cbs.nostro.entity.*;
import com.cbs.nostro.repository.*;
import com.cbs.nostro.service.NostroVostroService;
import org.junit.jupiter.api.BeforeEach;
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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NostroVostroServiceTest {

    @Mock private CorrespondentBankRepository bankRepository;
    @Mock private NostroVostroPositionRepository positionRepository;
    @Mock private NostroReconciliationItemRepository reconItemRepository;
    @Mock private AccountRepository accountRepository;

    @InjectMocks private NostroVostroService nostroService;

    private CorrespondentBank bank;
    private Account account;

    @BeforeEach
    void setUp() {
        Customer customer = Customer.builder().id(1L).firstName("Institution").lastName("Treasury")
                .customerType(CustomerType.CORPORATE).build();
        bank = CorrespondentBank.builder().id(1L).bankCode("JPMC-US").bankName("JPMorgan Chase")
                .swiftBic("CHASUS33").country("USA").relationshipType(CorrespondentRelationshipType.NOSTRO)
                .isActive(true).build();
        account = Account.builder().id(10L).accountNumber("1000000010").customer(customer)
                .currencyCode("USD").status(AccountStatus.ACTIVE)
                .bookBalance(new BigDecimal("5000000")).availableBalance(new BigDecimal("5000000"))
                .lienAmount(BigDecimal.ZERO).overdraftLimit(BigDecimal.ZERO)
                .product(Product.builder().id(1L).code("NOSTRO-USD").build()).build();
    }

    @Test
    @DisplayName("Should create correspondent bank")
    void createBank_Success() {
        CorrespondentBankDto dto = CorrespondentBankDto.builder()
                .bankCode("JPMC-US").bankName("JPMorgan Chase").swiftBic("CHASUS33")
                .country("USA").relationshipType(CorrespondentRelationshipType.NOSTRO).build();

        when(bankRepository.existsByBankCode("JPMC-US")).thenReturn(false);
        when(bankRepository.save(any())).thenAnswer(inv -> {
            CorrespondentBank b = inv.getArgument(0); b.setId(1L); return b;
        });

        CorrespondentBankDto result = nostroService.createBank(dto);
        assertThat(result.getBankCode()).isEqualTo("JPMC-US");
        assertThat(result.getSwiftBic()).isEqualTo("CHASUS33");
    }

    @Test
    @DisplayName("Should reject duplicate correspondent bank")
    void createBank_Duplicate() {
        CorrespondentBankDto dto = CorrespondentBankDto.builder()
                .bankCode("JPMC-US").bankName("JPMorgan Chase").country("USA")
                .relationshipType(CorrespondentRelationshipType.NOSTRO).build();

        when(bankRepository.existsByBankCode("JPMC-US")).thenReturn(true);

        assertThatThrownBy(() -> nostroService.createBank(dto))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    @DisplayName("Should create nostro position")
    void createPosition_Success() {
        NostroPositionDto dto = NostroPositionDto.builder()
                .accountId(10L).correspondentBankId(1L)
                .positionType(PositionType.NOSTRO).currencyCode("USD")
                .bookBalance(new BigDecimal("5000000")).build();

        when(accountRepository.findById(10L)).thenReturn(Optional.of(account));
        when(bankRepository.findById(1L)).thenReturn(Optional.of(bank));
        when(positionRepository.findByAccountIdAndCorrespondentBankId(10L, 1L)).thenReturn(Optional.empty());
        when(positionRepository.save(any())).thenAnswer(inv -> {
            NostroVostroPosition p = inv.getArgument(0); p.setId(1L); return p;
        });

        NostroPositionDto result = nostroService.createPosition(dto);
        assertThat(result.getPositionType()).isEqualTo(PositionType.NOSTRO);
        assertThat(result.getCorrespondentBankName()).isEqualTo("JPMorgan Chase");
    }

    @Test
    @DisplayName("Should update statement balance and detect discrepancy")
    void updateStatement_Discrepancy() {
        NostroVostroPosition position = NostroVostroPosition.builder()
                .id(1L).account(account).correspondentBank(bank)
                .positionType(PositionType.NOSTRO).currencyCode("USD")
                .bookBalance(new BigDecimal("5000000")).statementBalance(BigDecimal.ZERO)
                .unreconciledAmount(BigDecimal.ZERO).outstandingItemsCount(0)
                .reconciliationStatus(ReconciliationStatus.PENDING).isActive(true).build();

        when(positionRepository.findById(1L)).thenReturn(Optional.of(position));
        when(positionRepository.save(any())).thenReturn(position);

        NostroPositionDto result = nostroService.updateStatementBalance(
                1L, new BigDecimal("4999500"), LocalDate.now());

        assertThat(result.getReconciliationStatus()).isEqualTo(ReconciliationStatus.DISCREPANCY);
        assertThat(position.getUnreconciledAmount()).isEqualByComparingTo(new BigDecimal("500"));
    }

    @Test
    @DisplayName("Should update statement balance and mark reconciled when matching")
    void updateStatement_Reconciled() {
        NostroVostroPosition position = NostroVostroPosition.builder()
                .id(2L).account(account).correspondentBank(bank)
                .positionType(PositionType.NOSTRO).currencyCode("USD")
                .bookBalance(new BigDecimal("5000000")).statementBalance(BigDecimal.ZERO)
                .unreconciledAmount(BigDecimal.ZERO).outstandingItemsCount(0)
                .reconciliationStatus(ReconciliationStatus.PENDING).isActive(true).build();

        when(positionRepository.findById(2L)).thenReturn(Optional.of(position));
        when(positionRepository.save(any())).thenReturn(position);

        NostroPositionDto result = nostroService.updateStatementBalance(
                2L, new BigDecimal("5000000"), LocalDate.now());

        assertThat(result.getReconciliationStatus()).isEqualTo(ReconciliationStatus.RECONCILED);
        assertThat(position.getUnreconciledAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Should match reconciliation item and update position counts")
    void matchItem_Success() {
        NostroVostroPosition position = NostroVostroPosition.builder()
                .id(1L).account(account).correspondentBank(bank)
                .outstandingItemsCount(3).reconciliationStatus(ReconciliationStatus.IN_PROGRESS)
                .isActive(true).build();

        NostroReconciliationItem item = NostroReconciliationItem.builder()
                .id(10L).position(position).itemType(ReconItemType.UNMATCHED_OURS)
                .reference("TXN20260315001").amount(new BigDecimal("500")).currencyCode("USD")
                .valueDate(LocalDate.now()).matchStatus(MatchStatus.UNMATCHED).build();

        when(reconItemRepository.findById(10L)).thenReturn(Optional.of(item));
        when(reconItemRepository.save(any())).thenReturn(item);
        when(reconItemRepository.countUnmatchedItems(1L)).thenReturn(0);
        when(positionRepository.save(any())).thenReturn(position);

        ReconciliationItemDto result = nostroService.matchItem(10L, "STMT-REF-123", "treasury_ops");

        assertThat(result.getMatchStatus()).isEqualTo(MatchStatus.MATCHED);
        assertThat(position.getReconciliationStatus()).isEqualTo(ReconciliationStatus.RECONCILED);
    }
}
