package com.cbs.zakat.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.cbs.zakat.dto.ZakatRequests;
import com.cbs.zakat.dto.ZakatResponses;
import com.cbs.zakat.entity.ZakatComputation;
import com.cbs.zakat.entity.ZakatDomainEnums;
import com.cbs.zakat.entity.ZatcaReturn;
import com.cbs.zakat.repository.ZakatComputationRepository;
import com.cbs.zakat.repository.ZatcaReturnRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ZatcaIntegrationService {

    private final ZatcaReturnRepository zatcaReturnRepository;
    private final ZakatComputationRepository computationRepository;
    private final CurrentTenantResolver tenantResolver;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public ZakatResponses.FiledReturnReference prepareReturn(ZakatRequests.PrepareZatcaReturnRequest request) {
        ZakatComputation computation = computationRepository.findById(request.getComputationId())
                .orElseThrow(() -> new ResourceNotFoundException("ZakatComputation", "id", request.getComputationId()));
        if (computation.getStatus() != ZakatDomainEnums.ZakatStatus.APPROVED
                && computation.getStatus() != ZakatDomainEnums.ZakatStatus.FILED_WITH_ZATCA
                && computation.getStatus() != ZakatDomainEnums.ZakatStatus.ZATCA_ASSESSED) {
            throw new BusinessException("ZATCA return can only be prepared for approved computations",
                    "ZATCA_RETURN_INVALID_COMPUTATION_STATE");
        }

        ZatcaReturn zatcaReturn = zatcaReturnRepository.findByComputationId(computation.getId())
                .orElseGet(ZatcaReturn::new);
        if (zatcaReturn.getId() == null) {
            zatcaReturn.setReturnRef(ZakatSupport.buildReference("ZATCA"));
        }
        zatcaReturn.setComputationId(computation.getId());
        zatcaReturn.setZakatYear(computation.getZakatYear());
        zatcaReturn.setReturnType(request.getReturnType());
        zatcaReturn.setFilingMethod(request.getFilingMethod());
        zatcaReturn.setZatcaFormData(buildFormData(computation));
        zatcaReturn.setStatus(ZakatDomainEnums.ZatcaReturnStatus.PREPARED);
        zatcaReturn.setPaymentStatus(computation.getAdjustedZakatAmount().compareTo(BigDecimal.ZERO) > 0
                ? ZakatDomainEnums.PaymentStatus.DUE
                : ZakatDomainEnums.PaymentStatus.NOT_DUE);
        zatcaReturn.setTenantId(tenantResolver.getCurrentTenantId());
        zatcaReturn = zatcaReturnRepository.save(zatcaReturn);

        computation.setZatcaReturnId(zatcaReturn.getId());
        computationRepository.save(computation);

        return ZakatResponses.FiledReturnReference.builder()
                .returnId(zatcaReturn.getId())
                .returnRef(zatcaReturn.getReturnRef())
                .filingConfirmationRef(zatcaReturn.getFilingConfirmationRef())
                .build();
    }

    @Transactional
    public ZatcaReturn fileReturn(String returnRef) {
        ZatcaReturn zatcaReturn = getReturn(returnRef);
        zatcaReturn.setFilingDate(LocalDate.now());
        zatcaReturn.setFiledBy(currentActorProvider.getCurrentActor());
        zatcaReturn.setFilingConfirmationRef(ZakatSupport.buildReference("ZATCA-FILE"));
        zatcaReturn.setStatus(ZakatDomainEnums.ZatcaReturnStatus.FILED);
        ZatcaReturn saved = zatcaReturnRepository.save(zatcaReturn);
        syncComputationStatus(saved, ZakatDomainEnums.ZakatStatus.FILED_WITH_ZATCA);
        return saved;
    }

    @Transactional
    public ZatcaReturn recordAssessment(String returnRef, ZakatRequests.ZatcaAssessmentDetails request) {
        ZatcaReturn zatcaReturn = getReturn(returnRef);
        ZakatComputation computation = getComputation(zatcaReturn.getComputationId());

        zatcaReturn.setAssessmentDate(request.getAssessmentDate());
        zatcaReturn.setAssessmentRef(request.getAssessmentRef());
        zatcaReturn.setAssessedZakatAmount(ZakatSupport.money(request.getAssessedZakatAmount()));
        zatcaReturn.setAssessmentDifference(ZakatSupport.money(request.getAssessedZakatAmount())
                .subtract(ZakatSupport.money(computation.getAdjustedZakatAmount())));
        zatcaReturn.setAssessmentStatus(request.getAssessmentStatus());
        zatcaReturn.setAssessmentNotes(request.getAssessmentNotes());
        zatcaReturn.setPaymentDueDate(request.getPaymentDueDate());
        zatcaReturn.setStatus(request.getAssessmentStatus() == ZakatDomainEnums.AssessmentStatus.APPEALED
                ? ZakatDomainEnums.ZatcaReturnStatus.APPEALED
                : ZakatDomainEnums.ZatcaReturnStatus.ASSESSED);
        zatcaReturn.setPaymentStatus(request.getAssessedZakatAmount().compareTo(BigDecimal.ZERO) > 0
                ? ZakatDomainEnums.PaymentStatus.DUE
                : ZakatDomainEnums.PaymentStatus.NOT_DUE);
        ZatcaReturn saved = zatcaReturnRepository.save(zatcaReturn);

        computation.setZatcaAssessmentRef(request.getAssessmentRef());
        computationRepository.save(computation);
        syncComputationStatus(saved, ZakatDomainEnums.ZakatStatus.ZATCA_ASSESSED);
        return saved;
    }

    @Transactional
    public ZatcaReturn recordPayment(String returnRef, ZakatRequests.PaymentDetails request) {
        ZatcaReturn zatcaReturn = getReturn(returnRef);
        BigDecimal expectedAmount = expectedPaymentAmount(zatcaReturn);
        zatcaReturn.setPaymentAmount(ZakatSupport.money(request.getPaymentAmount()));
        zatcaReturn.setPaymentDate(request.getPaymentDate());
        zatcaReturn.setPaymentRef(request.getPaymentRef());
        zatcaReturn.setPaymentStatus(request.getPaymentAmount().compareTo(expectedAmount) >= 0
                ? ZakatDomainEnums.PaymentStatus.PAID
                : ZakatDomainEnums.PaymentStatus.PARTIALLY_PAID);
        zatcaReturn.setStatus(request.getPaymentAmount().compareTo(expectedAmount) >= 0
                ? ZakatDomainEnums.ZatcaReturnStatus.PAID
                : ZakatDomainEnums.ZatcaReturnStatus.ASSESSED);
        ZatcaReturn saved = zatcaReturnRepository.save(zatcaReturn);
        if (saved.getPaymentStatus() == ZakatDomainEnums.PaymentStatus.PAID) {
            syncComputationStatus(saved, ZakatDomainEnums.ZakatStatus.PAID);
        }
        return saved;
    }

    @Transactional
    public ZatcaReturn fileAppeal(String returnRef, ZakatRequests.AppealDetails request) {
        ZatcaReturn zatcaReturn = getReturn(returnRef);
        zatcaReturn.setAppealFiled(true);
        zatcaReturn.setAppealDate(request.getAppealDate());
        zatcaReturn.setAppealRef(request.getAppealRef());
        zatcaReturn.setAppealReason(request.getAppealReason());
        zatcaReturn.setAssessmentStatus(ZakatDomainEnums.AssessmentStatus.APPEALED);
        zatcaReturn.setStatus(ZakatDomainEnums.ZatcaReturnStatus.APPEALED);
        ZatcaReturn saved = zatcaReturnRepository.save(zatcaReturn);
        syncComputationStatus(saved, ZakatDomainEnums.ZakatStatus.ZATCA_ASSESSED);
        return saved;
    }

    @Transactional
    public ZatcaReturn recordAppealOutcome(String returnRef, ZakatRequests.AppealOutcomeDetails request) {
        ZatcaReturn zatcaReturn = getReturn(returnRef);
        zatcaReturn.setAppealOutcome(request.getAppealOutcome());
        zatcaReturn.setAppealOutcomeDate(request.getAppealOutcomeDate());
        zatcaReturn.setAssessmentNotes(mergeNotes(zatcaReturn.getAssessmentNotes(), request.getNotes()));
        if (request.getAppealOutcome() == ZakatDomainEnums.AppealOutcome.DISMISSED) {
            zatcaReturn.setStatus(zatcaReturn.getPaymentStatus() == ZakatDomainEnums.PaymentStatus.PAID
                    ? ZakatDomainEnums.ZatcaReturnStatus.CLOSED
                    : ZakatDomainEnums.ZatcaReturnStatus.ASSESSED);
        }
        return zatcaReturnRepository.save(zatcaReturn);
    }

    @Transactional(readOnly = true)
    public ZatcaReturn getReturn(String returnRef) {
        return zatcaReturnRepository.findByReturnRef(returnRef)
                .orElseThrow(() -> new ResourceNotFoundException("ZatcaReturn", "returnRef", returnRef));
    }

    @Transactional(readOnly = true)
    public ZakatResponses.ZatcaFilingHistory getFilingHistory() {
        List<ZatcaReturn> returns = zatcaReturnRepository.findAllByOrderByCreatedAtDesc();
        Map<String, Long> countsByStatus = returns.stream()
                .collect(Collectors.groupingBy(item -> item.getStatus().name(), LinkedHashMap::new, Collectors.counting()));
        List<Map<String, Object>> history = returns.stream()
                .map(item -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("returnRef", item.getReturnRef());
                    row.put("zakatYear", item.getZakatYear());
                    row.put("status", item.getStatus().name());
                    row.put("filingDate", item.getFilingDate());
                    row.put("assessmentRef", item.getAssessmentRef());
                    row.put("paymentRef", item.getPaymentRef());
                    row.put("paymentStatus", item.getPaymentStatus() != null ? item.getPaymentStatus().name() : null);
                    row.put("assessedZakatAmount", item.getAssessedZakatAmount());
                    return row;
                })
                .toList();
        long totalPaid = returns.stream()
                .filter(item -> item.getPaymentStatus() == ZakatDomainEnums.PaymentStatus.PAID)
                .count();
        return ZakatResponses.ZatcaFilingHistory.builder()
                .returns(history)
                .countsByStatus(countsByStatus)
                .totalReturns(returns.size())
                .totalPaid(totalPaid)
                .build();
    }

    private Map<String, Object> buildFormData(ZakatComputation computation) {
        Map<String, Object> form = new LinkedHashMap<>();
        form.put("computationRef", computation.getComputationRef());
        form.put("zakatYear", computation.getZakatYear());
        form.put("zakatBase", computation.getZakatBase());
        form.put("zakatAmount", computation.getAdjustedZakatAmount());
        form.put("methodologyCode", computation.getMethodologyCode());
        form.put("periodFrom", computation.getPeriodFrom());
        form.put("periodTo", computation.getPeriodTo());
        form.put("assetBreakdown", computation.getAssetBreakdown());
        form.put("liabilityBreakdown", computation.getLiabilityBreakdown());
        return form;
    }

    private ZakatComputation getComputation(UUID computationId) {
        return computationRepository.findById(computationId)
                .orElseThrow(() -> new ResourceNotFoundException("ZakatComputation", "id", computationId));
    }

    private void syncComputationStatus(ZatcaReturn zatcaReturn, ZakatDomainEnums.ZakatStatus status) {
        ZakatComputation computation = getComputation(zatcaReturn.getComputationId());
        computation.setZatcaReturnId(zatcaReturn.getId());
        computation.setZatcaAssessmentRef(zatcaReturn.getAssessmentRef());
        computation.setStatus(status);
        computationRepository.save(computation);
    }

    private BigDecimal expectedPaymentAmount(ZatcaReturn zatcaReturn) {
        if (zatcaReturn.getAssessedZakatAmount() != null) {
            return ZakatSupport.money(zatcaReturn.getAssessedZakatAmount());
        }
        return ZakatSupport.money(getComputation(zatcaReturn.getComputationId()).getAdjustedZakatAmount());
    }

    private String mergeNotes(String existing, String append) {
        if (append == null || append.isBlank()) {
            return existing;
        }
        if (existing == null || existing.isBlank()) {
            return append;
        }
        return existing + System.lineSeparator() + append;
    }
}