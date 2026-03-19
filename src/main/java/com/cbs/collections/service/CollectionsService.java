package com.cbs.collections.service;

import com.cbs.collections.dto.*;
import com.cbs.collections.entity.*;
import com.cbs.collections.repository.*;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.lending.entity.LoanAccount;
import com.cbs.lending.entity.LoanAccountStatus;
import com.cbs.lending.repository.LoanAccountRepository;
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
public class CollectionsService {

    private final CollectionCaseRepository caseRepository;
    private final CollectionActionRepository actionRepository;
    private final LoanAccountRepository loanAccountRepository;

    @Transactional
    public CollectionCaseResponse createCase(Long loanAccountId) {
        LoanAccount loan = loanAccountRepository.findByIdWithDetails(loanAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("LoanAccount", "id", loanAccountId));

        if (loan.getDaysPastDue() <= 0) {
            throw new BusinessException("Loan is not delinquent", "NOT_DELINQUENT");
        }

        // Check for existing open case
        caseRepository.findByLoanAccountIdAndStatusNot(loanAccountId, CollectionCaseStatus.CLOSED)
                .ifPresent(existing -> {
                    throw new BusinessException("Active collection case already exists: " + existing.getCaseNumber(),
                            "CASE_ALREADY_EXISTS");
                });

        Long seq = caseRepository.getNextCaseSequence();
        String caseNumber = String.format("CC%012d", seq);

        CollectionPriority priority = determinePriority(loan.getDaysPastDue(), loan.getOutstandingPrincipal());

        CollectionCase collectionCase = CollectionCase.builder()
                .caseNumber(caseNumber)
                .loanAccount(loan)
                .customer(loan.getCustomer())
                .priority(priority)
                .daysPastDue(loan.getDaysPastDue())
                .overdueAmount(calculateOverdueAmount(loan))
                .totalOutstanding(loan.getOutstandingPrincipal())
                .currencyCode(loan.getCurrencyCode())
                .delinquencyBucket(loan.getDelinquencyBucket())
                .status(CollectionCaseStatus.OPEN)
                .build();

        CollectionCase saved = caseRepository.save(collectionCase);
        log.info("Collection case created: number={}, loan={}, dpd={}, priority={}",
                caseNumber, loan.getLoanNumber(), loan.getDaysPastDue(), priority);
        return toResponse(saved);
    }

    @Transactional
    public int batchCreateCases() {
        List<LoanAccount> delinquentLoans = loanAccountRepository.findLoansWithDueInstallments();
        int created = 0;
        for (LoanAccount loan : delinquentLoans) {
            if (loan.getDaysPastDue() > 0) {
                try {
                    caseRepository.findByLoanAccountIdAndStatusNot(loan.getId(), CollectionCaseStatus.CLOSED)
                            .ifPresentOrElse(
                                    existing -> updateExistingCase(existing, loan),
                                    () -> { createCase(loan.getId()); }
                            );
                    created++;
                } catch (Exception e) {
                    log.debug("Skipping case creation for loan {}: {}", loan.getLoanNumber(), e.getMessage());
                }
            }
        }
        log.info("Batch collection case creation: {} cases processed", created);
        return created;
    }

    public CollectionCaseResponse getCase(Long caseId) {
        CollectionCase cc = caseRepository.findByIdWithDetails(caseId)
                .orElseThrow(() -> new ResourceNotFoundException("CollectionCase", "id", caseId));
        return toResponse(cc);
    }

    public Page<CollectionCaseResponse> getCasesByStatus(CollectionCaseStatus status, Pageable pageable) {
        return caseRepository.findByStatus(status, pageable).map(this::toResponse);
    }

    public Page<CollectionCaseResponse> getCasesByAgent(String assignedTo, Pageable pageable) {
        return caseRepository.findByAssignedTo(assignedTo, pageable).map(this::toResponse);
    }

    @Transactional
    public CollectionCaseResponse assignCase(Long caseId, String assignedTo, String assignedTeam) {
        CollectionCase cc = findCaseOrThrow(caseId);
        cc.setAssignedTo(assignedTo);
        cc.setAssignedTeam(assignedTeam);
        cc.setStatus(CollectionCaseStatus.IN_PROGRESS);
        caseRepository.save(cc);
        log.info("Collection case {} assigned to {} (team: {})", cc.getCaseNumber(), assignedTo, assignedTeam);
        return toResponse(cc);
    }

    @Transactional
    public CollectionActionDto logAction(Long caseId, CollectionActionDto dto) {
        CollectionCase cc = findCaseOrThrow(caseId);

        CollectionAction action = CollectionAction.builder()
                .collectionCase(cc)
                .actionType(dto.getActionType())
                .description(dto.getDescription())
                .outcome(dto.getOutcome())
                .promisedAmount(dto.getPromisedAmount())
                .promisedDate(dto.getPromisedDate())
                .contactNumber(dto.getContactNumber())
                .contactPerson(dto.getContactPerson())
                .visitLatitude(dto.getVisitLatitude())
                .visitLongitude(dto.getVisitLongitude())
                .visitPhotoUrl(dto.getVisitPhotoUrl())
                .nextActionDate(dto.getNextActionDate())
                .nextActionType(dto.getNextActionType())
                .performedBy(dto.getPerformedBy())
                .build();

        cc.addAction(action);

        // Update case status based on action
        if (dto.getActionType() == CollectionActionType.PROMISE_TO_PAY) {
            cc.setStatus(CollectionCaseStatus.PROMISE_TO_PAY);
        } else if (dto.getActionType() == CollectionActionType.ESCALATION) {
            cc.escalate();
        } else if (dto.getActionType() == CollectionActionType.PAYMENT_RECEIVED) {
            if (dto.getPromisedAmount() != null && dto.getPromisedAmount().compareTo(cc.getOverdueAmount()) >= 0) {
                cc.setStatus(CollectionCaseStatus.RECOVERED);
                cc.setResolutionType("FULL_PAYMENT");
                cc.setResolutionAmount(dto.getPromisedAmount());
                cc.setResolvedDate(LocalDate.now());
            }
        } else if (dto.getActionType() == CollectionActionType.WRITE_OFF) {
            cc.setStatus(CollectionCaseStatus.WRITTEN_OFF);
            cc.setResolutionType("WRITE_OFF");
            cc.setResolvedDate(LocalDate.now());
        }

        caseRepository.save(cc);
        actionRepository.save(action);

        log.info("Collection action logged: case={}, type={}, by={}", cc.getCaseNumber(), dto.getActionType(), dto.getPerformedBy());
        return toActionDto(action);
    }

    @Transactional
    public CollectionCaseResponse closeCase(Long caseId, String resolutionType, BigDecimal resolutionAmount) {
        CollectionCase cc = findCaseOrThrow(caseId);
        cc.setStatus(CollectionCaseStatus.CLOSED);
        cc.setResolutionType(resolutionType);
        cc.setResolutionAmount(resolutionAmount);
        cc.setResolvedDate(LocalDate.now());
        caseRepository.save(cc);
        log.info("Collection case {} closed: resolution={}", cc.getCaseNumber(), resolutionType);
        return toResponse(cc);
    }

    private CollectionCase findCaseOrThrow(Long caseId) {
        return caseRepository.findByIdWithDetails(caseId)
                .orElseThrow(() -> new ResourceNotFoundException("CollectionCase", "id", caseId));
    }

    private void updateExistingCase(CollectionCase existing, LoanAccount loan) {
        existing.setDaysPastDue(loan.getDaysPastDue());
        existing.setOverdueAmount(calculateOverdueAmount(loan));
        existing.setTotalOutstanding(loan.getOutstandingPrincipal());
        existing.setDelinquencyBucket(loan.getDelinquencyBucket());
        existing.setPriority(determinePriority(loan.getDaysPastDue(), loan.getOutstandingPrincipal()));
        caseRepository.save(existing);
    }

    private CollectionPriority determinePriority(int dpd, BigDecimal outstanding) {
        if (dpd > 90 || outstanding.compareTo(new BigDecimal("100000")) > 0) return CollectionPriority.CRITICAL;
        if (dpd > 60) return CollectionPriority.HIGH;
        if (dpd > 30) return CollectionPriority.MEDIUM;
        return CollectionPriority.LOW;
    }

    private BigDecimal calculateOverdueAmount(LoanAccount loan) {
        return loan.getAccruedInterest().add(loan.getTotalPenalties().subtract(loan.getTotalPenaltiesPaid()))
                .setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private CollectionCaseResponse toResponse(CollectionCase cc) {
        List<CollectionActionDto> actions = actionRepository
                .findByCollectionCaseIdOrderByActionDateDesc(cc.getId(), Pageable.ofSize(50))
                .getContent().stream().map(this::toActionDto).toList();

        return CollectionCaseResponse.builder()
                .id(cc.getId()).caseNumber(cc.getCaseNumber())
                .loanAccountId(cc.getLoanAccount().getId()).loanNumber(cc.getLoanAccount().getLoanNumber())
                .customerId(cc.getCustomer().getId()).customerDisplayName(cc.getCustomer().getDisplayName())
                .assignedTo(cc.getAssignedTo()).assignedTeam(cc.getAssignedTeam())
                .priority(cc.getPriority()).daysPastDue(cc.getDaysPastDue())
                .overdueAmount(cc.getOverdueAmount()).totalOutstanding(cc.getTotalOutstanding())
                .currencyCode(cc.getCurrencyCode()).delinquencyBucket(cc.getDelinquencyBucket())
                .status(cc.getStatus()).escalationLevel(cc.getEscalationLevel())
                .resolutionType(cc.getResolutionType()).resolutionAmount(cc.getResolutionAmount())
                .resolvedDate(cc.getResolvedDate()).actions(actions).createdAt(cc.getCreatedAt())
                .build();
    }

    private CollectionActionDto toActionDto(CollectionAction a) {
        return CollectionActionDto.builder()
                .id(a.getId()).actionType(a.getActionType()).description(a.getDescription())
                .outcome(a.getOutcome()).promisedAmount(a.getPromisedAmount()).promisedDate(a.getPromisedDate())
                .promiseKept(a.getPromiseKept()).contactNumber(a.getContactNumber())
                .contactPerson(a.getContactPerson()).visitLatitude(a.getVisitLatitude())
                .visitLongitude(a.getVisitLongitude()).visitPhotoUrl(a.getVisitPhotoUrl())
                .nextActionDate(a.getNextActionDate()).nextActionType(a.getNextActionType())
                .performedBy(a.getPerformedBy()).actionDate(a.getActionDate()).build();
    }

    public Page<CollectionCaseResponse> getAllCases(Pageable pageable) {
        return caseRepository.findAll(pageable).map(this::toResponse);
    }
}