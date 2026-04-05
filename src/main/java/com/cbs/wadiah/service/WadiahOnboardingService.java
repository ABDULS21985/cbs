package com.cbs.wadiah.service;

import com.cbs.account.dto.AccountComplianceCheckRequest;
import com.cbs.account.dto.AccountComplianceCheckResponse;
import com.cbs.account.service.AccountComplianceService;
import com.cbs.card.entity.CardScheme;
import com.cbs.card.entity.CardType;
import com.cbs.card.service.CardService;
import com.cbs.cheque.service.ChequeService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerIdentificationRepository;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.notification.entity.NotificationChannel;
import com.cbs.notification.service.NotificationService;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductParameter;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductParameterRepository;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.cbs.wadiah.dto.*;
import com.cbs.wadiah.entity.WadiahDomainEnums;
import com.cbs.wadiah.entity.WadiahOnboardingApplication;
import com.cbs.wadiah.repository.WadiahOnboardingApplicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class WadiahOnboardingService {

    private static final AtomicLong APPLICATION_SEQ = new AtomicLong(System.nanoTime());

    private final WadiahOnboardingApplicationRepository applicationRepository;
    private final WadiahAccountService wadiahAccountService;
    private final CustomerRepository customerRepository;
    private final CustomerIdentificationRepository customerIdentificationRepository;
    private final IslamicProductTemplateRepository islamicProductTemplateRepository;
    private final IslamicProductParameterRepository islamicProductParameterRepository;
    private final AccountComplianceService accountComplianceService;
    private final NotificationService notificationService;
    private final CardService cardService;
    private final ChequeService chequeService;
    private final CurrentTenantResolver currentTenantResolver;

    public WadiahOnboardingResponse initiateApplication(InitiateWadiahApplicationRequest request) {
        if (request.getCustomerId() == null && request.getNewCustomerOnboardingId() == null) {
            throw new BusinessException("Existing customer or new customer onboarding reference is required",
                    "CUSTOMER_REFERENCE_REQUIRED");
        }
        if (request.getCustomerId() != null) {
            customerRepository.findById(request.getCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", request.getCustomerId()));
        }
        IslamicProductTemplate product = resolveWadiahTemplate(request.getProductCode());

        WadiahOnboardingApplication application = WadiahOnboardingApplication.builder()
                .applicationRef(generateApplicationRef())
                .customerId(request.getCustomerId())
                .newCustomerOnboardingId(request.getNewCustomerOnboardingId())
                .productTemplateId(product.getId())
                .productCode(product.getProductCode())
                .currencyCode(StringUtils.hasText(request.getCurrencyCode()) ? request.getCurrencyCode() : "SAR")
                .branchCode(request.getBranchCode())
                .officerId(request.getOfficerId())
                .channel(request.getChannel())
                .status(WadiahDomainEnums.ApplicationStatus.INITIATED)
                .currentStep(1)
                .initiatedAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusDays(30))
                .tenantId(currentTenantResolver.getCurrentTenantId())
                .build();
        markStep(application, "INITIATED", "COMPLETED");
        return toResponse(applicationRepository.save(application), null);
    }

    public WadiahOnboardingResponse advanceToKycVerification(Long applicationId) {
        WadiahOnboardingApplication application = getApplicationEntity(applicationId);
        ensureNotExpired(application);
        boolean verified = application.getCustomerId() != null
                && !customerIdentificationRepository.findVerifiedByCustomerId(application.getCustomerId()).isEmpty();
        application.setKycVerified(verified);
        application.setStatus(verified
                ? WadiahDomainEnums.ApplicationStatus.PRODUCT_SELECTION
                : WadiahDomainEnums.ApplicationStatus.KYC_VERIFICATION);
        application.setCurrentStep(verified ? 2 : 1);
        markStep(application, "KYC_VERIFICATION", verified ? "COMPLETED" : "BLOCKED");
        return toResponse(applicationRepository.save(application),
                verified ? null : "KYC must be completed before the application can proceed");
    }

    public WadiahOnboardingResponse selectProduct(Long applicationId, String productCode, String currencyCode) {
        WadiahOnboardingApplication application = getApplicationEntity(applicationId);
        ensureNotExpired(application);
        IslamicProductTemplate product = resolveWadiahTemplate(productCode);
        application.setProductTemplateId(product.getId());
        application.setProductCode(product.getProductCode());
        application.setCurrencyCode(StringUtils.hasText(currencyCode) ? currencyCode : application.getCurrencyCode());
        application.setStatus(WadiahDomainEnums.ApplicationStatus.SHARIAH_DISCLOSURE);
        application.setCurrentStep(3);
        markStep(application, "PRODUCT_SELECTION", "COMPLETED");
        return toResponse(applicationRepository.save(application), null);
    }

    public WadiahOnboardingResponse presentShariahDisclosure(Long applicationId) {
        WadiahOnboardingApplication application = getApplicationEntity(applicationId);
        ensureNotExpired(application);
        application.setShariahDisclosurePresented(true);
        application.setStatus(WadiahDomainEnums.ApplicationStatus.SHARIAH_DISCLOSURE);
        application.setCurrentStep(4);
        markStep(application, "SHARIAH_DISCLOSURE", "COMPLETED");
        return toResponse(applicationRepository.save(application),
                buildDisclosureText(resolveLanguage(application)));
    }

    public WadiahOnboardingResponse acceptShariahDisclosure(Long applicationId,
                                                            AcceptShariahDisclosureRequest request) {
        WadiahOnboardingApplication application = getApplicationEntity(applicationId);
        ensureNotExpired(application);
        if (!Boolean.TRUE.equals(application.getShariahDisclosurePresented())) {
            throw new BusinessException("Shariah disclosure must be presented before acceptance",
                    "DISCLOSURE_NOT_PRESENTED");
        }
        if (!request.isShariahDisclosureAccepted()
                || !request.isHibahNonGuaranteeAcknowledged()
                || !request.isZakatObligationAcknowledged()) {
            throw new BusinessException("All Wadiah Shariah acknowledgements must be explicitly accepted",
                    "DISCLOSURE_INCOMPLETE");
        }
        application.setShariahDisclosureAccepted(request.isShariahDisclosureAccepted());
        application.setShariahDisclosureAcceptedAt(LocalDateTime.now());
        application.setHibahNonGuaranteeAcknowledged(request.isHibahNonGuaranteeAcknowledged());
        application.setHibahAcknowledgedAt(LocalDateTime.now());
        application.setZakatObligationDisclosed(request.isZakatObligationAcknowledged());
        application.setZakatAcknowledgedAt(LocalDateTime.now());
        application.setStatus(WadiahDomainEnums.ApplicationStatus.DOCUMENT_SIGNING);
        application.setCurrentStep(5);
        markStep(application, "DISCLOSURE_ACCEPTANCE", "COMPLETED");
        return toResponse(applicationRepository.save(application), null);
    }

    public WadiahOnboardingResponse configureAccount(Long applicationId, WadiahAccountConfigRequest request) {
        WadiahOnboardingApplication application = getApplicationEntity(applicationId);
        ensureNotExpired(application);
        Map<String, Object> features = application.getRequestedFeatures() != null
                ? new LinkedHashMap<>(application.getRequestedFeatures())
                : new LinkedHashMap<>();
        putIfNotNull(features, "chequeBook", request.getChequeBook());
        putIfNotNull(features, "debitCard", request.getDebitCard());
        putIfNotNull(features, "onlineBanking", request.getOnlineBanking());
        putIfNotNull(features, "mobileBanking", request.getMobileBanking());
        putIfNotNull(features, "smsAlerts", request.getSmsAlerts());
        putIfNotNull(features, "eStatements", request.getEStatements());
        putIfNotNull(features, "sweepToInvestment", request.getSweepToInvestment());
        putIfNotNull(features, "sweepTargetAccountId", request.getSweepTargetAccountId());
        putIfNotNull(features, "sweepThreshold", request.getSweepThreshold());
        putIfNotNull(features, "initialDeposit", request.getInitialDeposit());
        // Validate sweep target account exists and is a Mudarabah account
        if (Boolean.TRUE.equals(request.getSweepToInvestment()) && request.getSweepTargetAccountId() != null) {
            wadiahAccountService.validateSweepTargetAccount(
                    Long.parseLong(String.valueOf(request.getSweepTargetAccountId())));
        }
        application.setRequestedFeatures(features);
        application.setStatus(WadiahDomainEnums.ApplicationStatus.COMPLIANCE_CHECK);
        application.setCurrentStep(6);
        markStep(application, "ACCOUNT_CONFIGURATION", "COMPLETED");
        return toResponse(applicationRepository.save(application), null);
    }

    public WadiahOnboardingResponse runComplianceChecks(Long applicationId) {
        WadiahOnboardingApplication application = getApplicationEntity(applicationId);
        ensureNotExpired(application);
        if (application.getCustomerId() == null) {
            throw new BusinessException("Compliance checks require an existing customer", "CUSTOMER_REQUIRED");
        }
        AccountComplianceCheckResponse compliance = accountComplianceService.check(AccountComplianceCheckRequest.builder()
                .customerId(application.getCustomerId())
                .productCode(application.getProductCode())
                .build());
        application.setKycVerified(compliance.isKycVerified());
        application.setAmlScreeningPassed(compliance.isAmlClear());
        application.setDuplicateCheckPassed(!compliance.isDuplicateFound());
        application.setComplianceNotes(buildComplianceNotes(compliance));
        if (!compliance.isKycVerified() || !compliance.isAmlClear() || compliance.isDuplicateFound()) {
            application.setStatus(WadiahDomainEnums.ApplicationStatus.REJECTED);
            application.setRejectionReason(application.getComplianceNotes());
        } else {
            application.setStatus(WadiahDomainEnums.ApplicationStatus.PENDING_APPROVAL);
            application.setCurrentStep(7);
        }
        markStep(application, "COMPLIANCE_CHECK", compliance.isAmlClear() && !compliance.isDuplicateFound()
                ? "COMPLETED" : "FAILED");
        return toResponse(applicationRepository.save(application), null);
    }

    public WadiahOnboardingResponse submitForApproval(Long applicationId) {
        WadiahOnboardingApplication application = getApplicationEntity(applicationId);
        ensureNotExpired(application);
        if (!Boolean.TRUE.equals(application.getShariahDisclosureAccepted())
                || !Boolean.TRUE.equals(application.getHibahNonGuaranteeAcknowledged())
                || !Boolean.TRUE.equals(application.getZakatObligationDisclosed())) {
            throw new BusinessException("All Shariah disclosures must be accepted before submission",
                    "DISCLOSURE_INCOMPLETE");
        }
        if (!Boolean.TRUE.equals(application.getKycVerified())) {
            throw new BusinessException("KYC verification is still pending", "KYC_NOT_VERIFIED");
        }
        application.setStatus(WadiahDomainEnums.ApplicationStatus.PENDING_APPROVAL);
        markStep(application, "SUBMIT_FOR_APPROVAL", "COMPLETED");
        return toResponse(applicationRepository.save(application), null);
    }

    public WadiahOnboardingResponse approveApplication(Long applicationId, String approvedBy) {
        WadiahOnboardingApplication application = getApplicationEntity(applicationId);
        ensureNotExpired(application);
        if (application.getStatus() != WadiahDomainEnums.ApplicationStatus.PENDING_APPROVAL) {
            throw new BusinessException("Application is not pending approval", "NOT_PENDING_APPROVAL");
        }
        if (StringUtils.hasText(application.getOfficerId())
                && application.getOfficerId().equalsIgnoreCase(approvedBy)) {
            throw new BusinessException("Four-eyes principle violated", "FOUR_EYES_VIOLATION");
        }
        Map<String, Object> features = application.getRequestedFeatures();
        // Resolve wadiahType from application features, falling back to product-based resolution, then default
        WadiahDomainEnums.WadiahType resolvedWadiahType = WadiahDomainEnums.WadiahType.YAD_DHAMANAH;
        if (features != null && features.get("wadiahType") != null) {
            try {
                resolvedWadiahType = WadiahDomainEnums.WadiahType.valueOf(String.valueOf(features.get("wadiahType")));
            } catch (IllegalArgumentException ignored) {
                // keep default
            }
        }
        // Resolve hibahEligible from application features, defaulting to true
        boolean resolvedHibahEligible = true;
        if (features != null && features.get("hibahEligible") != null) {
            resolvedHibahEligible = Boolean.parseBoolean(String.valueOf(features.get("hibahEligible")));
        }
        WadiahAccountResponse opened = wadiahAccountService.openWadiahAccount(OpenWadiahAccountRequest.builder()
                .customerId(application.getCustomerId())
                .productCode(application.getProductCode())
                .currencyCode(application.getCurrencyCode())
                .openingBalance(toBigDecimal(features.get("initialDeposit")))
                .branchCode(application.getBranchCode())
                .wadiahType(resolvedWadiahType)
                .hibahEligible(resolvedHibahEligible)
                .hibahDisclosureSigned(true)
                .hibahDisclosureDate(LocalDate.now())
                .chequeBookEnabled(Boolean.TRUE.equals(features.get("chequeBook")))
                .debitCardEnabled(Boolean.TRUE.equals(features.get("debitCard")))
                .onlineBankingEnabled(!Boolean.FALSE.equals(features.get("onlineBanking")))
                .mobileEnabled(!Boolean.FALSE.equals(features.get("mobileBanking")))
                .build());

        if (Boolean.TRUE.equals(features.get("chequeBook"))) {
            chequeService.issueBook(opened.getAccountId(), "WAD", 100000 + application.getId().intValue(), 25);
        }
        if (Boolean.TRUE.equals(features.get("debitCard"))) {
            cardService.issueCard(opened.getAccountId(), CardType.DEBIT, CardScheme.VISA,
                    "CLASSIC", opened.getCustomerName(), null,
                    null, null, null, null, null);
        }
        if (Boolean.TRUE.equals(features.get("sweepToInvestment")) && features.get("sweepTargetAccountId") != null) {
            wadiahAccountService.configureSweep(opened.getAccountId(),
                    Long.parseLong(String.valueOf(features.get("sweepTargetAccountId"))),
                    toBigDecimal(features.get("sweepThreshold")));
        }

        application.setStatus(WadiahDomainEnums.ApplicationStatus.APPROVED);
        application.setAccountId(opened.getAccountId());
        application.setWadiahAccountId(opened.getId());
        application.setContractReference(opened.getContractReference());
        application.setApprovedBy(approvedBy);
        application.setApprovedAt(LocalDateTime.now());
        application.setCompletedAt(LocalDateTime.now());
        markStep(application, "APPROVAL", "COMPLETED");
        notifyCustomer(application);
        return toResponse(applicationRepository.save(application), null);
    }

    public WadiahOnboardingResponse rejectApplication(Long applicationId, String reason, String rejectedBy) {
        WadiahOnboardingApplication application = getApplicationEntity(applicationId);
        application.setStatus(WadiahDomainEnums.ApplicationStatus.REJECTED);
        application.setRejectionReason(reason);
        application.setApprovedBy(rejectedBy);
        application.setCompletedAt(LocalDateTime.now());
        markStep(application, "REJECTION", "COMPLETED");
        return toResponse(applicationRepository.save(application), null);
    }

    public WadiahOnboardingResponse cancelApplication(Long applicationId, String reason) {
        WadiahOnboardingApplication application = getApplicationEntity(applicationId);
        application.setStatus(WadiahDomainEnums.ApplicationStatus.CANCELLED);
        application.setRejectionReason(reason);
        application.setCompletedAt(LocalDateTime.now());
        markStep(application, "CANCELLATION", "COMPLETED");
        return toResponse(applicationRepository.save(application), null);
    }

    @Transactional(readOnly = true)
    public WadiahOnboardingResponse getApplication(Long applicationId) {
        WadiahOnboardingApplication application = getApplicationEntity(applicationId);
        return toResponse(application, application.getShariahDisclosurePresented()
                ? buildDisclosureText(resolveLanguage(application))
                : null);
    }

    @Transactional(readOnly = true)
    public Page<WadiahOnboardingResponse> getPendingApplications(Pageable pageable) {
        return applicationRepository.findByStatus(WadiahDomainEnums.ApplicationStatus.PENDING_APPROVAL, pageable)
                .map(item -> toResponse(item, null));
    }

    @Transactional(readOnly = true)
    public Page<WadiahOnboardingResponse> getApplicationsByOfficer(String officerId, Pageable pageable) {
        return applicationRepository.findByOfficerId(officerId, pageable).map(item -> toResponse(item, null));
    }

    @Transactional(readOnly = true)
    public Page<WadiahOnboardingResponse> getApplicationsByStatus(WadiahDomainEnums.ApplicationStatus status,
                                                                  Pageable pageable) {
        return applicationRepository.findByStatus(status, pageable).map(item -> toResponse(item, null));
    }

    public void expireStaleApplications() {
        List<WadiahDomainEnums.ApplicationStatus> expirableStatuses = List.of(
                WadiahDomainEnums.ApplicationStatus.INITIATED,
                WadiahDomainEnums.ApplicationStatus.KYC_VERIFICATION,
                WadiahDomainEnums.ApplicationStatus.PRODUCT_SELECTION,
                WadiahDomainEnums.ApplicationStatus.SHARIAH_DISCLOSURE,
                WadiahDomainEnums.ApplicationStatus.DOCUMENT_SIGNING,
                WadiahDomainEnums.ApplicationStatus.COMPLIANCE_CHECK,
                WadiahDomainEnums.ApplicationStatus.PENDING_APPROVAL
        );
        List<WadiahOnboardingApplication> stale = applicationRepository.findByStatusInAndExpiresAtBefore(
                expirableStatuses, LocalDateTime.now());
        for (WadiahOnboardingApplication application : stale) {
            application.setStatus(WadiahDomainEnums.ApplicationStatus.EXPIRED);
            application.setCompletedAt(LocalDateTime.now());
            markStep(application, "EXPIRY", "COMPLETED");
        }
        applicationRepository.saveAll(stale);
    }

    private WadiahOnboardingApplication getApplicationEntity(Long applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("WadiahOnboardingApplication", "id", applicationId));
    }

    private IslamicProductTemplate resolveWadiahTemplate(String productCode) {
        IslamicProductTemplate product = islamicProductTemplateRepository.findByProductCodeIgnoreCase(productCode)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductTemplate", "productCode", productCode));
        if (product.getContractType() == null || !"WADIAH".equalsIgnoreCase(product.getContractType().getCode())) {
            throw new BusinessException("Selected product is not a Wadiah product", "INVALID_WADIAH_PRODUCT");
        }
        if (product.getStatus() != IslamicDomainEnums.IslamicProductStatus.ACTIVE) {
            throw new BusinessException("Islamic product must be ACTIVE", "PRODUCT_NOT_ACTIVE");
        }
        return product;
    }

    private void ensureNotExpired(WadiahOnboardingApplication application) {
        if (application.getExpiresAt() != null && LocalDateTime.now().isAfter(application.getExpiresAt())) {
            throw new BusinessException("Application has expired", "APPLICATION_EXPIRED");
        }
    }

    private void markStep(WadiahOnboardingApplication application, String stepName, String status) {
        List<Map<String, Object>> steps = application.getSteps();
        steps.removeIf(step -> stepName.equals(step.get("step")));
        steps.add(Map.of(
                "step", stepName,
                "status", status,
                "completedAt", LocalDateTime.now().toString(),
                "completedBy", StringUtils.hasText(application.getOfficerId()) ? application.getOfficerId() : "SYSTEM"
        ));
        application.setSteps(steps);
    }

    private void putIfNotNull(Map<String, Object> map, String key, Object value) {
        if (value != null) {
            map.put(key, value);
        }
    }

    private WadiahDomainEnums.WadiahType resolveWadiahType(Long productTemplateId) {
        if (productTemplateId != null) {
            String wadiahTypeParam = islamicProductParameterRepository
                    .findByProductTemplateIdAndParameterNameIgnoreCase(productTemplateId, "wadiahType")
                    .map(IslamicProductParameter::getParameterValue)
                    .orElse(null);
            if (wadiahTypeParam != null) {
                try {
                    return WadiahDomainEnums.WadiahType.valueOf(wadiahTypeParam.trim().toUpperCase());
                } catch (IllegalArgumentException ignored) {
                    log.warn("Invalid wadiahType parameter '{}' on product template {}. Defaulting to YAD_DHAMANAH.",
                            wadiahTypeParam, productTemplateId);
                }
            }
        }
        return WadiahDomainEnums.WadiahType.YAD_DHAMANAH;
    }

    private String resolveLanguage(WadiahOnboardingApplication application) {
        if (application.getCustomerId() == null) {
            return "EN";
        }
        Customer customer = customerRepository.findById(application.getCustomerId()).orElse(null);
        if (customer == null || !StringUtils.hasText(customer.getPreferredLanguage())) {
            return "EN";
        }
        String preferred = customer.getPreferredLanguage().trim().toUpperCase();
        if (preferred.startsWith("AR")) {
            return "AR";
        }
        if (preferred.contains("EN_AR")) {
            return "EN_AR";
        }
        return "EN";
    }

    private String buildDisclosureText(String language) {
        String english = """
                WADIAH YAD DHAMANAH — ACCOUNT TERMS DISCLOSURE

                1. CUSTODY WITH GUARANTEE: The bank safeguards your principal and guarantees its return on demand.
                2. NO CONTRACTUAL RETURN: This account is not an investment and carries no promised profit or return.
                3. DISCRETIONARY HIBAH: Any Hibah is voluntary, non-contractual, irregular, and may stop at any time.
                4. USE OF FUNDS: The bank may use the funds for Shariah-compliant activities at its own risk.
                5. ZAKAT OBLIGATION: You remain responsible for your Zakat obligations on eligible balances.
                """;
        String arabic = """
                الوديعة يد الضمانة — إفصاح شروط الحساب

                ١. الحفظ مع الضمان: يضمن البنك رد كامل أصل الوديعة عند الطلب.
                ٢. لا عائد تعاقدي: هذا الحساب ليس استثماراً ولا يترتب عليه ربح أو عائد مضمون.
                ٣. الهبة التقديرية: أي هبة تكون تبرعية وغير تعاقدية وغير منتظمة ويمكن إيقافها في أي وقت.
                ٤. استخدام الأموال: يجوز للبنك استخدام الأموال في أنشطة متوافقة مع الشريعة على مسؤوليته.
                ٥. الزكاة: يبقى العميل مسؤولاً عن الوفاء بالتزاماته الزكوية على الأرصدة المستحقة.
                """;
        return switch (language) {
            case "AR" -> arabic;
            case "EN_AR" -> english + "\n\n" + arabic;
            default -> english;
        };
    }

    private String buildComplianceNotes(AccountComplianceCheckResponse compliance) {
        if (!compliance.isKycVerified()) {
            return "KYC verification is pending";
        }
        if (!compliance.isAmlClear()) {
            return "AML screening failed";
        }
        if (compliance.isDuplicateFound()) {
            return "Duplicate active account found for the same product";
        }
        return "Compliance checks passed";
    }

    private String generateApplicationRef() {
        return "WAD-APP-" + LocalDate.now().toString().replace("-", "")
                + "-" + String.format("%06d", APPLICATION_SEQ.incrementAndGet());
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value instanceof BigDecimal bigDecimal) return bigDecimal;
        if (value instanceof Number number) return BigDecimal.valueOf(number.doubleValue());
        if (value != null && StringUtils.hasText(String.valueOf(value))) {
            return new BigDecimal(String.valueOf(value));
        }
        return BigDecimal.ZERO;
    }

    private void notifyCustomer(WadiahOnboardingApplication application) {
        if (application.getCustomerId() == null) {
            return;
        }
        Customer customer = customerRepository.findById(application.getCustomerId()).orElse(null);
        if (customer == null) {
            return;
        }
        String body = "Your Wadiah account application " + application.getApplicationRef()
                + " has been approved. Contract reference: " + application.getContractReference();
        if (StringUtils.hasText(customer.getEmail())) {
            notificationService.sendDirect(NotificationChannel.EMAIL, customer.getEmail(),
                    customer.getDisplayName(), "Wadiah Account Approved", body, customer.getId(), "WADIAH");
        }
        notificationService.sendDirect(NotificationChannel.IN_APP, String.valueOf(customer.getId()),
                customer.getDisplayName(), "Wadiah Account Approved", body, customer.getId(), "WADIAH");
    }

    private WadiahOnboardingResponse toResponse(WadiahOnboardingApplication application, String disclosureText) {
        return WadiahOnboardingResponse.builder()
                .id(application.getId())
                .applicationRef(application.getApplicationRef())
                .customerId(application.getCustomerId())
                .productTemplateId(application.getProductTemplateId())
                .productCode(application.getProductCode())
                .currencyCode(application.getCurrencyCode())
                .branchCode(application.getBranchCode())
                .officerId(application.getOfficerId())
                .channel(application.getChannel() != null ? application.getChannel().name() : null)
                .status(application.getStatus().name())
                .currentStep(application.getCurrentStep())
                .steps(application.getSteps())
                .shariahDisclosurePresented(application.getShariahDisclosurePresented())
                .shariahDisclosureAccepted(application.getShariahDisclosureAccepted())
                .hibahNonGuaranteeAcknowledged(application.getHibahNonGuaranteeAcknowledged())
                .zakatObligationDisclosed(application.getZakatObligationDisclosed())
                .kycVerified(application.getKycVerified())
                .amlScreeningPassed(application.getAmlScreeningPassed())
                .duplicateCheckPassed(application.getDuplicateCheckPassed())
                .complianceNotes(application.getComplianceNotes())
                .requestedFeatures(application.getRequestedFeatures())
                .accountId(application.getAccountId())
                .wadiahAccountId(application.getWadiahAccountId())
                .contractReference(application.getContractReference())
                .rejectionReason(application.getRejectionReason())
                .approvedBy(application.getApprovedBy())
                .approvedAt(application.getApprovedAt())
                .initiatedAt(application.getInitiatedAt())
                .completedAt(application.getCompletedAt())
                .expiresAt(application.getExpiresAt())
                .disclosureText(disclosureText)
                .build();
    }
}
