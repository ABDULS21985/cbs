package com.cbs.zakat.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.shariah.entity.FatwaRecord;
import com.cbs.shariah.entity.FatwaStatus;
import com.cbs.shariah.repository.FatwaRecordRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.cbs.zakat.dto.ZakatRequests;
import com.cbs.zakat.dto.ZakatResponses;
import com.cbs.zakat.entity.ZakatDomainEnums;
import com.cbs.zakat.entity.ZakatMethodology;
import com.cbs.zakat.repository.ZakatMethodologyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ZakatMethodologyService {

    private final ZakatMethodologyRepository methodologyRepository;
    private final FatwaRecordRepository fatwaRecordRepository;
    private final CurrentTenantResolver tenantResolver;

    @Transactional
    public ZakatMethodology createMethodology(ZakatMethodology request) {
        methodologyRepository.findByMethodologyCode(request.getMethodologyCode()).ifPresent(existing -> {
            throw new BusinessException("Zakat methodology already exists: " + request.getMethodologyCode(),
                    "DUPLICATE_ZAKAT_METHODOLOGY");
        });
        request.setMethodologyCode(ZakatSupport.normalize(request.getMethodologyCode()));
        request.setClassificationRuleSetCode(StringUtils.hasText(request.getClassificationRuleSetCode())
                ? ZakatSupport.normalize(request.getClassificationRuleSetCode())
                : request.getMethodologyCode());
        request.setStatus(ZakatDomainEnums.MethodologyStatus.UNDER_REVIEW);
        request.setSsbApproved(false);
        request.setFatwaId(null);
        request.setFatwaRef(null);
        request.setSsbApprovalDate(null);
        request.setSsbApprovedBy(null);
        request.setZatcaAcceptanceRef(null);
        request.setTenantId(tenantResolver.getCurrentTenantId());
        if (request.getEffectiveFrom() == null) {
            request.setEffectiveFrom(LocalDate.now());
        }
        if (request.getMethodologyVersion() == null || request.getMethodologyVersion() < 1) {
            request.setMethodologyVersion(1);
        }
        return methodologyRepository.save(request);
    }

    @Transactional
    public ZakatMethodology updateMethodology(UUID methodologyId, ZakatMethodology request) {
        ZakatMethodology existing = methodologyRepository.findById(methodologyId)
                .orElseThrow(() -> new ResourceNotFoundException("ZakatMethodology", "id", methodologyId));

        boolean reapprovalRequired = false;
        if (StringUtils.hasText(request.getName()) && !request.getName().equals(existing.getName())) {
            existing.setName(request.getName());
            reapprovalRequired = true;
        }
        if (request.getNameAr() != null && !request.getNameAr().equals(existing.getNameAr())) {
            existing.setNameAr(request.getNameAr());
            reapprovalRequired = true;
        }
        if (request.getDescription() != null && !request.getDescription().equals(existing.getDescription())) {
            existing.setDescription(request.getDescription());
            reapprovalRequired = true;
        }
        if (request.getDescriptionAr() != null && !request.getDescriptionAr().equals(existing.getDescriptionAr())) {
            existing.setDescriptionAr(request.getDescriptionAr());
            reapprovalRequired = true;
        }
        if (request.getMethodType() != null && request.getMethodType() != existing.getMethodType()) {
            existing.setMethodType(request.getMethodType());
            reapprovalRequired = true;
        }
        if (request.getZakatRateBasis() != null && request.getZakatRateBasis() != existing.getZakatRateBasis()) {
            existing.setZakatRateBasis(request.getZakatRateBasis());
            reapprovalRequired = true;
        }
        if (request.getBalanceMethod() != null && request.getBalanceMethod() != existing.getBalanceMethod()) {
            existing.setBalanceMethod(request.getBalanceMethod());
            reapprovalRequired = true;
        }
        if (request.getNisabBasis() != null && request.getNisabBasis() != existing.getNisabBasis()) {
            existing.setNisabBasis(request.getNisabBasis());
            reapprovalRequired = true;
        }
        if (request.getCustomerZakatDeductionPolicy() != null
                && request.getCustomerZakatDeductionPolicy() != existing.getCustomerZakatDeductionPolicy()) {
            existing.setCustomerZakatDeductionPolicy(request.getCustomerZakatDeductionPolicy());
            reapprovalRequired = true;
        }
        if (request.getIahTreatment() != null && request.getIahTreatment() != existing.getIahTreatment()) {
            existing.setIahTreatment(request.getIahTreatment());
            reapprovalRequired = true;
        }
        if (request.getPerIrrTreatment() != null && request.getPerIrrTreatment() != existing.getPerIrrTreatment()) {
            existing.setPerIrrTreatment(request.getPerIrrTreatment());
            reapprovalRequired = true;
        }
        if (request.getSsbReviewFrequency() != null) {
            existing.setSsbReviewFrequency(request.getSsbReviewFrequency());
        }
        if (request.getNextSsbReviewDate() != null) {
            existing.setNextSsbReviewDate(request.getNextSsbReviewDate());
        }
        if (request.getEffectiveFrom() != null) {
            existing.setEffectiveFrom(request.getEffectiveFrom());
        }
        if (request.getEffectiveTo() != null || existing.getEffectiveTo() != null) {
            existing.setEffectiveTo(request.getEffectiveTo());
        }
        if (StringUtils.hasText(request.getClassificationRuleSetCode())) {
            existing.setClassificationRuleSetCode(ZakatSupport.normalize(request.getClassificationRuleSetCode()));
            reapprovalRequired = true;
        }

        if (reapprovalRequired) {
            existing.setMethodologyVersion(existing.getMethodologyVersion() + 1);
            existing.setSsbApproved(false);
            existing.setFatwaId(null);
            existing.setFatwaRef(null);
            existing.setSsbApprovalDate(null);
            existing.setSsbApprovedBy(null);
            existing.setStatus(ZakatDomainEnums.MethodologyStatus.UNDER_REVIEW);
            existing.setZatcaAccepted(null);
            existing.setZatcaAcceptanceRef(null);
        }

        return methodologyRepository.save(existing);
    }

    @Transactional
    public void submitForSsbApproval(UUID methodologyId) {
        ZakatMethodology methodology = methodologyRepository.findById(methodologyId)
                .orElseThrow(() -> new ResourceNotFoundException("ZakatMethodology", "id", methodologyId));
        methodology.setStatus(ZakatDomainEnums.MethodologyStatus.UNDER_REVIEW);
        methodologyRepository.save(methodology);
    }

    @Transactional
    public void ssbApproveMethodology(UUID methodologyId, ZakatRequests.SsbApprovalDetails details) {
        ZakatMethodology methodology = methodologyRepository.findById(methodologyId)
                .orElseThrow(() -> new ResourceNotFoundException("ZakatMethodology", "id", methodologyId));

        FatwaRecord fatwa = null;
        if (details.getFatwaId() != null) {
            fatwa = fatwaRecordRepository.findById(details.getFatwaId())
                    .orElseThrow(() -> new ResourceNotFoundException("FatwaRecord", "id", details.getFatwaId()));
            if (fatwa.getStatus() != FatwaStatus.ACTIVE) {
                throw new BusinessException("Zakat methodology approval requires an active Fatwa reference",
                        "ZAKAT_METHOD_FATWA_NOT_ACTIVE");
            }
        }

        methodology.setFatwaId(fatwa != null ? fatwa.getId() : null);
        methodology.setFatwaRef(fatwa != null ? fatwa.getFatwaNumber() : null);
        methodology.setSsbApproved(true);
        methodology.setSsbApprovedBy(details.getApprovedBy());
        methodology.setSsbApprovalDate(details.getApprovalDate());
        methodology.setNextSsbReviewDate(details.getNextReviewDate());
        methodology.setZatcaAccepted(details.getZatcaAccepted());
        methodology.setZatcaAcceptanceRef(details.getZatcaAcceptanceRef());
        methodology.setStatus(ZakatDomainEnums.MethodologyStatus.ACTIVE);

        methodologyRepository.save(methodology);
    }

    public ZakatMethodology validateMethodologyApproved(String methodologyCode) {
        ZakatMethodology methodology = getMethodology(methodologyCode);
        if (!methodology.isSsbApproved()) {
            throw new BusinessException("Zakat methodology not approved by SSB (ST-016)",
                    "ZAKAT_METHODOLOGY_NOT_APPROVED");
        }
        if (methodology.getStatus() != ZakatDomainEnums.MethodologyStatus.ACTIVE) {
            throw new BusinessException("Zakat methodology is not active: " + methodologyCode,
                    "ZAKAT_METHODOLOGY_NOT_ACTIVE");
        }
        LocalDate today = LocalDate.now();
        if (methodology.getEffectiveTo() != null && methodology.getEffectiveTo().isBefore(today)) {
            throw new BusinessException("Zakat methodology approval has expired",
                    "ZAKAT_METHODOLOGY_EXPIRED");
        }
        if (methodology.getNextSsbReviewDate() != null && methodology.getNextSsbReviewDate().isBefore(today)) {
            log.warn("Zakat methodology {} is overdue for SSB review since {}",
                    methodology.getMethodologyCode(), methodology.getNextSsbReviewDate());
        }
        return methodology;
    }

    public ZakatResponses.MethodologyComparisonResult compareMethodologies(String code1, String code2) {
        ZakatMethodology left = getMethodology(code1);
        ZakatMethodology right = getMethodology(code2);
        Map<String, String> differences = new LinkedHashMap<>();
        compare(differences, "methodType", left.getMethodType(), right.getMethodType());
        compare(differences, "zakatRateBasis", left.getZakatRateBasis(), right.getZakatRateBasis());
        compare(differences, "balanceMethod", left.getBalanceMethod(), right.getBalanceMethod());
        compare(differences, "nisabBasis", left.getNisabBasis(), right.getNisabBasis());
        compare(differences, "iahTreatment", left.getIahTreatment(), right.getIahTreatment());
        compare(differences, "perIrrTreatment", left.getPerIrrTreatment(), right.getPerIrrTreatment());
        compare(differences, "customerDeductionPolicy", left.getCustomerZakatDeductionPolicy(),
                right.getCustomerZakatDeductionPolicy());
        boolean significantImpact = differences.containsKey("iahTreatment")
                || differences.containsKey("perIrrTreatment")
                || differences.containsKey("balanceMethod")
                || differences.containsKey("zakatRateBasis");
        return ZakatResponses.MethodologyComparisonResult.builder()
                .methodologyCode1(left.getMethodologyCode())
                .methodologyCode2(right.getMethodologyCode())
                .differences(differences)
                .significantImpact(significantImpact)
                .build();
    }

    public ZakatMethodology getActiveMethodology() {
        LocalDate today = LocalDate.now();
        return methodologyRepository.findByStatusAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
                        ZakatDomainEnums.MethodologyStatus.ACTIVE, today)
                .stream()
                .filter(ZakatMethodology::isSsbApproved)
                .filter(methodology -> methodology.getEffectiveTo() == null || !methodology.getEffectiveTo().isBefore(today))
                .findFirst()
                .orElseThrow(() -> new BusinessException("No active SSB-approved Zakat methodology is configured",
                        "ACTIVE_ZAKAT_METHODOLOGY_NOT_FOUND"));
    }

    public List<ZakatMethodology> getAllMethodologies() {
        return methodologyRepository.findAll().stream()
                .sorted((left, right) -> right.getEffectiveFrom().compareTo(left.getEffectiveFrom()))
                .toList();
    }

    public ZakatMethodology getMethodology(String methodologyCode) {
        return methodologyRepository.findByMethodologyCode(ZakatSupport.normalize(methodologyCode))
                .orElseThrow(() -> new ResourceNotFoundException("ZakatMethodology", "methodologyCode", methodologyCode));
    }

    private void compare(Map<String, String> differences, String label, Object left, Object right) {
        if (left == right || (left != null && left.equals(right))) {
            return;
        }
        differences.put(label, String.valueOf(left) + " -> " + String.valueOf(right));
    }
}