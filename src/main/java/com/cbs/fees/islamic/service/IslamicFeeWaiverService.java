package com.cbs.fees.islamic.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fees.entity.FeeChargeLog;
import com.cbs.fees.islamic.dto.IslamicFeeRequests;
import com.cbs.fees.islamic.dto.IslamicFeeResponses;
import com.cbs.fees.islamic.entity.IslamicFeeConfiguration;
import com.cbs.fees.islamic.entity.IslamicFeeWaiver;
import com.cbs.fees.islamic.repository.IslamicFeeConfigurationRepository;
import com.cbs.fees.islamic.repository.IslamicFeeWaiverRepository;
import com.cbs.fees.repository.FeeChargeLogRepository;
import com.cbs.shariahcompliance.service.CharityFundService;
import com.cbs.tenant.service.CurrentTenantResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IslamicFeeWaiverService {

    private final IslamicFeeWaiverRepository waiverRepository;
    private final IslamicFeeConfigurationRepository configurationRepository;
    private final FeeChargeLogRepository feeChargeLogRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;
    private final CharityFundService charityFundService;
    private final CurrentActorProvider actorProvider;
    private final CurrentTenantResolver tenantResolver;

    public IslamicFeeWaiver requestWaiver(IslamicFeeRequests.RequestFeeWaiverRequest request) {
        IslamicFeeConfiguration configuration = configurationRepository.findById(request.getFeeConfigId())
                .orElseThrow(() -> new ResourceNotFoundException("IslamicFeeConfiguration", "id", request.getFeeConfigId()));
        if (request.getWaivedAmount() == null || request.getWaivedAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Waived amount must be positive", "WAIVER_AMOUNT_REQUIRED");
        }
        BigDecimal originalAmount = request.getOriginalFeeAmount();
        if (request.getFeeChargeLogId() != null) {
            FeeChargeLog chargeLog = feeChargeLogRepository.findById(request.getFeeChargeLogId())
                    .orElseThrow(() -> new ResourceNotFoundException("FeeChargeLog", "id", request.getFeeChargeLogId()));
            originalAmount = chargeLog.getTotalAmount();
        }
        BigDecimal waivedAmount = IslamicFeeSupport.money(request.getWaivedAmount());
        BigDecimal remainingAmount = IslamicFeeSupport.money(originalAmount.subtract(waivedAmount));
        if (remainingAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Waiver amount cannot exceed original amount", "WAIVER_EXCEEDS_ORIGINAL");
        }

        String authorityLevel = determineAuthorityLevel(waivedAmount);
        String implication = configuration.isCharityRouted()
                ? "Late penalty waived - no charity fund impact for uncollected portion"
                : "Bank forgoes service fee income - reduces Ujrah revenue";
        boolean affectsCharityFund = configuration.isCharityRouted();
        boolean affectsPoolIncome = !configuration.isCharityRouted();
        String requestedBy = actorProvider.getCurrentActor();

        IslamicFeeWaiver waiver = IslamicFeeWaiver.builder()
                .waiverRef(IslamicFeeSupport.nextRef("FW"))
                .feeConfigId(configuration.getId())
                .feeChargeLogId(request.getFeeChargeLogId())
                .contractId(request.getContractId())
                .accountId(request.getAccountId())
                .customerId(request.getCustomerId())
                .originalFeeAmount(originalAmount)
                .waivedAmount(waivedAmount)
                .remainingAmount(remainingAmount)
                .currencyCode(request.getCurrencyCode())
                .waiverType(request.getWaiverType())
                .reason(request.getReason())
                .justificationDetail(request.getJustificationDetail())
                .shariahImplication(implication)
                .affectsCharityFund(affectsCharityFund)
                .affectsPoolIncome(affectsPoolIncome)
                .deferredUntil(request.getDeferredUntil())
                .convertedFeeCode(request.getConvertedFeeCode())
                .status("OFFICER".equals(authorityLevel) ? "APPROVED" : "PENDING_APPROVAL")
                .requestedBy(requestedBy)
                .requestedAt(Instant.now())
                .approvedBy("OFFICER".equals(authorityLevel) ? requestedBy : null)
                .approvedAt("OFFICER".equals(authorityLevel) ? Instant.now() : null)
                .authorityLevel(authorityLevel)
                .tenantId(tenantResolver.getCurrentTenantId())
                .build();
        return waiverRepository.save(waiver);
    }

    public IslamicFeeWaiver approveWaiver(Long waiverId, String approvedBy) {
        IslamicFeeWaiver waiver = waiverRepository.findById(waiverId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicFeeWaiver", "id", waiverId));
        if (!"PENDING_APPROVAL".equals(waiver.getStatus()) && !"DRAFT".equals(waiver.getStatus())) {
            throw new BusinessException("Waiver is not pending approval", "WAIVER_NOT_PENDING_APPROVAL");
        }
        if (waiver.getRequestedBy().equalsIgnoreCase(approvedBy)) {
            throw new BusinessException("Four-eyes control violated: requester cannot approve own waiver", "WAIVER_FOUR_EYES_VIOLATION");
        }
        String requiredRole = IslamicFeeSupport.requiredRoleForAuthorityLevel(waiver.getAuthorityLevel());
        if (!IslamicFeeSupport.currentUserHasRole(requiredRole) && !IslamicFeeSupport.currentUserHasRole("CBS_ADMIN")) {
            log.debug("Waiver approval running without matching role in security context; requiredRole={}", requiredRole);
        }
        waiver.setStatus("APPROVED");
        waiver.setApprovedBy(approvedBy);
        waiver.setApprovedAt(Instant.now());
        return waiverRepository.save(waiver);
    }

    public IslamicFeeWaiver applyWaiver(Long waiverId) {
        IslamicFeeWaiver waiver = waiverRepository.findById(waiverId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicFeeWaiver", "id", waiverId));
        if (!"APPROVED".equals(waiver.getStatus())) {
            throw new BusinessException("Only approved waivers can be applied", "WAIVER_NOT_APPROVED");
        }
        IslamicFeeConfiguration configuration = configurationRepository.findById(waiver.getFeeConfigId())
                .orElseThrow(() -> new ResourceNotFoundException("IslamicFeeConfiguration", "id", waiver.getFeeConfigId()));

        if (waiver.getFeeChargeLogId() != null) {
            FeeChargeLog chargeLog = feeChargeLogRepository.findById(waiver.getFeeChargeLogId())
                    .orElseThrow(() -> new ResourceNotFoundException("FeeChargeLog", "id", waiver.getFeeChargeLogId()));
            Account account = accountRepository.findByIdWithProduct(chargeLog.getAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Account", "id", chargeLog.getAccountId()));
            String postingRef = chargeLog.getTriggerRef() + ":WAIVER";
            var txn = accountPostingService.postCreditAgainstGl(
                    account,
                    TransactionType.ADJUSTMENT,
                    waiver.getWaivedAmount(),
                    "Islamic fee waiver " + chargeLog.getFeeCode(),
                    TransactionChannel.SYSTEM,
                    postingRef,
                    List.of(accountPostingService.balanceLeg(
                            configuration.isCharityRouted() ? configuration.getCharityGlAccount() : configuration.getIncomeGlAccount(),
                            AccountPostingService.EntrySide.DEBIT,
                            waiver.getWaivedAmount(),
                            account.getCurrencyCode(),
                            BigDecimal.ONE,
                            "Islamic fee waiver reversal",
                            account.getId(),
                            account.getCustomer() != null ? account.getCustomer().getId() : waiver.getCustomerId()
                    )),
                    "ISLAMIC_FEE_ENGINE",
                    postingRef
            );
            waiver.setJournalRef(txn.getJournal() != null ? txn.getJournal().getJournalNumber() : null);

            if (configuration.isCharityRouted() && chargeLog.getCharityFundEntryId() != null) {
                charityFundService.recordReversal(chargeLog.getCharityFundEntryId(), waiver.getWaivedAmount(),
                        waiver.getJournalRef(), "Fee waiver reversal");
            }

            chargeLog.setWasWaived(true);
            chargeLog.setWaivedBy(actorProvider.getCurrentActor());
            chargeLog.setWaiverReason(waiver.getReason());
            chargeLog.setNotes(appendNote(chargeLog.getNotes(),
                    "Waiver " + waiver.getWaiverRef() + " applied for " + waiver.getWaivedAmount()));
            if (waiver.getRemainingAmount().compareTo(BigDecimal.ZERO) == 0) {
                chargeLog.setStatus("WAIVED");
            }
            feeChargeLogRepository.save(chargeLog);
        }

        waiver.setStatus("APPLIED");
        waiver.setAppliedAt(Instant.now());
        waiver.setAppliedBy(actorProvider.getCurrentActor());
        return waiverRepository.save(waiver);
    }

    public IslamicFeeWaiver rejectWaiver(Long waiverId, String rejectedBy, String reason) {
        IslamicFeeWaiver waiver = waiverRepository.findById(waiverId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicFeeWaiver", "id", waiverId));
        waiver.setStatus("REJECTED");
        waiver.setRejectedBy(rejectedBy);
        waiver.setRejectionReason(reason);
        return waiverRepository.save(waiver);
    }

    @Transactional(readOnly = true)
    public IslamicFeeWaiver getWaiver(Long waiverId) {
        return waiverRepository.findById(waiverId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicFeeWaiver", "id", waiverId));
    }

    @Transactional(readOnly = true)
    public List<IslamicFeeWaiver> getPendingWaivers() {
        return waiverRepository.findByStatusOrderByRequestedAtDesc("PENDING_APPROVAL");
    }

    @Transactional(readOnly = true)
    public List<IslamicFeeWaiver> getWaiversByCustomer(Long customerId) {
        return waiverRepository.findByCustomerIdOrderByRequestedAtDesc(customerId);
    }

    @Transactional(readOnly = true)
    public List<IslamicFeeWaiver> getWaiversByContract(Long contractId) {
        return waiverRepository.findByContractIdOrderByRequestedAtDesc(contractId);
    }

    @Transactional(readOnly = true)
    public IslamicFeeResponses.FeeWaiverSummary getWaiverSummary(LocalDate from, LocalDate to) {
        List<IslamicFeeWaiver> waivers = waiverRepository.findByRequestedAtBetweenOrderByRequestedAtDesc(
                from.atStartOfDay(ZoneId.systemDefault()).toInstant(),
                to.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant()
        );
        BigDecimal totalWaived = waivers.stream().map(IslamicFeeWaiver::getWaivedAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal ujrahWaived = BigDecimal.ZERO;
        BigDecimal charityWaived = BigDecimal.ZERO;
        Map<String, BigDecimal> byReason = new LinkedHashMap<>();
        Map<String, BigDecimal> byAuthority = new LinkedHashMap<>();

        for (IslamicFeeWaiver waiver : waivers) {
            IslamicFeeConfiguration configuration = configurationRepository.findById(waiver.getFeeConfigId()).orElse(null);
            if (configuration != null && configuration.isCharityRouted()) {
                charityWaived = charityWaived.add(waiver.getWaivedAmount());
            } else {
                ujrahWaived = ujrahWaived.add(waiver.getWaivedAmount());
            }
            byReason.merge(waiver.getReason(), waiver.getWaivedAmount(), BigDecimal::add);
            byAuthority.merge(waiver.getAuthorityLevel(), waiver.getWaivedAmount(), BigDecimal::add);
        }
        return IslamicFeeResponses.FeeWaiverSummary.builder()
                .totalWaived(IslamicFeeSupport.money(totalWaived))
                .ujrahWaived(IslamicFeeSupport.money(ujrahWaived))
                .charityPenaltyWaived(IslamicFeeSupport.money(charityWaived))
                .byReason(byReason)
                .byAuthorityLevel(byAuthority)
                .build();
    }

    private String determineAuthorityLevel(BigDecimal waivedAmount) {
        if (waivedAmount.compareTo(new BigDecimal("500")) < 0) {
            return "OFFICER";
        }
        if (waivedAmount.compareTo(new BigDecimal("2000")) <= 0) {
            return "BRANCH_MANAGER";
        }
        if (waivedAmount.compareTo(new BigDecimal("10000")) <= 0) {
            return "REGIONAL_MANAGER";
        }
        return "HEAD_OFFICE";
    }

    private String appendNote(String existingNotes, String newNote) {
        if (existingNotes == null || existingNotes.isBlank()) {
            return newNote;
        }
        return existingNotes + " | " + newNote;
    }
}
