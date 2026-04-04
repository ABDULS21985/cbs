package com.cbs.mudarabah.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.mudarabah.dto.CreatePsrScheduleRequest;
import com.cbs.mudarabah.dto.CustomerConsentDetails;
import com.cbs.mudarabah.dto.InitiatePsrChangeRequest;
import com.cbs.mudarabah.dto.PsrChangeRequestResponse;
import com.cbs.mudarabah.dto.PsrDistributionSummary;
import com.cbs.mudarabah.dto.PsrResolution;
import com.cbs.mudarabah.dto.PsrScheduleResponse;
import com.cbs.mudarabah.entity.CustomerConsentMethod;
import com.cbs.mudarabah.entity.MudarabahAccount;
import com.cbs.mudarabah.entity.MudarabahAccountSubType;
import com.cbs.mudarabah.entity.ProfitSharingRatioSchedule;
import com.cbs.mudarabah.entity.PsrChangeReason;
import com.cbs.mudarabah.entity.PsrChangeRequest;
import com.cbs.mudarabah.entity.PsrChangeStatus;
import com.cbs.mudarabah.entity.PsrScheduleType;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.mudarabah.repository.ProfitSharingRatioScheduleRepository;
import com.cbs.mudarabah.repository.PsrChangeRequestRepository;
import com.cbs.rulesengine.dto.DecisionResultResponse;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PsrService {

    private final ProfitSharingRatioScheduleRepository scheduleRepository;
    private final PsrChangeRequestRepository changeRequestRepository;
    private final MudarabahAccountRepository mudarabahAccountRepository;
    private final DecisionTableEvaluator decisionTableEvaluator;

    public PsrResolution resolvePsr(Long productTemplateId, Map<String, Object> context) {
        // 1. Try to find active schedule for product
        Optional<ProfitSharingRatioSchedule> scheduleOpt = scheduleRepository.findActiveSchedule(productTemplateId, LocalDate.now());
        if (scheduleOpt.isEmpty()) {
            // Return default
            return PsrResolution.builder()
                    .customerRatio(new BigDecimal("70.0000"))
                    .bankRatio(new BigDecimal("30.0000"))
                    .resolutionMethod("DEFAULT")
                    .isNegotiated(false)
                    .build();
        }

        ProfitSharingRatioSchedule schedule = scheduleOpt.get();

        if (schedule.getScheduleType() == PsrScheduleType.FLAT) {
            return PsrResolution.builder()
                    .customerRatio(schedule.getFlatPsrCustomer())
                    .bankRatio(schedule.getFlatPsrBank())
                    .resolutionMethod("FLAT")
                    .isNegotiated(false)
                    .build();
        }

        // For tiered types, evaluate decision table
        String dtCode = schedule.getDecisionTableCode();
        if (dtCode == null || dtCode.isBlank()) {
            throw new BusinessException("Decision table code not configured for tiered PSR schedule", "PSR_DT_MISSING");
        }

        DecisionResultResponse dtResult = decisionTableEvaluator.evaluateByRuleCode(dtCode, context);
        if (!Boolean.TRUE.equals(dtResult.getMatched())) {
            throw new BusinessException("No PSR tier matched for inputs: " + context, "PSR_NO_MATCH");
        }

        Map<String, Object> outputs = dtResult.getOutputs();
        BigDecimal customerRatio = new BigDecimal(outputs.get("psr_customer").toString());
        BigDecimal bankRatio = new BigDecimal(outputs.get("psr_bank").toString());

        validatePsrIsRatioNotFixedAmount(customerRatio, bankRatio);

        return PsrResolution.builder()
                .customerRatio(customerRatio)
                .bankRatio(bankRatio)
                .resolutionMethod(schedule.getScheduleType().name())
                .decisionTableUsed(dtCode)
                .inputsUsed(context)
                .isNegotiated(false)
                .build();
    }

    public void validatePsrImmutability(Long mudarabahAccountId, BigDecimal proposedCustomer, BigDecimal proposedBank) {
        MudarabahAccount ma = mudarabahAccountRepository.findById(mudarabahAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Mudarabah account not found"));

        if (ma.getAccountSubType() == MudarabahAccountSubType.TERM_DEPOSIT) {
            throw new BusinessException(
                    "Profit-sharing ratio cannot be modified on a term deposit after contract inception (ST-006)",
                    "PSR_IMMUTABLE_TD");
        }
    }

    public PsrChangeRequestResponse initiateChangeRequest(InitiatePsrChangeRequest request) {
        MudarabahAccount ma = mudarabahAccountRepository.findById(request.getMudarabahAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Mudarabah account not found"));

        // Validate not TD
        if (ma.getAccountSubType() == MudarabahAccountSubType.TERM_DEPOSIT) {
            throw new BusinessException("PSR cannot be changed on term deposits (ST-006)", "PSR_IMMUTABLE_TD");
        }

        validatePsrIsRatioNotFixedAmount(request.getProposedPsrCustomer(), request.getProposedPsrBank());

        BigDecimal sum = request.getProposedPsrCustomer().add(request.getProposedPsrBank());
        if (sum.compareTo(new BigDecimal("100.0000")) != 0) {
            throw new BusinessException("Proposed PSR must sum to 100. Got: " + sum, "PSR_SUM_INVALID");
        }

        // Effective date cannot be in the past
        if (request.getEffectiveDate().isBefore(LocalDate.now())) {
            throw new BusinessException("PSR change effective date cannot be retroactive", "PSR_RETROACTIVE");
        }

        PsrChangeRequest changeRequest = PsrChangeRequest.builder()
                .accountId(request.getAccountId())
                .mudarabahAccount(ma)
                .currentPsrCustomer(ma.getProfitSharingRatioCustomer())
                .currentPsrBank(ma.getProfitSharingRatioBank())
                .proposedPsrCustomer(request.getProposedPsrCustomer())
                .proposedPsrBank(request.getProposedPsrBank())
                .changeReason(PsrChangeReason.valueOf(request.getChangeReason()))
                .reasonDescription(request.getReasonDescription())
                .customerConsentRequired(true)
                .customerConsentGiven(false)
                .effectiveDate(request.getEffectiveDate())
                .status(PsrChangeStatus.DRAFT)
                .build();

        changeRequest = changeRequestRepository.save(changeRequest);
        log.info("PSR change request initiated: id={}, account={}, proposed={}:{}",
                changeRequest.getId(), request.getAccountId(), request.getProposedPsrCustomer(), request.getProposedPsrBank());
        return toChangeResponse(changeRequest);
    }

    public void recordCustomerConsent(Long changeRequestId, CustomerConsentDetails consent) {
        PsrChangeRequest cr = changeRequestRepository.findById(changeRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Change request not found"));
        if (cr.getStatus() != PsrChangeStatus.DRAFT && cr.getStatus() != PsrChangeStatus.PENDING_CONSENT) {
            throw new BusinessException("Change request not in valid state for consent", "INVALID_STATE");
        }
        cr.setCustomerConsentGiven(true);
        cr.setCustomerConsentDate(consent.getConsentDate() != null ? consent.getConsentDate() : LocalDateTime.now());
        cr.setCustomerConsentMethod(CustomerConsentMethod.valueOf(consent.getConsentMethod()));
        cr.setStatus(PsrChangeStatus.CONSENT_GIVEN);
        changeRequestRepository.save(cr);
        log.info("Customer consent recorded for PSR change request {}", changeRequestId);
    }

    public void approvePsrChange(Long changeRequestId, String approvedBy) {
        PsrChangeRequest cr = changeRequestRepository.findById(changeRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Change request not found"));
        if (cr.getStatus() != PsrChangeStatus.CONSENT_GIVEN) {
            throw new BusinessException("Change request must have customer consent before approval", "CONSENT_REQUIRED");
        }
        cr.setStatus(PsrChangeStatus.APPROVED);
        cr.setApprovedBy(approvedBy);
        cr.setApprovedAt(LocalDateTime.now());
        changeRequestRepository.save(cr);
        log.info("PSR change request {} approved by {}", changeRequestId, approvedBy);
    }

    public void applyPsrChange(Long changeRequestId) {
        PsrChangeRequest cr = changeRequestRepository.findById(changeRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Change request not found"));
        if (cr.getStatus() != PsrChangeStatus.APPROVED) {
            throw new BusinessException("Change request must be approved before applying", "NOT_APPROVED");
        }

        MudarabahAccount ma = cr.getMudarabahAccount();
        ma.setProfitSharingRatioCustomer(cr.getProposedPsrCustomer());
        ma.setProfitSharingRatioBank(cr.getProposedPsrBank());
        ma.setPsrAgreedAt(LocalDateTime.now());
        ma.setPsrAgreedVersion(ma.getPsrAgreedVersion() + 1);
        ma.setContractVersion(ma.getContractVersion() + 1);
        mudarabahAccountRepository.save(ma);

        cr.setStatus(PsrChangeStatus.APPLIED);
        cr.setAppliedAt(LocalDateTime.now());
        changeRequestRepository.save(cr);

        log.info("PSR change applied: account={}, new PSR={}:{}, version={}",
                ma.getId(), cr.getProposedPsrCustomer(), cr.getProposedPsrBank(), ma.getContractVersion());
    }

    public void validatePsrIsRatioNotFixedAmount(BigDecimal psrCustomer, BigDecimal psrBank) {
        if (psrCustomer.compareTo(new BigDecimal("100")) > 0) {
            throw new BusinessException("PSR value " + psrCustomer + " exceeds 100 — likely a fixed currency amount, not a ratio (ST-006)", "PSR_NOT_RATIO");
        }
        if (psrBank.compareTo(new BigDecimal("100")) > 0) {
            throw new BusinessException("PSR value " + psrBank + " exceeds 100 — likely a fixed currency amount, not a ratio (ST-006)", "PSR_NOT_RATIO");
        }
        if (psrCustomer.compareTo(BigDecimal.ZERO) <= 0 || psrBank.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("PSR values must be positive", "INVALID_PSR_RANGE");
        }
    }

    // Schedule management
    public PsrScheduleResponse createSchedule(CreatePsrScheduleRequest request) {
        ProfitSharingRatioSchedule schedule = ProfitSharingRatioSchedule.builder()
                .productTemplateId(request.getProductTemplateId())
                .scheduleName(request.getScheduleName())
                .scheduleType(PsrScheduleType.valueOf(request.getScheduleType()))
                .flatPsrCustomer(request.getFlatPsrCustomer())
                .flatPsrBank(request.getFlatPsrBank())
                .decisionTableCode(request.getDecisionTableCode())
                .effectiveFrom(request.getEffectiveFrom())
                .effectiveTo(request.getEffectiveTo())
                .approvedBy(request.getApprovedBy())
                .approvedAt(request.getApprovedBy() != null ? LocalDateTime.now() : null)
                .status("ACTIVE")
                .build();

        schedule = scheduleRepository.save(schedule);
        return toScheduleResponse(schedule);
    }

    @Transactional(readOnly = true)
    public List<PsrScheduleResponse> getSchedules() {
        return scheduleRepository.findAll().stream().map(this::toScheduleResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<PsrScheduleResponse> getSchedulesByProduct(Long productTemplateId) {
        return scheduleRepository.findByProductTemplateId(productTemplateId).stream().map(this::toScheduleResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<PsrChangeRequestResponse> getPendingConsentRequests() {
        return changeRequestRepository.findPendingConsentRequests().stream().map(this::toChangeResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<PsrChangeRequestResponse> getChangeHistory(Long accountId) {
        return changeRequestRepository.findByAccountId(accountId).stream().map(this::toChangeResponse).toList();
    }

    @Transactional(readOnly = true)
    public PsrDistributionSummary getPsrDistributionSummary() {
        List<MudarabahAccount> all = mudarabahAccountRepository.findAll();
        if (all.isEmpty()) {
            return PsrDistributionSummary.builder()
                    .totalAccounts(0)
                    .averageCustomerPsr(BigDecimal.ZERO)
                    .minCustomerPsr(BigDecimal.ZERO)
                    .maxCustomerPsr(BigDecimal.ZERO)
                    .build();
        }
        BigDecimal avg = all.stream().map(MudarabahAccount::getProfitSharingRatioCustomer)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(all.size()), 4, RoundingMode.HALF_UP);
        BigDecimal min = all.stream().map(MudarabahAccount::getProfitSharingRatioCustomer)
                .min(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        BigDecimal max = all.stream().map(MudarabahAccount::getProfitSharingRatioCustomer)
                .max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);

        return PsrDistributionSummary.builder()
                .totalAccounts(all.size())
                .averageCustomerPsr(avg)
                .minCustomerPsr(min)
                .maxCustomerPsr(max)
                .build();
    }

    private PsrScheduleResponse toScheduleResponse(ProfitSharingRatioSchedule s) {
        return PsrScheduleResponse.builder()
                .id(s.getId())
                .productTemplateId(s.getProductTemplateId())
                .scheduleName(s.getScheduleName())
                .scheduleType(s.getScheduleType().name())
                .flatPsrCustomer(s.getFlatPsrCustomer())
                .flatPsrBank(s.getFlatPsrBank())
                .decisionTableCode(s.getDecisionTableCode())
                .effectiveFrom(s.getEffectiveFrom())
                .effectiveTo(s.getEffectiveTo())
                .approvedBy(s.getApprovedBy())
                .approvedAt(s.getApprovedAt())
                .status(s.getStatus())
                .build();
    }

    private PsrChangeRequestResponse toChangeResponse(PsrChangeRequest cr) {
        return PsrChangeRequestResponse.builder()
                .id(cr.getId())
                .accountId(cr.getAccountId())
                .mudarabahAccountId(cr.getMudarabahAccount().getId())
                .currentPsrCustomer(cr.getCurrentPsrCustomer())
                .currentPsrBank(cr.getCurrentPsrBank())
                .proposedPsrCustomer(cr.getProposedPsrCustomer())
                .proposedPsrBank(cr.getProposedPsrBank())
                .changeReason(cr.getChangeReason().name())
                .reasonDescription(cr.getReasonDescription())
                .customerConsentRequired(cr.isCustomerConsentRequired())
                .customerConsentGiven(cr.isCustomerConsentGiven())
                .customerConsentDate(cr.getCustomerConsentDate())
                .customerConsentMethod(cr.getCustomerConsentMethod() != null ? cr.getCustomerConsentMethod().name() : null)
                .effectiveDate(cr.getEffectiveDate())
                .status(cr.getStatus().name())
                .approvedBy(cr.getApprovedBy())
                .approvedAt(cr.getApprovedAt())
                .appliedAt(cr.getAppliedAt())
                .build();
    }
}
