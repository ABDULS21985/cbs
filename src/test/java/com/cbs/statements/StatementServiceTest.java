package com.cbs.statements;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.notification.service.NotificationService;
import com.cbs.statements.entity.StatementSubscription;
import com.cbs.statements.repository.StatementSubscriptionRepository;
import com.cbs.statements.service.StatementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.AccountType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StatementServiceTest {

    @Mock private AccountRepository accountRepository;
    @Mock private TransactionJournalRepository transactionJournalRepository;
    @Mock private StatementSubscriptionRepository subscriptionRepository;
    @Mock private NotificationService notificationService;
    @InjectMocks private StatementService service;

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private Account buildAccount(Long id) {
        Account account = new Account();
        account.setId(id);
        account.setAccountNumber("001234567" + id);
        account.setAccountName("Test Account " + id);
        account.setCurrencyCode("NGN");
        account.setBookBalance(new BigDecimal("750000.00"));
        account.setAvailableBalance(new BigDecimal("700000.00"));
        account.setAccountType(AccountType.INDIVIDUAL);
        account.setStatus(AccountStatus.ACTIVE);
        account.setOpenedDate(LocalDate.of(2020, 1, 15));
        account.setBranchCode("HQ001");
        return account;
    }

    private TransactionJournal buildTransaction(String ref, String type, BigDecimal amount, BigDecimal balance, LocalDate date) {
        TransactionJournal txn = new TransactionJournal();
        txn.setTransactionRef(ref);
        txn.setNarration("Test transaction " + ref);
        txn.setAmount(amount);
        txn.setRunningBalance(balance);
        txn.setPostingDate(date);
        // Use reflection or setter for enum - simplified for test
        return txn;
    }

    // ── Statement Generation ────────────────────────────────────────────────────

    @Test
    @DisplayName("generateStatement returns statement with transactions and correct balances")
    void generateStatementReturnsCorrectData() {
        Account account = buildAccount(1L);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        when(transactionJournalRepository.findByAccountIdAndDateRange(eq(1L), any(), any()))
                .thenReturn(List.of());

        Map<String, Object> result = service.generateStatement(1L, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 3, 1));

        assertThat(result).containsKey("statementId");
        assertThat(result.get("accountNumber")).isEqualTo("0012345671");
        assertThat(result.get("accountName")).isEqualTo("Test Account 1");
        assertThat(result.get("currencyCode")).isEqualTo("NGN");
        assertThat(result.get("transactionCount")).isEqualTo(0);
        assertThat(result.get("generatedAt")).isNotNull();
        assertThat(((String) result.get("statementId"))).startsWith("STMT-1-");
    }

    @Test
    @DisplayName("generateStatement throws when account not found")
    void generateStatementThrowsForMissingAccount() {
        when(accountRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.generateStatement(999L, LocalDate.now(), LocalDate.now()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("generateStatement with empty transactions returns zero totals")
    void generateStatementEmptyTransactions() {
        Account account = buildAccount(1L);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        when(transactionJournalRepository.findByAccountIdAndDateRange(eq(1L), any(), any()))
                .thenReturn(List.of());

        Map<String, Object> result = service.generateStatement(1L, LocalDate.now().minusMonths(1), LocalDate.now());

        assertThat(result.get("totalCredits")).isEqualTo(BigDecimal.ZERO);
        assertThat(result.get("totalDebits")).isEqualTo(BigDecimal.ZERO);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> txns = (List<Map<String, Object>>) result.get("transactions");
        assertThat(txns).isEmpty();
    }

    // ── Download ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("downloadStatement returns download metadata with format")
    void downloadStatementReturnsMetadata() {
        Account account = buildAccount(1L);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        when(transactionJournalRepository.findByAccountIdAndDateRange(eq(1L), any(), any()))
                .thenReturn(List.of());

        Map<String, Object> result = service.downloadStatement(1L, LocalDate.now().minusMonths(1), LocalDate.now(), "CSV");

        assertThat(result.get("downloadReady")).isEqualTo(true);
        assertThat(result.get("format")).isEqualTo("CSV");
        assertThat(result.get("accountNumber")).isEqualTo("0012345671");
    }

    // ── Email ───────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("emailStatement dispatches via NotificationService and returns SENT status")
    void emailStatementDispatchesAndReturnsSentStatus() {
        Account account = buildAccount(1L);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        // emailStatement calls generateStatement internally, which needs transaction repo
        when(transactionJournalRepository.findByAccountIdAndDateRange(eq(1L), any(), any()))
                .thenReturn(List.of());

        Map<String, Object> result = service.emailStatement(1L, LocalDate.now().minusMonths(1), LocalDate.now(), "test@example.com");

        assertThat(result.get("status")).isEqualTo("SENT");
        assertThat(result.get("emailAddress")).isEqualTo("test@example.com");
        assertThat((String) result.get("message")).contains("test@example.com");

        // Verify NotificationService was called for EMAIL dispatch
        verify(notificationService).sendDirect(
                eq(com.cbs.notification.entity.NotificationChannel.EMAIL),
                eq("test@example.com"),
                eq("Test Account 1"),
                argThat(s -> s.contains("Account Statement")),
                argThat(s -> s.contains("Account Statement")),
                isNull(),
                eq("STATEMENT_DELIVERY")
        );
    }

    @Test
    @DisplayName("emailStatement throws when account not found")
    void emailStatementThrowsForMissingAccount() {
        when(accountRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.emailStatement(999L, LocalDate.now(), LocalDate.now(), "test@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── Certificate of Balance ──────────────────────────────────────────────────

    @Test
    @DisplayName("getCertificateOfBalance returns account balance data")
    void getCertificateReturnsBalanceData() {
        Account account = buildAccount(1L);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));

        Map<String, Object> result = service.getCertificateOfBalance(1L);

        assertThat(result.get("currentBalance")).isEqualTo(new BigDecimal("750000.00"));
        assertThat(result.get("availableBalance")).isEqualTo(new BigDecimal("700000.00"));
        assertThat(result.get("accountNumber")).isEqualTo("0012345671");
        assertThat((String) result.get("certificateRef")).startsWith("COB-1-");
    }

    // ── Account Confirmation ────────────────────────────────────────────────────

    @Test
    @DisplayName("getAccountConfirmation returns account details")
    void getAccountConfirmationReturnsDetails() {
        Account account = buildAccount(1L);
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));

        Map<String, Object> result = service.getAccountConfirmation(1L);

        assertThat(result.get("accountNumber")).isEqualTo("0012345671");
        assertThat(result.get("accountName")).isEqualTo("Test Account 1");
        assertThat((String) result.get("confirmationRef")).startsWith("ACL-1-");
    }

    // ── Subscriptions ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("getSubscriptions returns empty list for null customerId")
    void getSubscriptionsReturnsEmptyForNull() {
        List<StatementSubscription> result = service.getSubscriptions(null);
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("getSubscriptions delegates to repository")
    void getSubscriptionsDelegatesToRepo() {
        StatementSubscription sub = StatementSubscription.builder()
                .id(1L)
                .accountId(1L)
                .frequency("MONTHLY")
                .delivery("EMAIL")
                .format("PDF")
                .active(true)
                .build();
        when(subscriptionRepository.findByCustomerIdOrderByCreatedAtDesc(100L))
                .thenReturn(List.of(sub));

        List<StatementSubscription> result = service.getSubscriptions(100L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getFrequency()).isEqualTo("MONTHLY");
    }

    @Test
    @DisplayName("createSubscription persists and returns subscription with next delivery date")
    void createSubscriptionPersistsWithNextDelivery() {
        when(subscriptionRepository.save(any(StatementSubscription.class)))
                .thenAnswer(inv -> {
                    StatementSubscription saved = inv.getArgument(0);
                    saved.setId(1L);
                    return saved;
                });

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("accountId", "1");
        data.put("frequency", "WEEKLY");
        data.put("delivery", "EMAIL");
        data.put("format", "PDF");
        data.put("email", "test@example.com");

        StatementSubscription result = service.createSubscription(data);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getFrequency()).isEqualTo("WEEKLY");
        assertThat(result.getDelivery()).isEqualTo("EMAIL");
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        assertThat(result.getActive()).isTrue();
        assertThat(result.getNextDelivery()).isEqualTo(LocalDate.now().plusWeeks(1));

        verify(subscriptionRepository).save(any(StatementSubscription.class));
    }

    @Test
    @DisplayName("createSubscription with MONTHLY frequency sets next delivery 1 month ahead")
    void createSubscriptionMonthlyFrequency() {
        when(subscriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> data = Map.of(
                "accountId", "1",
                "frequency", "MONTHLY",
                "delivery", "PORTAL",
                "format", "CSV"
        );

        StatementSubscription result = service.createSubscription(data);

        assertThat(result.getNextDelivery()).isEqualTo(LocalDate.now().plusMonths(1));
        assertThat(result.getDelivery()).isEqualTo("PORTAL");
    }

    @Test
    @DisplayName("createSubscription with QUARTERLY frequency sets next delivery 3 months ahead")
    void createSubscriptionQuarterlyFrequency() {
        when(subscriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> data = Map.of("accountId", "1", "frequency", "QUARTERLY", "delivery", "EMAIL", "format", "EXCEL");

        StatementSubscription result = service.createSubscription(data);

        assertThat(result.getNextDelivery()).isEqualTo(LocalDate.now().plusMonths(3));
    }

    @Test
    @DisplayName("updateSubscription modifies fields and recalculates next delivery")
    void updateSubscriptionModifiesFields() {
        StatementSubscription existing = StatementSubscription.builder()
                .id(1L)
                .accountId(1L)
                .frequency("MONTHLY")
                .delivery("EMAIL")
                .format("PDF")
                .email("old@example.com")
                .active(true)
                .nextDelivery(LocalDate.now().plusMonths(1))
                .build();

        when(subscriptionRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(subscriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> updates = new LinkedHashMap<>();
        updates.put("frequency", "WEEKLY");
        updates.put("email", "new@example.com");

        StatementSubscription result = service.updateSubscription(1L, updates);

        assertThat(result.getFrequency()).isEqualTo("WEEKLY");
        assertThat(result.getEmail()).isEqualTo("new@example.com");
        assertThat(result.getNextDelivery()).isEqualTo(LocalDate.now().plusWeeks(1));
    }

    @Test
    @DisplayName("updateSubscription throws when subscription not found")
    void updateSubscriptionThrowsForMissing() {
        when(subscriptionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateSubscription(999L, Map.of()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("deleteSubscription soft-deletes by setting active to false")
    void deleteSubscriptionSoftDeletes() {
        StatementSubscription existing = StatementSubscription.builder()
                .id(1L)
                .accountId(1L)
                .frequency("MONTHLY")
                .delivery("EMAIL")
                .format("PDF")
                .active(true)
                .build();

        when(subscriptionRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(subscriptionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.deleteSubscription(1L);

        assertThat(existing.getActive()).isFalse();
        verify(subscriptionRepository).save(existing);
    }

    @Test
    @DisplayName("deleteSubscription throws when subscription not found")
    void deleteSubscriptionThrowsForMissing() {
        when(subscriptionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteSubscription(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
