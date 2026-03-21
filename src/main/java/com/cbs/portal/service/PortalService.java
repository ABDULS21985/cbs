package com.cbs.portal.service;

import com.cbs.account.dto.AccountResponse;
import com.cbs.account.dto.TransactionResponse;
import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.mapper.AccountMapper;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.AccountSignatoryRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.audit.entity.AuditEvent;
import com.cbs.audit.repository.AuditEventRepository;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.dto.CustomerResponse;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.mapper.CustomerMapper;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.deposit.entity.FixedDeposit;
import com.cbs.deposit.repository.FixedDepositRepository;
import com.cbs.goal.dto.GoalResponse;
import com.cbs.goal.entity.GoalStatus;
import com.cbs.goal.entity.SavingsGoal;
import com.cbs.goal.repository.SavingsGoalRepository;
import com.cbs.pfm.entity.PfmSnapshot;
import com.cbs.pfm.repository.PfmSnapshotRepository;
import com.cbs.portal.dto.*;
import com.cbs.portal.entity.ProfileUpdateRequest;
import com.cbs.portal.repository.ProfileUpdateRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PortalService {

    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final TransactionJournalRepository transactionRepository;
    private final AccountSignatoryRepository signatoryRepository;
    private final ProfileUpdateRequestRepository profileUpdateRepository;
    private final AuditEventRepository auditEventRepository;
    private final PfmSnapshotRepository pfmSnapshotRepository;
    private final SavingsGoalRepository savingsGoalRepository;
    private final FixedDepositRepository fixedDepositRepository;
    private final CustomerMapper customerMapper;
    private final AccountMapper accountMapper;
    private final com.cbs.account.service.AccountPostingService accountPostingService;
    private final CbsProperties cbsProperties;
    private final OtpService otpService;
    private final KeycloakAdminService keycloakAdminService;
    private final com.cbs.notification.service.NotificationService notificationService;
    private final com.cbs.payments.repository.BankDirectoryRepository bankDirectoryRepository;

    // ========================================================================
    // DASHBOARD — single pane for the logged-in customer
    // ========================================================================

    public PortalDashboardResponse getDashboard(Long customerId) {
        Customer customer = findCustomerOrThrow(customerId);

        List<Account> accounts = accountRepository.findByCustomerIdAndStatus(customerId, AccountStatus.ACTIVE);

        BigDecimal totalBalance = accounts.stream()
                .map(Account::getBookBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalAvailable = accounts.stream()
                .map(Account::getAvailableBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<AccountResponse> accountSummaries = accounts.stream()
                .map(a -> {
                    AccountResponse r = accountMapper.toResponse(a);
                    r.setSignatories(accountMapper.toSignatoryDtoList(
                            signatoryRepository.findByAccountIdWithCustomer(a.getId())));
                    return r;
                })
                .toList();

        // Last 5 transactions across all accounts
        List<TransactionResponse> recentTransactions = accounts.stream()
                .flatMap(a -> transactionRepository
                        .findByAccountIdOrderByCreatedAtDesc(a.getId(), PageRequest.of(0, 5))
                        .getContent().stream())
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(5)
                .map(accountMapper::toTransactionResponse)
                .toList();

        long pendingUpdates = profileUpdateRepository
                .findByCustomerIdAndStatus(customerId, "PENDING").size();

        return PortalDashboardResponse.builder()
                .customerId(customerId)
                .cifNumber(customer.getCifNumber())
                .displayName(customer.getDisplayName())
                .totalAccounts(accounts.size())
                .totalBookBalance(totalBalance)
                .totalAvailableBalance(totalAvailable)
                .accounts(accountSummaries)
                .recentTransactions(recentTransactions)
                .pendingProfileUpdates(pendingUpdates)
                .build();
    }

    // ========================================================================
    // PROFILE VIEW (read-only for self-service)
    // ========================================================================

    public CustomerResponse getMyProfile(Long customerId) {
        Customer customer = customerRepository.findByIdWithDetails(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
        return customerMapper.toResponse(customer);
    }

    // ========================================================================
    // BALANCE ENQUIRY & STATEMENT
    // ========================================================================

    public AccountResponse getAccountBalance(Long customerId, String accountNumber) {
        Account account = findCustomerAccountOrThrow(customerId, accountNumber);
        AccountResponse response = accountMapper.toResponse(account);
        response.setSignatories(accountMapper.toSignatoryDtoList(
                signatoryRepository.findByAccountIdWithCustomer(account.getId())));
        return response;
    }

    public Page<TransactionResponse> getMiniStatement(Long customerId, String accountNumber, Pageable pageable) {
        Account account = findCustomerAccountOrThrow(customerId, accountNumber);
        return transactionRepository
                .findByAccountIdOrderByCreatedAtDesc(account.getId(), pageable)
                .map(accountMapper::toTransactionResponse);
    }

    public Page<TransactionResponse> getFullStatement(Long customerId, String accountNumber,
                                                        LocalDate fromDate, LocalDate toDate, Pageable pageable) {
        Account account = findCustomerAccountOrThrow(customerId, accountNumber);
        LocalDate from = fromDate != null ? fromDate : LocalDate.now().minusMonths(3);
        LocalDate to = toDate != null ? toDate : LocalDate.now();

        return transactionRepository
                .findByAccountIdAndDateRange(account.getId(), from, to, pageable)
                .map(accountMapper::toTransactionResponse);
    }

    // ========================================================================
    // PROFILE UPDATE REQUESTS (maker-checker via portal)
    // ========================================================================

    @Transactional
    public ProfileUpdateRequestDto submitProfileUpdate(Long customerId, ProfileUpdateRequestDto request) {
        findCustomerOrThrow(customerId);

        ProfileUpdateRequest entity = ProfileUpdateRequest.builder()
                .customerId(customerId)
                .requestType(request.getRequestType())
                .oldValue(request.getOldValue())
                .newValue(request.getNewValue())
                .status("PENDING")
                .channel(request.getChannel() != null ? request.getChannel() : "WEB")
                .submittedAt(Instant.now())
                .build();

        ProfileUpdateRequest saved = profileUpdateRepository.save(entity);
        log.info("Profile update request submitted: customer={}, type={}", customerId, request.getRequestType());

        return toDto(saved);
    }

    public Page<ProfileUpdateRequestDto> getMyProfileUpdateRequests(Long customerId, Pageable pageable) {
        findCustomerOrThrow(customerId);
        return profileUpdateRepository
                .findByCustomerIdOrderBySubmittedAtDesc(customerId, pageable)
                .map(this::toDto);
    }

    // Back-office: review pending profile updates
    public Page<ProfileUpdateRequestDto> getPendingProfileUpdates(Pageable pageable) {
        return profileUpdateRepository
                .findByStatusOrderBySubmittedAtAsc("PENDING", pageable)
                .map(this::toDto);
    }

    @Transactional
    public ProfileUpdateRequestDto approveProfileUpdate(Long requestId, String reviewedBy) {
        ProfileUpdateRequest request = profileUpdateRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("ProfileUpdateRequest", "id", requestId));

        if (!"PENDING".equals(request.getStatus())) {
            throw new BusinessException("Request is not in PENDING status", "INVALID_REQUEST_STATUS");
        }

        request.setStatus("APPROVED");
        request.setReviewedAt(Instant.now());
        request.setReviewedBy(reviewedBy);
        profileUpdateRepository.save(request);

        // Apply the change to the customer profile
        applyProfileChange(request);

        log.info("Profile update approved: id={}, type={}, customer={}",
                requestId, request.getRequestType(), request.getCustomerId());
        return toDto(request);
    }

    @Transactional
    public ProfileUpdateRequestDto rejectProfileUpdate(Long requestId, String reviewedBy, String reason) {
        ProfileUpdateRequest request = profileUpdateRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("ProfileUpdateRequest", "id", requestId));

        if (!"PENDING".equals(request.getStatus())) {
            throw new BusinessException("Request is not in PENDING status", "INVALID_REQUEST_STATUS");
        }

        request.setStatus("REJECTED");
        request.setReviewedAt(Instant.now());
        request.setReviewedBy(reviewedBy);
        request.setRejectionReason(reason);
        profileUpdateRepository.save(request);

        log.info("Profile update rejected: id={}, reason={}", requestId, reason);
        return toDto(request);
    }

    // ========================================================================
    // SECURITY — password, 2FA, sessions
    // ========================================================================

    @Transactional
    public void changePassword(Long customerId, ChangePasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BusinessException("New password and confirmation do not match", "PASSWORD_MISMATCH");
        }
        Customer customer = findCustomerOrThrow(customerId);

        // Delegate to Keycloak Admin API for the actual password change.
        // The service throws SERVICE_UNAVAILABLE if Keycloak is not configured,
        // or PASSWORD_POLICY_VIOLATION if the new password doesn't meet Keycloak policy.
        String username = customer.getEmail() != null ? customer.getEmail()
                : customer.getPhonePrimary();
        keycloakAdminService.changePassword(username, request.getCurrentPassword(), request.getNewPassword());

        log.info("Password changed for customer={}", customerId);
    }

    @Transactional
    public TwoFactorResponse enable2fa(Long customerId) {
        Customer customer = findCustomerOrThrow(customerId);
        String secret = UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
        String qrCodeUrl = String.format("otpauth://totp/CBS:%s?secret=%s&issuer=CBS",
                customer.getEmail(), secret);
        // Store the secret (using metadata or dedicated field)
        if (customer.getMetadata() == null) {
            customer.setMetadata(Map.of("twoFactorSecret", secret, "twoFactorEnabled", true));
        } else {
            customer.getMetadata().put("twoFactorSecret", secret);
            customer.getMetadata().put("twoFactorEnabled", true);
        }
        customerRepository.save(customer);
        log.info("2FA enabled for customer={}", customerId);
        return TwoFactorResponse.builder()
                .enabled(true).qrCodeUrl(qrCodeUrl).secret(secret)
                .message("Two-factor authentication enabled. Scan the QR code with your authenticator app.")
                .build();
    }

    @Transactional
    public TwoFactorResponse disable2fa(Long customerId) {
        Customer customer = findCustomerOrThrow(customerId);
        if (customer.getMetadata() != null) {
            customer.getMetadata().remove("twoFactorSecret");
            customer.getMetadata().put("twoFactorEnabled", false);
        }
        customerRepository.save(customer);
        log.info("2FA disabled for customer={}", customerId);
        return TwoFactorResponse.builder()
                .enabled(false).message("Two-factor authentication has been disabled.").build();
    }

    public List<LoginHistoryDto> getLoginHistory(Long customerId, int limit) {
        findCustomerOrThrow(customerId);
        Page<AuditEvent> loginEvents = auditEventRepository.findByEntityTypeAndEntityIdOrderByEventTimestampDesc(
                "CUSTOMER", customerId, PageRequest.of(0, limit));
        return loginEvents.getContent().stream()
                .filter(e -> "LOGIN".equals(e.getEventType()) || "LOGIN_SUCCESS".equals(e.getEventType())
                        || "LOGIN_FAILURE".equals(e.getEventType()))
                .map(e -> LoginHistoryDto.builder()
                        .id(e.getId())
                        .timestamp(e.getEventTimestamp().toString())
                        .ipAddress(e.getPerformedFromIp() != null ? e.getPerformedFromIp() : "Unknown")
                        .device(e.getMetadata() != null ? String.valueOf(e.getMetadata().getOrDefault("device", "Unknown")) : "Unknown")
                        .location(e.getMetadata() != null ? String.valueOf(e.getMetadata().getOrDefault("location", "Unknown")) : "Unknown")
                        .status("LOGIN_FAILURE".equals(e.getEventType()) ? "FAILED" : "SUCCESS")
                        .build())
                .toList();
    }

    public List<ActiveSessionDto> getActiveSessions(Long customerId) {
        findCustomerOrThrow(customerId);
        // Query audit events for active sessions (recent login events without a corresponding logout)
        Page<AuditEvent> recentLogins = auditEventRepository.findByEntityTypeAndEntityIdOrderByEventTimestampDesc(
                "CUSTOMER", customerId, PageRequest.of(0, 20));
        return recentLogins.getContent().stream()
                .filter(e -> "LOGIN_SUCCESS".equals(e.getEventType()) || "LOGIN".equals(e.getEventType()))
                .limit(5)
                .map(e -> ActiveSessionDto.builder()
                        .sessionId(e.getSessionId() != null ? e.getSessionId() : "session-" + e.getId())
                        .device(e.getMetadata() != null ? String.valueOf(e.getMetadata().getOrDefault("device", "Unknown")) : "Unknown")
                        .ipAddress(e.getPerformedFromIp() != null ? e.getPerformedFromIp() : "Unknown")
                        .location(e.getMetadata() != null ? String.valueOf(e.getMetadata().getOrDefault("location", "Unknown")) : "Unknown")
                        .loginTime(e.getEventTimestamp().toString())
                        .lastActive(e.getEventTimestamp().toString())
                        .current(false)
                        .build())
                .toList();
    }

    @Transactional
    public void terminateSession(Long customerId, String sessionId) {
        findCustomerOrThrow(customerId);

        // Delegate to Keycloak Admin API for session revocation.
        // If Keycloak is not configured, the service throws SERVICE_UNAVAILABLE.
        // If the session is already expired/gone, it returns silently.
        keycloakAdminService.terminateSession(sessionId);

        log.info("Session terminated for customer={} session={}", customerId, sessionId);
    }

    // ========================================================================
    // ACTIVITY LOG
    // ========================================================================

    public Page<ActivityLogDto> getActivityLog(Long customerId, String eventType,
                                                 String from, String to, Pageable pageable) {
        findCustomerOrThrow(customerId);
        Page<AuditEvent> events = auditEventRepository.findByEntityTypeAndEntityIdOrderByEventTimestampDesc(
                "CUSTOMER", customerId, pageable);
        return events.map(e -> ActivityLogDto.builder()
                .id(e.getId())
                .eventType(e.getEventType())
                .action(e.getAction() != null ? e.getAction().name() : null)
                .description(e.getDescription())
                .performedAt(e.getEventTimestamp().toString())
                .ipAddress(e.getPerformedFromIp())
                .channel(e.getChannel())
                .build());
    }

    // ========================================================================
    // PREFERENCES
    // ========================================================================

    @Transactional
    public PortalPreferencesDto updatePreferences(Long customerId, PortalPreferencesDto prefs) {
        Customer customer = findCustomerOrThrow(customerId);
        if (prefs.getLanguage() != null) {
            customer.setPreferredLanguage(prefs.getLanguage());
        }
        if (prefs.getStatementDelivery() != null) {
            customer.setPreferredChannel(prefs.getStatementDelivery());
        }
        customerRepository.save(customer);
        log.info("Preferences updated for customer={}", customerId);
        return prefs;
    }

    public PortalPreferencesDto getPreferences(Long customerId) {
        Customer customer = findCustomerOrThrow(customerId);
        return PortalPreferencesDto.builder()
                .language(customer.getPreferredLanguage())
                .statementDelivery(customer.getPreferredChannel())
                .build();
    }

    // ========================================================================
    // ENHANCED DASHBOARD — financial command center
    // ========================================================================

    public EnhancedDashboardResponse getEnhancedDashboard(Long customerId) {
        Customer customer = findCustomerOrThrow(customerId);
        List<Account> accounts = accountRepository.findByCustomerIdAndStatus(customerId, AccountStatus.ACTIVE);

        BigDecimal totalBalance = accounts.stream().map(Account::getBookBalance).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalAvailable = accounts.stream().map(Account::getAvailableBalance).reduce(BigDecimal.ZERO, BigDecimal::add);

        // ── Account summaries with sparkline & last transaction ──
        LocalDate weekAgo = LocalDate.now().minusDays(7);
        List<EnhancedDashboardResponse.AccountSummary> accountSummaries = accounts.stream().map(a -> {
            // Last transaction
            Page<com.cbs.account.entity.TransactionJournal> lastTxPage = transactionRepository
                    .findByAccountIdOrderByCreatedAtDesc(a.getId(), PageRequest.of(0, 1));
            String lastTxDesc = null;
            String lastTxDate = null;
            if (!lastTxPage.isEmpty()) {
                var lastTx = lastTxPage.getContent().get(0);
                lastTxDesc = lastTx.getNarration();
                lastTxDate = lastTx.getCreatedAt() != null ? lastTx.getCreatedAt().toString() : null;
            }

            // 7-day sparkline from daily running balances
            List<com.cbs.account.entity.TransactionJournal> weekTxns = transactionRepository
                    .findByAccountIdAndDateRange(a.getId(), weekAgo, LocalDate.now());
            List<BigDecimal> sparkline = buildSparkline(a.getAvailableBalance(), weekTxns);

            return EnhancedDashboardResponse.AccountSummary.builder()
                    .id(a.getId())
                    .accountNumber(a.getAccountNumber())
                    .accountName(a.getAccountName())
                    .accountType(a.getAccountType() != null ? a.getAccountType().name() : null)
                    .availableBalance(a.getAvailableBalance())
                    .bookBalance(a.getBookBalance())
                    .currency(a.getCurrencyCode())
                    .status(a.getStatus() != null ? a.getStatus().name() : null)
                    .lastTransactionDescription(lastTxDesc)
                    .lastTransactionDate(lastTxDate)
                    .sparkline(sparkline)
                    .build();
        }).toList();

        // ── Financial Health ──
        EnhancedDashboardResponse.FinancialHealthSummary healthSummary = buildFinancialHealth(customerId);

        // ── Spending Breakdown (this month vs last month) ──
        EnhancedDashboardResponse.SpendingBreakdown spendingBreakdown = buildSpendingBreakdown(customerId);

        // ── Goals ──
        List<GoalResponse> goals = savingsGoalRepository
                .findByCustomerIdAndStatus(customerId, GoalStatus.ACTIVE, PageRequest.of(0, 10))
                .map(this::toGoalResponse).getContent();

        // ── Upcoming Events ──
        List<EnhancedDashboardResponse.UpcomingEvent> upcoming = buildUpcomingEvents(customerId, accounts);

        // ── Recent Activity ──
        List<Long> accountIds = accounts.stream().map(Account::getId).toList();
        List<TransactionResponse> recentActivity = accountIds.isEmpty() ? List.of()
                : transactionRepository.findByAccountIdsOrderByCreatedAtDesc(accountIds, PageRequest.of(0, 10))
                .getContent().stream().map(accountMapper::toTransactionResponse).toList();

        return EnhancedDashboardResponse.builder()
                .customerId(customerId)
                .cifNumber(customer.getCifNumber())
                .displayName(customer.getDisplayName())
                .totalAccounts(accounts.size())
                .totalBookBalance(totalBalance)
                .totalAvailableBalance(totalAvailable)
                .accounts(accountSummaries)
                .financialHealth(healthSummary)
                .spendingBreakdown(spendingBreakdown)
                .goals(goals)
                .upcoming(upcoming)
                .recentActivity(recentActivity)
                .build();
    }

    private List<BigDecimal> buildSparkline(BigDecimal currentBalance,
                                             List<com.cbs.account.entity.TransactionJournal> weekTxns) {
        // Build 7 daily balance points working backwards from current balance
        BigDecimal[] balances = new BigDecimal[7];
        balances[6] = currentBalance;

        // Group transactions by day offset
        LocalDate today = LocalDate.now();
        Map<Integer, BigDecimal> dailyNet = new HashMap<>();
        for (var tx : weekTxns) {
            if (tx.getPostingDate() == null) continue;
            int dayOffset = (int) java.time.temporal.ChronoUnit.DAYS.between(tx.getPostingDate(), today);
            if (dayOffset < 0 || dayOffset > 6) continue;
            BigDecimal net = tx.getTransactionType() == com.cbs.account.entity.TransactionType.CREDIT
                    ? tx.getAmount() : tx.getAmount().negate();
            dailyNet.merge(dayOffset, net, BigDecimal::add);
        }

        // Walk backwards: balance[day-1] = balance[day] - netChange[day]
        for (int i = 5; i >= 0; i--) {
            int dayOffset = 6 - i;
            BigDecimal netForDay = dailyNet.getOrDefault(dayOffset, BigDecimal.ZERO);
            balances[i] = balances[i + 1].subtract(netForDay);
        }
        return List.of(balances);
    }

    private EnhancedDashboardResponse.FinancialHealthSummary buildFinancialHealth(Long customerId) {
        List<PfmSnapshot> snapshots = pfmSnapshotRepository
                .findByCustomerIdOrderBySnapshotDateDesc(customerId);

        if (snapshots.isEmpty()) {
            return EnhancedDashboardResponse.FinancialHealthSummary.builder()
                    .score(0).riskLevel("UNKNOWN").savingsRate(BigDecimal.ZERO)
                    .factors(Map.of()).insights(Map.of("info", "No financial data available yet"))
                    .build();
        }

        PfmSnapshot latest = snapshots.get(0);
        return EnhancedDashboardResponse.FinancialHealthSummary.builder()
                .score(latest.getFinancialHealthScore() != null ? latest.getFinancialHealthScore() : 0)
                .riskLevel(deriveRiskLevel(latest.getFinancialHealthScore()))
                .savingsRate(latest.getSavingsRate() != null ? latest.getSavingsRate() : BigDecimal.ZERO)
                .factors(latest.getHealthFactors() != null ? latest.getHealthFactors() : Map.of())
                .insights(latest.getInsights() != null ? latest.getInsights() : Map.of())
                .build();
    }

    private String deriveRiskLevel(Integer score) {
        if (score == null || score == 0) return "UNKNOWN";
        if (score >= 70) return "LOW";
        if (score >= 45) return "MEDIUM";
        if (score >= 25) return "HIGH";
        return "CRITICAL";
    }

    private static final Map<String, String> CATEGORY_COLORS = Map.ofEntries(
            Map.entry("HOUSING", "#6366F1"),
            Map.entry("FOOD", "#F59E0B"),
            Map.entry("TRANSPORT", "#3B82F6"),
            Map.entry("UTILITIES", "#8B5CF6"),
            Map.entry("HEALTHCARE", "#EF4444"),
            Map.entry("EDUCATION", "#10B981"),
            Map.entry("ENTERTAINMENT", "#EC4899"),
            Map.entry("SHOPPING", "#F97316"),
            Map.entry("SAVINGS", "#14B8A6"),
            Map.entry("DEBT_REPAYMENT", "#DC2626"),
            Map.entry("INSURANCE", "#6B7280"),
            Map.entry("CHARITY", "#A855F7"),
            Map.entry("TRANSFER", "#0EA5E9"),
            Map.entry("OTHER", "#9CA3AF")
    );

    private EnhancedDashboardResponse.SpendingBreakdown buildSpendingBreakdown(Long customerId) {
        LocalDate today = LocalDate.now();
        LocalDate thisMonthStart = today.withDayOfMonth(1);
        LocalDate lastMonthStart = thisMonthStart.minusMonths(1);
        LocalDate lastMonthEnd = thisMonthStart.minusDays(1);

        // This month aggregates
        Object[] thisMonthAgg = transactionRepository.aggregatePostedCreditsAndDebitsByCustomer(
                customerId, thisMonthStart, today);
        BigDecimal totalThisMonth = toBigDecimal(thisMonthAgg != null && thisMonthAgg.length > 1 ? thisMonthAgg[1] : null);

        // Last month aggregates
        Object[] lastMonthAgg = transactionRepository.aggregatePostedCreditsAndDebitsByCustomer(
                customerId, lastMonthStart, lastMonthEnd);
        BigDecimal totalLastMonth = toBigDecimal(lastMonthAgg != null && lastMonthAgg.length > 1 ? lastMonthAgg[1] : null);

        // Change percent
        BigDecimal changePercent = BigDecimal.ZERO;
        if (totalLastMonth.signum() > 0) {
            changePercent = totalThisMonth.subtract(totalLastMonth)
                    .divide(totalLastMonth, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(1, RoundingMode.HALF_UP);
        }

        // Category breakdown this month
        List<Object[]> thisMonthCats = transactionRepository
                .aggregatePostedDebitCategoriesByCustomer(customerId, thisMonthStart, today);
        // Category breakdown last month
        List<Object[]> lastMonthCats = transactionRepository
                .aggregatePostedDebitCategoriesByCustomer(customerId, lastMonthStart, lastMonthEnd);

        Map<String, BigDecimal> lastMonthMap = new HashMap<>();
        for (Object[] row : lastMonthCats) {
            if (row != null && row.length >= 2 && row[0] != null) {
                lastMonthMap.put(row[0].toString(), toBigDecimal(row[1]));
            }
        }

        List<EnhancedDashboardResponse.CategorySpend> categories = new ArrayList<>();
        List<String> smartInsights = new ArrayList<>();

        for (Object[] row : thisMonthCats) {
            if (row == null || row.length < 2 || row[0] == null) continue;
            String cat = row[0].toString();
            BigDecimal thisAmt = toBigDecimal(row[1]);
            BigDecimal lastAmt = lastMonthMap.getOrDefault(cat, BigDecimal.ZERO);

            categories.add(EnhancedDashboardResponse.CategorySpend.builder()
                    .category(cat)
                    .amountThisMonth(thisAmt)
                    .amountLastMonth(lastAmt)
                    .color(CATEGORY_COLORS.getOrDefault(cat, "#9CA3AF"))
                    .build());

            // Smart insights for significant changes
            if (lastAmt.signum() > 0) {
                BigDecimal catChange = thisAmt.subtract(lastAmt).divide(lastAmt, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100));
                if (catChange.compareTo(BigDecimal.valueOf(20)) > 0) {
                    smartInsights.add(String.format("You spent %s%% more on %s this month",
                            catChange.setScale(0, RoundingMode.HALF_UP), cat.toLowerCase().replace('_', ' ')));
                } else if (catChange.compareTo(BigDecimal.valueOf(-20)) < 0) {
                    smartInsights.add(String.format("You spent %s%% less on %s this month — nice!",
                            catChange.abs().setScale(0, RoundingMode.HALF_UP), cat.toLowerCase().replace('_', ' ')));
                }
            }
        }

        return EnhancedDashboardResponse.SpendingBreakdown.builder()
                .totalThisMonth(totalThisMonth)
                .totalLastMonth(totalLastMonth)
                .changePercent(changePercent)
                .categories(categories)
                .smartInsights(smartInsights)
                .build();
    }

    private List<EnhancedDashboardResponse.UpcomingEvent> buildUpcomingEvents(
            Long customerId, List<Account> accounts) {
        List<EnhancedDashboardResponse.UpcomingEvent> events = new ArrayList<>();
        LocalDate today = LocalDate.now();
        LocalDate nextWeek = today.plusDays(7);

        // Upcoming auto-debit goals
        List<SavingsGoal> dueGoals = savingsGoalRepository.findDueForAutoDebit(nextWeek);
        for (SavingsGoal goal : dueGoals) {
            if (!goal.getCustomer().getId().equals(customerId)) continue;
            events.add(EnhancedDashboardResponse.UpcomingEvent.builder()
                    .type("SCHEDULED_TRANSFER")
                    .title("Goal auto-debit: " + goal.getGoalName())
                    .description("Auto-debit of " + goal.getAutoDebitAmount() + " for savings goal")
                    .dueDate(goal.getNextAutoDebitDate())
                    .amount(goal.getAutoDebitAmount())
                    .currency(goal.getCurrencyCode())
                    .status(goal.getNextAutoDebitDate().isBefore(today) ? "OVERDUE"
                            : goal.getNextAutoDebitDate().equals(today) ? "DUE_SOON" : "PENDING")
                    .build());
        }

        // Upcoming FD maturities
        List<Long> accountIds = accounts.stream().map(Account::getId).toList();
        if (!accountIds.isEmpty()) {
            List<FixedDeposit> maturingFds = fixedDepositRepository.findMaturedDeposits(nextWeek);
            for (FixedDeposit fd : maturingFds) {
                if (fd.getAccount() != null && accountIds.contains(fd.getAccount().getId())) {
                    events.add(EnhancedDashboardResponse.UpcomingEvent.builder()
                            .type("FD_MATURITY")
                            .title("Fixed deposit maturing")
                            .description("Deposit " + fd.getDepositNumber() + " matures")
                            .dueDate(fd.getMaturityDate())
                            .amount(fd.getCurrentValue())
                            .currency(fd.getCurrencyCode())
                            .status("PENDING")
                            .build());
                }
            }
        }

        // Sort by due date
        events.sort(Comparator.comparing(EnhancedDashboardResponse.UpcomingEvent::getDueDate));
        return events;
    }

    private GoalResponse toGoalResponse(SavingsGoal g) {
        return GoalResponse.builder()
                .id(g.getId()).goalNumber(g.getGoalNumber())
                .accountId(g.getAccount().getId()).accountNumber(g.getAccount().getAccountNumber())
                .customerId(g.getCustomer().getId()).customerDisplayName(g.getCustomer().getDisplayName())
                .goalName(g.getGoalName()).goalDescription(g.getGoalDescription()).goalIcon(g.getGoalIcon())
                .targetAmount(g.getTargetAmount()).targetDate(g.getTargetDate())
                .currentAmount(g.getCurrentAmount()).progressPercentage(g.getProgressPercentage())
                .autoDebitEnabled(g.getAutoDebitEnabled()).autoDebitAmount(g.getAutoDebitAmount())
                .autoDebitFrequency(g.getAutoDebitFrequency()).nextAutoDebitDate(g.getNextAutoDebitDate())
                .interestBearing(g.getInterestBearing()).interestRate(g.getInterestRate())
                .accruedInterest(g.getAccruedInterest())
                .status(g.getStatus()).completedDate(g.getCompletedDate())
                .isLocked(g.getIsLocked()).allowWithdrawalBeforeTarget(g.getAllowWithdrawalBeforeTarget())
                .currencyCode(g.getCurrencyCode()).metadata(g.getMetadata()).createdAt(g.getCreatedAt())
                .build();
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value instanceof BigDecimal decimal) return decimal;
        return value == null ? BigDecimal.ZERO : new BigDecimal(value.toString());
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private Customer findCustomerOrThrow(Long customerId) {
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
    }

    private Account findCustomerAccountOrThrow(Long customerId, String accountNumber) {
        Account account = accountRepository.findByAccountNumberWithDetails(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "accountNumber", accountNumber));

        if (!account.getCustomer().getId().equals(customerId)) {
            // Check if customer is a signatory
            boolean isSignatory = signatoryRepository
                    .existsByAccountIdAndCustomerId(account.getId(), customerId);
            if (!isSignatory) {
                throw new BusinessException("Account does not belong to this customer",
                        HttpStatus.FORBIDDEN, "ACCOUNT_ACCESS_DENIED");
            }
        }
        return account;
    }

    private void applyProfileChange(ProfileUpdateRequest request) {
        Customer customer = findCustomerOrThrow(request.getCustomerId());

        switch (request.getRequestType()) {
            case "EMAIL_CHANGE" -> customer.setEmail(request.getNewValue());
            case "PHONE_CHANGE" -> customer.setPhonePrimary(request.getNewValue());
            case "PREFERENCES" -> customer.setPreferredChannel(request.getNewValue());
            default -> log.warn("Profile change type {} requires manual processing", request.getRequestType());
        }

        customerRepository.save(customer);
    }

    private ProfileUpdateRequestDto toDto(ProfileUpdateRequest entity) {
        return ProfileUpdateRequestDto.builder()
                .id(entity.getId())
                .requestType(entity.getRequestType())
                .oldValue(entity.getOldValue())
                .newValue(entity.getNewValue())
                .status(entity.getStatus())
                .channel(entity.getChannel())
                .submittedAt(entity.getSubmittedAt() != null ? entity.getSubmittedAt().toString() : null)
                .reviewedAt(entity.getReviewedAt() != null ? entity.getReviewedAt().toString() : null)
                .reviewedBy(entity.getReviewedBy())
                .rejectionReason(entity.getRejectionReason())
                .build();
    }

    // ========================================================================
    // PORTAL TRANSFERS
    // ========================================================================

    @Transactional
    public java.util.Map<String, Object> executePortalTransfer(Long debitAccountId, Long creditAccountId,
                                                                 BigDecimal amount, String narration, String idempotencyKey) {
        Account debitAccount = accountRepository.findById(debitAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", debitAccountId));
        Account creditAccount = accountRepository.findById(creditAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", creditAccountId));

        if (debitAccount.getAvailableBalance().compareTo(amount) < 0) {
            throw new BusinessException("Insufficient balance", "INSUFFICIENT_BALANCE");
        }
        if (debitAccountId.equals(creditAccountId)) {
            throw new BusinessException("Cannot transfer to the same account", "SAME_ACCOUNT");
        }

        var posting = accountPostingService.postTransfer(
                debitAccount, creditAccount, amount, amount,
                narration != null ? narration : "Portal transfer",
                "Transfer from " + debitAccount.getAccountNumber(),
                com.cbs.account.entity.TransactionChannel.PORTAL,
                idempotencyKey,
                "PORTAL", "portal-transfer"
        );

        log.info("Portal transfer executed: from={}, to={}, amount={}, ref={}",
                debitAccount.getAccountNumber(), creditAccount.getAccountNumber(),
                amount, posting.debitTransaction().getTransactionRef());

        return java.util.Map.of(
                "status", "COMPLETED",
                "reference", posting.debitTransaction().getTransactionRef(),
                "amount", amount,
                "debitAccount", debitAccount.getAccountNumber(),
                "creditAccount", creditAccount.getAccountNumber(),
                "timestamp", java.time.Instant.now().toString()
        );
    }

    public java.util.Map<String, Object> nameEnquiry(String accountNumber, String bankCode) {
        if ("000".equals(bankCode) || bankCode == null || bankCode.isEmpty()) {
            // Internal name enquiry — resolved from local account store
            Account account = accountRepository.findByAccountNumber(accountNumber).orElse(null);
            if (account == null) {
                return java.util.Map.of("found", false, "message", "Account not found");
            }
            return java.util.Map.of(
                    "found", true,
                    "accountName", account.getAccountName(),
                    "accountNumber", account.getAccountNumber(),
                    "bankName", cbsProperties.getDeployment().getInstitutionName()
            );
        }

        // External name enquiry — look up the bank from directory and resolve via NIP integration.
        var bankOpt = bankDirectoryRepository.findByBankCode(bankCode);
        if (bankOpt.isEmpty()) {
            return java.util.Map.of("found", false, "message", "Unknown bank code: " + bankCode);
        }

        var bank = bankOpt.get();
        // In production, this would call the NIBSS NIP NameEnquiry API:
        //   POST /nip/nameenquiry with destinationInstitutionCode, accountNumber
        // For now, we perform a structured log and return a pending response
        // indicating the integration is available but awaiting NIP gateway activation.
        log.info("External name enquiry: bank={} ({}) account={}", bank.getBankName(), bankCode, accountNumber);

        // If the NIP code is configured, attempt the enquiry via the gateway route
        if (bank.getNipCode() != null && !bank.getNipCode().isEmpty()) {
            // TODO: Wire to actual NIP gateway when ESB route is active
            // For now return a structured response indicating the bank was found
            // but live verification is pending gateway activation.
            return java.util.Map.of(
                    "found", false,
                    "bankName", bank.getBankName(),
                    "bankCode", bankCode,
                    "message", "External name enquiry pending: NIP gateway integration is configured but not yet active for bank " + bank.getBankName()
            );
        }

        return java.util.Map.of(
                "found", false,
                "message", "External name enquiry not available for bank code: " + bankCode + ". NIP code not configured."
        );
    }

    /**
     * Generates and sends a transfer OTP to the customer's registered phone/email.
     * Uses {@link OtpService} for Redis-backed code generation and {@link com.cbs.notification.service.NotificationService}
     * for multi-channel dispatch (SMS preferred, falls back to email).
     */
    public java.util.Map<String, Object> sendTransferOtp(Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));
        Customer customer = account.getCustomer();
        if (customer == null) {
            throw new BusinessException("Account has no associated customer", "NO_CUSTOMER");
        }

        OtpService.OtpSession session = otpService.generate(customer.getId(), accountId);

        // Dispatch OTP via notification service (SMS preferred, then email, always IN_APP)
        String phone = customer.getPhonePrimary();
        String email = customer.getEmail();
        String maskedPhone = phone != null && phone.length() > 4
                ? "***" + phone.substring(phone.length() - 4)
                : "***";

        // Send via SMS if phone available
        if (phone != null && !phone.isEmpty()) {
            notificationService.sendDirect(
                    com.cbs.notification.entity.NotificationChannel.SMS,
                    phone, customer.getDisplayName(),
                    "Transfer OTP",
                    "Your BellBank transfer OTP is: " + session.code() + ". Valid for 5 minutes. Do not share this code.",
                    customer.getId(), "TRANSFER_OTP"
            );
        }

        // Always send via IN_APP as backup
        notificationService.sendDirect(
                com.cbs.notification.entity.NotificationChannel.IN_APP,
                customer.getId().toString(), customer.getDisplayName(),
                "Transfer OTP",
                "Your transfer verification code has been sent to " + maskedPhone + ". Valid for 5 minutes.",
                customer.getId(), "TRANSFER_OTP"
        );

        // Send via email if configured and no phone
        if ((phone == null || phone.isEmpty()) && email != null && !email.isEmpty()) {
            notificationService.sendDirect(
                    com.cbs.notification.entity.NotificationChannel.EMAIL,
                    email, customer.getDisplayName(),
                    "BellBank Transfer OTP",
                    "Your BellBank transfer OTP is: " + session.code() + ". Valid for 5 minutes. Do not share this code.",
                    customer.getId(), "TRANSFER_OTP"
            );
        }

        log.info("Transfer OTP dispatched for customer={} account={} session={}", customer.getId(), accountId, session.sessionId());

        return java.util.Map.of(
                "sessionId", session.sessionId(),
                "maskedPhone", maskedPhone,
                "expiresIn", session.expiresInSeconds(),
                "message", "OTP sent to " + maskedPhone
        );
    }

    /**
     * Verifies a transfer OTP against the Redis-backed session.
     *
     * @return true if verification succeeds, false if code is wrong
     * @throws BusinessException if session expired or max attempts exceeded
     */
    public boolean verifyTransferOtp(String sessionId, String otpCode) {
        return otpService.verify(sessionId, otpCode);
    }
}
