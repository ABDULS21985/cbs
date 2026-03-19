package com.cbs.account.service;

import com.cbs.account.dto.AccountComplianceCheckRequest;
import com.cbs.account.dto.AccountComplianceCheckResponse;
import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.Product;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.ProductRepository;
import com.cbs.aml.entity.AmlAlert;
import com.cbs.aml.entity.AmlAlertStatus;
import com.cbs.aml.repository.AmlAlertRepository;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerIdentificationRepository;
import com.cbs.customer.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AccountComplianceService {

    private static final Set<AmlAlertStatus> BLOCKING_AML_STATUSES = Set.of(
            AmlAlertStatus.NEW,
            AmlAlertStatus.UNDER_REVIEW,
            AmlAlertStatus.ESCALATED,
            AmlAlertStatus.SAR_FILED
    );

    private final CustomerRepository customerRepository;
    private final CustomerIdentificationRepository customerIdentificationRepository;
    private final ProductRepository productRepository;
    private final AccountRepository accountRepository;
    private final AmlAlertRepository amlAlertRepository;

    public AccountComplianceCheckResponse check(AccountComplianceCheckRequest request) {
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", request.getCustomerId()));

        Product product = productRepository.findByCode(request.getProductCode())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "code", request.getProductCode()));

        boolean kycVerified = !customerIdentificationRepository.findVerifiedByCustomerId(customer.getId()).isEmpty();
        String kycLevel = kycVerified ? "FULL" : "PENDING";

        List<AmlAlert> alerts = amlAlertRepository
                .findByCustomerIdOrderByCreatedAtDesc(customer.getId(), PageRequest.of(0, 50))
                .getContent();
        boolean amlClear = alerts.stream()
                .map(AmlAlert::getStatus)
                .noneMatch(BLOCKING_AML_STATUSES::contains);

        List<Account> existingAccounts = accountRepository.findByCustomerId(customer.getId());
        boolean duplicateFound = existingAccounts.stream()
                .anyMatch(account ->
                        account.getProduct() != null
                                && product.getCode().equals(account.getProduct().getCode())
                                && account.getStatus() != AccountStatus.CLOSED);

        Account dormantAccount = existingAccounts.stream()
                .filter(account -> account.getStatus() == AccountStatus.DORMANT)
                .findFirst()
                .orElse(null);

        return AccountComplianceCheckResponse.builder()
                .kycVerified(kycVerified)
                .kycLevel(kycLevel)
                .amlClear(amlClear)
                .duplicateFound(duplicateFound)
                .dormantAccountExists(dormantAccount != null)
                .dormantAccountId(dormantAccount != null ? dormantAccount.getAccountNumber() : null)
                .build();
    }
}
