package com.cbs.portal.islamic.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.hijri.dto.HijriDateResponse;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.ijarah.service.IjarahOriginationService;
import com.cbs.mudarabah.service.MudarabahAccountService;
import com.cbs.murabaha.service.MurabahaOriginationService;
import com.cbs.musharakah.service.MusharakahOriginationService;
import com.cbs.ijarah.dto.IjarahRequests;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.mudarabah.dto.OpenMudarabahSavingsRequest;
import com.cbs.mudarabah.entity.MudarabahType;
import com.cbs.murabaha.dto.CreateMurabahaApplicationRequest;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.musharakah.dto.MusharakahRequests;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.portal.islamic.dto.IslamicPortalDtos.*;
import com.cbs.portal.islamic.entity.IslamicApplicationFlow;
import com.cbs.wadiah.dto.InitiateWadiahApplicationRequest;
import com.cbs.wadiah.entity.WadiahDomainEnums;
import com.cbs.portal.islamic.entity.IslamicDisclosureTemplate;
import com.cbs.portal.islamic.entity.IslamicShariahConsent;
import com.cbs.portal.islamic.repository.IslamicApplicationFlowRepository;
import com.cbs.portal.islamic.repository.IslamicDisclosureTemplateRepository;
import com.cbs.portal.islamic.repository.IslamicShariahConsentRepository;
import com.cbs.productfactory.islamic.dto.IslamicProductCatalogueEntry;
import com.cbs.productfactory.islamic.service.IslamicProductCatalogueService;
import com.cbs.wadiah.service.WadiahOnboardingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/**
 * BFF for Capability 5 — Digital Onboarding.
 * Orchestrates application flows, Shariah disclosures, consent recording,
 * and submission routing to the appropriate origination service.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IslamicOnboardingPortalService {

    private final IslamicApplicationFlowRepository applicationFlowRepository;
    private final IslamicDisclosureTemplateRepository disclosureTemplateRepository;
    private final IslamicShariahConsentRepository shariahConsentRepository;
    private final WadiahOnboardingService wadiahOnboardingService;
    private final MudarabahAccountService mudarabahAccountService;
    private final MurabahaOriginationService murabahaOriginationService;
    private final IjarahOriginationService ijarahOriginationService;
    private final MusharakahOriginationService musharakahOriginationService;
    private final IslamicProductCatalogueService productCatalogueService;
    private final HijriCalendarService hijriCalendarService;

    // ── Initiate Application ─────────────────────────────────────────────

    /**
     * Load application flow steps for the product's contract type, check
     * eligibility, and return the flow definition.
     */
    public IslamicApplicationFlowDTO initiateApplication(Long customerId, String productCode, String language) {
        // Resolve product to get contract type
        IslamicProductCatalogueEntry product = resolveProduct(productCode);
        String contractType = product.getContractTypeCode();

        if (!product.isAvailableForNewContracts()) {
            throw new BusinessException("Product " + productCode + " is not currently available for new applications");
        }

        // Load flow steps — prefer product-specific, fall back to contract-type generic
        List<IslamicApplicationFlow> steps = applicationFlowRepository.findByProductCodeOrderByStepNumber(productCode);
        if (steps.isEmpty()) {
            steps = applicationFlowRepository.findByContractTypeOrderByStepNumber(contractType);
        }
        if (steps.isEmpty()) {
            throw new BusinessException("No application flow configured for product " + productCode
                    + " / contract type " + contractType);
        }

        List<ApplicationStepDTO> stepDtos = steps.stream()
                .map(s -> ApplicationStepDTO.builder()
                        .stepNumber(s.getStepNumber())
                        .stepCode(s.getStepCode())
                        .stepName(s.getStepName())
                        .stepNameAr(s.getStepNameAr())
                        .mandatory(s.isMandatory())
                        .requiresConsent(s.isRequiresConsent())
                        .completed(false)
                        .current(s.getStepNumber() == 1)
                        .build())
                .toList();

        return IslamicApplicationFlowDTO.builder()
                .contractType(contractType)
                .productCode(productCode)
                .productName(product.getName())
                .productNameAr(product.getNameAr())
                .steps(stepDtos)
                .totalSteps(stepDtos.size())
                .currentStep(1)
                .build();
    }

    // ── Shariah Disclosure ───────────────────────────────────────────────

    /**
     * Load disclosure templates from DB for the given contract type.
     */
    public ShariahDisclosurePortalDTO getShariahDisclosure(String contractType, String language) {
        List<IslamicDisclosureTemplate> templates = disclosureTemplateRepository
                .findByContractTypeAndStatusOrderByItemOrder(safeUpper(contractType), "ACTIVE");

        if (templates.isEmpty()) {
            log.warn("No active disclosure templates found for contract type {}", contractType);
        }

        String version = templates.isEmpty() ? "v1" : templates.get(0).getDisclosureVersion();

        List<DisclosureItem> items = templates.stream()
                .map(t -> DisclosureItem.builder()
                        .id(t.getId())
                        .itemOrder(t.getItemOrder())
                        .textEn(t.getTextEn())
                        .textAr(t.getTextAr())
                        .requiresExplicitConsent(t.isRequiresExplicitConsent())
                        .consented(false)
                        .build())
                .toList();

        long mandatoryCount = items.stream().filter(DisclosureItem::isRequiresExplicitConsent).count();

        return ShariahDisclosurePortalDTO.builder()
                .contractType(safeUpper(contractType))
                .disclosureVersion(version)
                .items(items)
                .totalItems(items.size())
                .mandatoryItems((int) mandatoryCount)
                .build();
    }

    // ── Record Shariah Consent ───────────────────────────────────────────

    /**
     * Validates that ALL mandatory items have been consented, then persists
     * the consent record with full audit details.
     */
    @Transactional
    public void recordShariahConsent(Long customerId, String applicationRef, ShariahConsentRequest consent) {
        // Validate all items consented
        if (!consent.isAllItemsConsented()) {
            // Load disclosure to verify mandatory items
            List<IslamicDisclosureTemplate> templates = disclosureTemplateRepository
                    .findByContractTypeAndStatusOrderByItemOrder(
                            safeUpper(consent.getContractType()), "ACTIVE");

            List<Long> mandatoryIds = templates.stream()
                    .filter(IslamicDisclosureTemplate::isRequiresExplicitConsent)
                    .map(IslamicDisclosureTemplate::getId)
                    .toList();

            List<Long> consentedIds = consent.getConsentedItemIds() != null
                    ? consent.getConsentedItemIds() : Collections.emptyList();

            boolean allMandatoryConsented = consentedIds.containsAll(mandatoryIds);
            if (!allMandatoryConsented) {
                throw new BusinessException(
                        "All mandatory Shariah disclosure items must be consented before proceeding. " +
                        "Missing consent for " + (mandatoryIds.size() - consentedIds.size()) + " item(s).");
            }
        }

        // Check for existing consent for this application
        if (shariahConsentRepository.existsByApplicationRef(applicationRef)) {
            log.info("Updating existing Shariah consent for application {}", applicationRef);
        }

        IslamicShariahConsent entity = IslamicShariahConsent.builder()
                .customerId(customerId)
                .applicationRef(applicationRef)
                .productCode(consent.getProductCode())
                .contractType(safeUpper(consent.getContractType()))
                .disclosureVersion(consent.getDisclosureVersion() != null ? consent.getDisclosureVersion() : "v1")
                .allItemsConsented(consent.isAllItemsConsented())
                .consentTimestamp(Instant.now())
                .consentMethod(consent.getConsentMethod())
                .ipAddress(consent.getIpAddress())
                .deviceInfo(consent.getDeviceInfo())
                .userAgent(consent.getUserAgent())
                .build();

        shariahConsentRepository.save(entity);
        log.info("Shariah consent recorded for customer {} / application {} / contract type {}",
                customerId, applicationRef, consent.getContractType());
    }

    // ── Submit Application ───────────────────────────────────────────────

    /**
     * Routes the application to the appropriate origination service based
     * on the contract type.
     */
    @Transactional
    public ApplicationSubmissionResult submitApplication(Long customerId, String applicationRef,
                                                          String contractType,
                                                          Map<String, Object> applicationData) {
        // Verify consent exists
        if (!shariahConsentRepository.existsByApplicationRef(applicationRef)) {
            throw new BusinessException("Shariah consent must be recorded before submitting application " + applicationRef);
        }

        String type = safeUpper(contractType);
        log.info("Submitting Islamic application {} for customer {} — contract type {}",
                applicationRef, customerId, type);

        try {
            // Route to the appropriate origination service
            String productCode = Objects.toString(applicationData.get("productCode"), "");
            String currencyCode = Objects.toString(applicationData.getOrDefault("currencyCode", "SAR"), "SAR");

            switch (type) {
                case "WADIAH": {
                    log.info("Routing to Wadiah onboarding service for application {}", applicationRef);
                    InitiateWadiahApplicationRequest wadiahReq = InitiateWadiahApplicationRequest.builder()
                            .customerId(customerId)
                            .productCode(productCode)
                            .currencyCode(currencyCode)
                            .channel(WadiahDomainEnums.OnboardingChannel.ONLINE)
                            .build();
                    wadiahOnboardingService.initiateApplication(wadiahReq);
                    break;
                }
                case "MUDARABAH": {
                    log.info("Routing to Mudarabah account service for application {}", applicationRef);
                    BigDecimal initialDeposit = applicationData.get("initialDeposit") != null
                            ? new BigDecimal(applicationData.get("initialDeposit").toString())
                            : BigDecimal.ONE;
                    OpenMudarabahSavingsRequest mudarabahReq = OpenMudarabahSavingsRequest.builder()
                            .customerId(customerId)
                            .productCode(productCode)
                            .currencyCode(currencyCode)
                            .initialDeposit(initialDeposit)
                            .mudarabahType(MudarabahType.UNRESTRICTED)
                            .lossDisclosureAccepted(true)
                            .build();
                    mudarabahAccountService.openMudarabahSavingsAccount(mudarabahReq);
                    break;
                }
                case "MURABAHA": {
                    log.info("Routing to Murabaha origination service for application {}", applicationRef);
                    BigDecimal requestedAmount = applicationData.get("requestedAmount") != null
                            ? new BigDecimal(applicationData.get("requestedAmount").toString())
                            : BigDecimal.valueOf(10000);
                    Integer tenorMonths = applicationData.get("tenorMonths") != null
                            ? Integer.valueOf(applicationData.get("tenorMonths").toString())
                            : 12;
                    BigDecimal monthlyIncome = applicationData.get("monthlyIncome") != null
                            ? new BigDecimal(applicationData.get("monthlyIncome").toString())
                            : BigDecimal.ZERO;
                    CreateMurabahaApplicationRequest murabahaReq = CreateMurabahaApplicationRequest.builder()
                            .customerId(customerId)
                            .productCode(productCode)
                            .murabahahType(MurabahaDomainEnums.MurabahahType.COMMODITY_MURABAHA)
                            .requestedAmount(requestedAmount)
                            .currencyCode(currencyCode)
                            .requestedTenorMonths(tenorMonths)
                            .purpose(MurabahaDomainEnums.Purpose.PERSONAL)
                            .monthlyIncome(monthlyIncome)
                            .channel(MurabahaDomainEnums.ApplicationChannel.ONLINE)
                            .build();
                    murabahaOriginationService.createApplication(murabahaReq);
                    break;
                }
                case "IJARAH": {
                    log.info("Routing to Ijarah origination service for application {}", applicationRef);
                    BigDecimal estimatedAssetCost = applicationData.get("estimatedAssetCost") != null
                            ? new BigDecimal(applicationData.get("estimatedAssetCost").toString())
                            : BigDecimal.valueOf(50000);
                    Integer tenorMonths = applicationData.get("tenorMonths") != null
                            ? Integer.valueOf(applicationData.get("tenorMonths").toString())
                            : 24;
                    String assetDesc = Objects.toString(applicationData.getOrDefault("assetDescription", "Asset"), "Asset");
                    IjarahRequests.CreateIjarahApplicationRequest ijarahReq = IjarahRequests.CreateIjarahApplicationRequest.builder()
                            .customerId(customerId)
                            .productCode(productCode)
                            .ijarahType(IjarahDomainEnums.IjarahType.IJARAH_MUNTAHIA_BITTAMLEEK)
                            .requestedAssetDescription(assetDesc)
                            .requestedAssetCategory(IjarahDomainEnums.AssetCategory.VEHICLE)
                            .estimatedAssetCost(estimatedAssetCost)
                            .requestedTenorMonths(tenorMonths)
                            .currencyCode(currencyCode)
                            .build();
                    ijarahOriginationService.createApplication(ijarahReq);
                    break;
                }
                case "MUSHARAKAH": {
                    log.info("Routing to Musharakah origination service for application {}", applicationRef);
                    BigDecimal requestedFinancing = applicationData.get("requestedFinancingAmount") != null
                            ? new BigDecimal(applicationData.get("requestedFinancingAmount").toString())
                            : BigDecimal.valueOf(100000);
                    BigDecimal customerEquity = applicationData.get("customerEquityAmount") != null
                            ? new BigDecimal(applicationData.get("customerEquityAmount").toString())
                            : BigDecimal.valueOf(50000);
                    BigDecimal totalPropertyValue = applicationData.get("totalPropertyValue") != null
                            ? new BigDecimal(applicationData.get("totalPropertyValue").toString())
                            : requestedFinancing.add(customerEquity);
                    Integer tenorMonths = applicationData.get("tenorMonths") != null
                            ? Integer.valueOf(applicationData.get("tenorMonths").toString())
                            : 120;
                    String assetDesc = Objects.toString(applicationData.getOrDefault("assetDescription", "Property"), "Property");
                    MusharakahRequests.CreateApplicationRequest mushReq = MusharakahRequests.CreateApplicationRequest.builder()
                            .customerId(customerId)
                            .productCode(productCode)
                            .musharakahType(MusharakahDomainEnums.MusharakahType.DIMINISHING_MUSHARAKAH)
                            .requestedFinancingAmount(requestedFinancing)
                            .customerEquityAmount(customerEquity)
                            .totalPropertyValue(totalPropertyValue)
                            .currencyCode(currencyCode)
                            .requestedTenorMonths(tenorMonths)
                            .assetDescription(assetDesc)
                            .assetCategory(MusharakahDomainEnums.AssetCategory.RESIDENTIAL_PROPERTY)
                            .build();
                    musharakahOriginationService.createApplication(mushReq);
                    break;
                }
                default:
                    throw new BusinessException("Unsupported contract type for application submission: " + contractType);
            }

            String submittedAt = Instant.now().toString();
            String hijriDate = safeHijriString(LocalDate.now());

            return ApplicationSubmissionResult.builder()
                    .applicationRef(applicationRef)
                    .status("SUBMITTED")
                    .message("Your application has been submitted successfully and is under review.")
                    .messageAr("\u062a\u0645 \u062a\u0642\u062f\u064a\u0645 \u0637\u0644\u0628\u0643 \u0628\u0646\u062c\u0627\u062d \u0648\u0647\u0648 \u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629.")
                    .submittedAt(submittedAt)
                    .submittedAtHijri(hijriDate)
                    .estimatedProcessingDays("3-5")
                    .trackingUrl("/applications/" + applicationRef + "/status")
                    .build();
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to submit application {} for customer {}: {}", applicationRef, customerId, ex.getMessage(), ex);
            return ApplicationSubmissionResult.builder()
                    .applicationRef(applicationRef)
                    .status("FAILED")
                    .message("Application submission failed. Please try again or contact support.")
                    .messageAr("\u0641\u0634\u0644 \u062a\u0642\u062f\u064a\u0645 \u0627\u0644\u0637\u0644\u0628. \u064a\u0631\u062c\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.")
                    .build();
        }
    }

    // ── Customer Applications ────────────────────────────────────────────

    /**
     * List the customer's existing applications with status.
     */
    public ApplicationStatusDTO getApplicationStatus(Long customerId, String applicationRef) {
        IslamicShariahConsent consent = shariahConsentRepository
                .findByApplicationRefAndDisclosureVersion(applicationRef, "v1")
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException(
                        "Application not found: " + applicationRef));
        return ApplicationStatusDTO.builder()
                .applicationRef(consent.getApplicationRef())
                .productCode(consent.getProductCode())
                .contractType(consent.getContractType())
                .status(consent.isAllItemsConsented() ? "SUBMITTED" : "PENDING_CONSENT")
                .statusAr(consent.isAllItemsConsented() ? "\u0645\u0642\u062f\u0645" : "\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629")
                .submittedDate(consent.getConsentTimestamp() != null ? consent.getConsentTimestamp().toString() : null)
                .build();
    }

    public List<ApplicationStatusDTO> getCustomerApplications(Long customerId) {
        List<IslamicShariahConsent> consents = shariahConsentRepository
                .findByCustomerIdOrderByConsentTimestampDesc(customerId);

        return consents.stream()
                .map(c -> ApplicationStatusDTO.builder()
                        .applicationRef(c.getApplicationRef())
                        .productCode(c.getProductCode())
                        .contractType(c.getContractType())
                        .status("SUBMITTED")
                        .statusAr("\u0645\u0642\u062f\u0645")
                        .submittedDate(c.getConsentTimestamp() != null ? c.getConsentTimestamp().toString() : null)
                        .submittedDateHijri(safeHijriString(
                                c.getConsentTimestamp() != null
                                        ? LocalDate.ofInstant(c.getConsentTimestamp(), java.time.ZoneId.systemDefault())
                                        : null))
                        .build())
                .toList();
    }

    // ── Internal helpers ─────────────────────────────────────────────────

    private IslamicProductCatalogueEntry resolveProduct(String productCode) {
        return productCatalogueService.getCatalogue(
                        null, null, null, null, null, null,
                        null, null, productCode, false, PageRequest.of(0, 100))
                .getContent().stream()
                .filter(e -> productCode.equals(e.getProductCode()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "IslamicProduct", "productCode", productCode));
    }

    private String safeHijriString(LocalDate date) {
        if (date == null) return null;
        try {
            HijriDateResponse hijri = hijriCalendarService.toHijri(date);
            return hijri.getHijriDay() + " " + hijri.getHijriMonthName() + " " + hijri.getHijriYear();
        } catch (Exception ex) {
            log.debug("Hijri conversion failed for {}: {}", date, ex.getMessage());
            return null;
        }
    }

    private static String safeUpper(String value) {
        return value != null ? value.toUpperCase().trim() : "";
    }
}
