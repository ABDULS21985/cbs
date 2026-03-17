package com.cbs.portal.service;

import com.cbs.account.dto.AccountResponse;
import com.cbs.account.dto.TransactionResponse;
import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.mapper.AccountMapper;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.AccountSignatoryRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.dto.CustomerResponse;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.mapper.CustomerMapper;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.portal.dto.PortalDashboardResponse;
import com.cbs.portal.dto.ProfileUpdateRequestDto;
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
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
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
    private final CustomerMapper customerMapper;
    private final AccountMapper accountMapper;

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

        List<AccountResponse> accountSummaries = toAccountResponses(accounts);

        // Last 5 transactions across all accounts
        List<Long> accountIds = accounts.stream().map(Account::getId).toList();
        List<TransactionResponse> recentTransactions = accountIds.isEmpty() ? List.of() :
                transactionRepository.findRecentTransactionsByAccountIds(accountIds, PageRequest.of(0, 5))
                        .stream()
                        .map(accountMapper::toTransactionResponse)
                        .toList();

        long pendingUpdates = profileUpdateRepository.countByCustomerIdAndStatus(customerId, "PENDING");

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

    private List<AccountResponse> toAccountResponses(List<Account> accounts) {
        if (accounts.isEmpty()) {
            return List.of();
        }

        List<AccountResponse> responses = accountMapper.toResponseList(accounts);
        Map<Long, AccountResponse> responseById = responses.stream()
                .collect(Collectors.toMap(AccountResponse::getId, Function.identity()));
        Map<Long, List<com.cbs.account.entity.AccountSignatory>> signatoriesByAccountId = signatoryRepository
                .findByAccountIdInWithCustomer(accounts.stream().map(Account::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(signatory -> signatory.getAccount().getId()));

        responseById.forEach((accountId, response) -> response.setSignatories(
                accountMapper.toSignatoryDtoList(signatoriesByAccountId.getOrDefault(accountId, List.of()))));
        return responses;
    }
}
