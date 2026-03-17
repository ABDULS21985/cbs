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
import com.cbs.escrow.dto.*;
import com.cbs.escrow.entity.*;
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
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class EscrowService {

    private final EscrowMandateRepository mandateRepository;
    private final EscrowReleaseRepository releaseRepository;
    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final AccountPostingService accountPostingService;
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

        // Place lien on the account
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

        // Release lien on source account
        mandate.getAccount().releaseLien(release.getReleaseAmount());
        accountRepository.save(mandate.getAccount());

        // Credit release-to account if specified
        if (release.getReleaseToAccount() != null) {
            accountPostingService.postCredit(
                    release.getReleaseToAccount(),
                    TransactionType.CREDIT,
                    release.getReleaseAmount(),
                    "Escrow release " + mandate.getMandateNumber(),
                    TransactionChannel.SYSTEM,
                    "ESCROW:" + mandate.getMandateNumber() + ":RELEASE");
        }

        // Update mandate
        mandate.release(release.getReleaseAmount());
        mandateRepository.save(mandate);

        // Update release
        String approvedBy = currentActorProvider.getCurrentActor();
        release.setStatus("EXECUTED");
        release.setApprovedBy(approvedBy);
        release.setApprovalDate(Instant.now());
        releaseRepository.save(release);

        log.info("Escrow release executed: mandate={}, amount={}, approvedBy={}",
                mandate.getMandateNumber(), release.getReleaseAmount(), approvedBy);
        return toReleaseDto(release);
    }

    // ========================================================================
    // MAPPERS
    // ========================================================================

    private EscrowResponse toResponse(EscrowMandate m) {
        List<EscrowReleaseDto> releases = releaseRepository.findByMandateIdOrderByCreatedAtDesc(m.getId())
                .stream().map(this::toReleaseDto).toList();

        return EscrowResponse.builder()
                .id(m.getId()).mandateNumber(m.getMandateNumber())
                .accountId(m.getAccount().getId()).accountNumber(m.getAccount().getAccountNumber())
                .customerId(m.getCustomer().getId()).customerDisplayName(m.getCustomer().getDisplayName())
                .escrowType(m.getEscrowType()).purpose(m.getPurpose())
                .depositorName(m.getDepositor() != null ? m.getDepositor().getDisplayName() : null)
                .beneficiaryName(m.getBeneficiary() != null ? m.getBeneficiary().getDisplayName() : null)
                .releaseConditions(m.getReleaseConditions())
                .requiresMultiSign(m.getRequiresMultiSign()).requiredSignatories(m.getRequiredSignatories())
                .mandatedAmount(m.getMandatedAmount()).releasedAmount(m.getReleasedAmount())
                .remainingAmount(m.getRemainingAmount()).currencyCode(m.getCurrencyCode())
                .effectiveDate(m.getEffectiveDate()).expiryDate(m.getExpiryDate())
                .status(m.getStatus()).releases(releases).createdAt(m.getCreatedAt())
                .build();
    }

    private EscrowReleaseDto toReleaseDto(EscrowRelease r) {
        return EscrowReleaseDto.builder()
                .id(r.getId()).releaseAmount(r.getReleaseAmount())
                .releaseToAccountId(r.getReleaseToAccount() != null ? r.getReleaseToAccount().getId() : null)
                .releaseToAccountNumber(r.getReleaseToAccount() != null ? r.getReleaseToAccount().getAccountNumber() : null)
                .releaseReason(r.getReleaseReason())
                .approvedBy(r.getApprovedBy()).approvalDate(r.getApprovalDate())
                .transactionRef(r.getTransactionRef()).status(r.getStatus())
                .createdAt(r.getCreatedAt()).build();
    }
}
