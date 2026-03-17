package com.cbs.escrow.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.escrow.dto.CreateEscrowRequest;
import com.cbs.escrow.dto.EscrowReleaseDto;
import com.cbs.escrow.dto.EscrowResponse;
import com.cbs.escrow.entity.EscrowMandate;
import com.cbs.escrow.entity.EscrowRelease;
import com.cbs.escrow.entity.EscrowStatus;
import com.cbs.escrow.repository.EscrowMandateRepository;
import com.cbs.escrow.repository.EscrowReleaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class EscrowService {

    private final EscrowMandateRepository mandateRepository;
    private final EscrowReleaseRepository releaseRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;
    private final CustomerRepository customerRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public EscrowResponse createMandate(CreateEscrowRequest request) {
        Account account = accountRepository.findById(request.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getAccountId()));

        Customer customer = account.getCustomer();

        if (account.getAvailableBalance().compareTo(request.getMandatedAmount()) < 0) {
            throw new BusinessException("Insufficient balance for escrow mandate", "INSUFFICIENT_BALANCE");
        }

        Long seq = mandateRepository.getNextMandateSequence();
        String mandateNumber = String.format("ESC%012d", seq);

        EscrowMandate mandate = EscrowMandate.builder()
                .mandateNumber(mandateNumber)
                .account(account)
                .customer(customer)
                .escrowType(request.getEscrowType())
                .purpose(request.getPurpose())
                .releaseConditions(request.getReleaseConditions() != null ? request.getReleaseConditions() : List.of())
                .requiresMultiSign(request.getRequiresMultiSign() != null ? request.getRequiresMultiSign() : false)
                .requiredSignatories(request.getRequiredSignatories() != null ? request.getRequiredSignatories() : 1)
                .mandatedAmount(request.getMandatedAmount())
                .remainingAmount(request.getMandatedAmount())
                .currencyCode(request.getCurrencyCode() != null ? request.getCurrencyCode() : account.getCurrencyCode())
                .expiryDate(request.getExpiryDate())
                .status(EscrowStatus.ACTIVE)
                .build();

        if (request.getDepositorCustomerId() != null) {
            mandate.setDepositor(customerRepository.findById(request.getDepositorCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", request.getDepositorCustomerId())));
        }
        if (request.getBeneficiaryCustomerId() != null) {
            mandate.setBeneficiary(customerRepository.findById(request.getBeneficiaryCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", request.getBeneficiaryCustomerId())));
        }

        account.placeLien(request.getMandatedAmount());
        accountRepository.save(account);

        EscrowMandate saved = mandateRepository.save(mandate);
        log.info("Escrow mandate created: number={}, amount={}, type={}",
                mandateNumber, request.getMandatedAmount(), request.getEscrowType());
        return toResponse(saved);
    }

    public EscrowResponse getMandate(Long id) {
        EscrowMandate mandate = mandateRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("EscrowMandate", "id", id));
        return toResponse(mandate);
    }

    public Page<EscrowResponse> getCustomerMandates(Long customerId, Pageable pageable) {
        return mandateRepository.findByCustomerId(customerId, pageable).map(this::toResponse);
    }

    @Transactional
    public EscrowReleaseDto requestRelease(Long mandateId, BigDecimal amount, String reason,
                                           Long releaseToAccountId) {
        EscrowMandate mandate = mandateRepository.findByIdWithDetails(mandateId)
                .orElseThrow(() -> new ResourceNotFoundException("EscrowMandate", "id", mandateId));

        if (mandate.getStatus() != EscrowStatus.ACTIVE && mandate.getStatus() != EscrowStatus.PARTIALLY_RELEASED) {
            throw new BusinessException("Mandate is not in a releasable state", "MANDATE_NOT_ACTIVE");
        }
        if (amount.compareTo(mandate.getRemainingAmount()) > 0) {
            throw new BusinessException("Release amount exceeds remaining mandate balance", "EXCEEDS_REMAINING");
        }

        Account releaseToAccount = null;
        if (releaseToAccountId != null) {
            releaseToAccount = accountRepository.findById(releaseToAccountId)
                    .orElseThrow(() -> new ResourceNotFoundException("Account", "id", releaseToAccountId));
        }

        EscrowRelease release = EscrowRelease.builder()
                .mandate(mandate)
                .releaseAmount(amount)
                .releaseToAccount(releaseToAccount)
                .releaseReason(reason)
                .status("PENDING")
                .build();

        EscrowRelease saved = releaseRepository.save(release);
        log.info("Escrow release requested: mandate={}, amount={}", mandate.getMandateNumber(), amount);
        return toReleaseDto(saved);
    }

    @Transactional
    public EscrowReleaseDto approveAndExecuteRelease(Long releaseId) {
        EscrowRelease release = releaseRepository.findById(releaseId)
                .orElseThrow(() -> new ResourceNotFoundException("EscrowRelease", "id", releaseId));

        if (!"PENDING".equals(release.getStatus())) {
            throw new BusinessException("Release is not pending", "RELEASE_NOT_PENDING");
        }

        EscrowMandate mandate = release.getMandate();

        mandate.getAccount().releaseLien(release.getReleaseAmount());
        accountRepository.save(mandate.getAccount());

        if (release.getReleaseToAccount() != null) {
            accountPostingService.postCredit(
                    release.getReleaseToAccount(),
                    TransactionType.CREDIT,
                    release.getReleaseAmount(),
                    "Escrow release " + mandate.getMandateNumber(),
                    TransactionChannel.SYSTEM,
                    mandate.getMandateNumber() + ":RELEASE:" + release.getId());
        }

        mandate.release(release.getReleaseAmount());
        mandateRepository.save(mandate);

        String approvedBy = currentActorProvider.getCurrentActor();
        release.setStatus("EXECUTED");
        release.setApprovedBy(approvedBy);
        release.setApprovalDate(Instant.now());
        releaseRepository.save(release);

        log.info("Escrow release executed: mandate={}, amount={}, approvedBy={}",
                mandate.getMandateNumber(), release.getReleaseAmount(), approvedBy);
        return toReleaseDto(release);
    }

    private EscrowResponse toResponse(EscrowMandate mandate) {
        List<EscrowReleaseDto> releases = releaseRepository.findByMandateIdOrderByCreatedAtDesc(mandate.getId())
                .stream()
                .map(this::toReleaseDto)
                .toList();

        return EscrowResponse.builder()
                .id(mandate.getId())
                .mandateNumber(mandate.getMandateNumber())
                .accountId(mandate.getAccount().getId())
                .accountNumber(mandate.getAccount().getAccountNumber())
                .customerId(mandate.getCustomer().getId())
                .customerDisplayName(mandate.getCustomer().getDisplayName())
                .escrowType(mandate.getEscrowType())
                .purpose(mandate.getPurpose())
                .depositorName(mandate.getDepositor() != null ? mandate.getDepositor().getDisplayName() : null)
                .beneficiaryName(mandate.getBeneficiary() != null ? mandate.getBeneficiary().getDisplayName() : null)
                .releaseConditions(mandate.getReleaseConditions())
                .requiresMultiSign(mandate.getRequiresMultiSign())
                .requiredSignatories(mandate.getRequiredSignatories())
                .mandatedAmount(mandate.getMandatedAmount())
                .releasedAmount(mandate.getReleasedAmount())
                .remainingAmount(mandate.getRemainingAmount())
                .currencyCode(mandate.getCurrencyCode())
                .effectiveDate(mandate.getEffectiveDate())
                .expiryDate(mandate.getExpiryDate())
                .status(mandate.getStatus())
                .releases(releases)
                .createdAt(mandate.getCreatedAt())
                .build();
    }

    private EscrowReleaseDto toReleaseDto(EscrowRelease release) {
        return EscrowReleaseDto.builder()
                .id(release.getId())
                .releaseAmount(release.getReleaseAmount())
                .releaseToAccountId(release.getReleaseToAccount() != null ? release.getReleaseToAccount().getId() : null)
                .releaseToAccountNumber(release.getReleaseToAccount() != null ? release.getReleaseToAccount().getAccountNumber() : null)
                .releaseReason(release.getReleaseReason())
                .approvedBy(release.getApprovedBy())
                .approvalDate(release.getApprovalDate())
                .transactionRef(release.getTransactionRef())
                .status(release.getStatus())
                .createdAt(release.getCreatedAt())
                .build();
    }
}
