package com.cbs.productfactory.islamic.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.productcatalog.entity.ProductCatalogEntry;
import com.cbs.productcatalog.repository.ProductCatalogEntryRepository;
import com.cbs.productfactory.entity.ProductTemplate;
import com.cbs.productfactory.islamic.dto.*;
import com.cbs.productfactory.islamic.entity.IslamicContractType;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductParameter;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.entity.IslamicProductVersion;
import com.cbs.productfactory.islamic.event.FatwaExpiredEvent;
import com.cbs.productfactory.islamic.event.FatwaRenewedEvent;
import com.cbs.productfactory.islamic.event.FatwaRevokedEvent;
import com.cbs.productfactory.islamic.repository.IslamicProductParameterRepository;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.productfactory.islamic.repository.IslamicProductVersionRepository;
import com.cbs.productfactory.repository.ProductTemplateRepository;
import com.cbs.rulesengine.dto.DecisionResultResponse;
import com.cbs.rulesengine.entity.BusinessRule;
import com.cbs.rulesengine.entity.BusinessRuleStatus;
import com.cbs.rulesengine.repository.BusinessRuleRepository;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import com.cbs.segmentation.entity.CustomerSegment;
import com.cbs.segmentation.repository.CustomerSegmentRepository;
import com.cbs.shariah.dto.CreateReviewRequest;
import com.cbs.shariah.dto.ReviewRequestResponse;
import com.cbs.shariah.entity.FatwaRecord;
import com.cbs.shariah.entity.FatwaStatus;
import com.cbs.shariah.entity.ReviewRequestStatus;
import com.cbs.shariah.entity.ReviewRequestType;
import com.cbs.shariah.repository.FatwaRecordRepository;
import com.cbs.shariah.repository.SsbBoardMemberRepository;
import com.cbs.shariah.service.ShariahGovernanceService;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IslamicProductService {

    private static final Set<String> MATERIAL_FIELDS = Set.of(
            "contractTypeId",
            "profitCalculationMethod",
            "profitRateType",
            "profitSharingRatioBank",
            "profitSharingRatioCustomer",
            "lossSharingMethod",
            "bankSharePercentage",
            "customerSharePercentage",
            "diminishingSchedule",
            "assetOwnershipDuringTenor",
            "assetTransferOnCompletion",
            "takafulModel",
            "takafulPoolSeparation",
            "aaoifiStandard"
    );
    private static final Set<String> IGNORED_DIFF_FIELDS = Set.of(
            "productVersion",
            "currentVersionId",
            "approvedBy",
            "approvedAt"
    );
    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final IslamicProductTemplateRepository productRepository;
    private final IslamicProductParameterRepository parameterRepository;
    private final IslamicProductVersionRepository versionRepository;
    private final IslamicContractTypeService contractTypeService;
    private final ProductTemplateRepository productTemplateRepository;
    private final ProductCatalogEntryRepository productCatalogEntryRepository;
    private final FatwaRecordRepository fatwaRecordRepository;
    private final SsbBoardMemberRepository ssbBoardMemberRepository;
    private final ShariahGovernanceService shariahGovernanceService;
    private final BusinessRuleRepository businessRuleRepository;
    private final DecisionTableEvaluator decisionTableEvaluator;
    private final CustomerRepository customerRepository;
    private final CustomerSegmentRepository customerSegmentRepository;
    private final CurrentActorProvider currentActorProvider;
    private final CurrentTenantResolver currentTenantResolver;
    private final ObjectMapper objectMapper;
    private final EntityManager entityManager;

    @Transactional
    public IslamicProductResponse createProduct(IslamicProductRequest request) {
        validateCommonRequest(request, true);
        validateProductCode(request.getProductCode());
        if (productRepository.existsByProductCodeIgnoreCase(request.getProductCode())) {
            throw new BusinessException("Islamic product already exists: " + request.getProductCode(),
                    "DUPLICATE_ISLAMIC_PRODUCT");
        }

        IslamicContractType contractType = contractTypeService.getById(request.getContractTypeId());
        contractTypeService.validateProductAgainstContractType(request, contractType);
        validateReferenceCodes(request, contractType);

        Long tenantId = currentTenantResolver.getCurrentTenantId();
        ProductTemplate baseTemplate = resolveOrCreateBaseTemplate(request, tenantId);

        IslamicProductTemplate product = IslamicProductTemplate.builder()
                .baseProductId(baseTemplate.getId())
                .tenantId(tenantId)
                .build();
        applyRequestToProduct(product, request, contractType, true);
        if (request.getFatwaId() != null) {
            validateFatwaForLinkage(product, request.getFatwaId());
            product.setActiveFatwaId(request.getFatwaId());
            product.setShariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.FATWA_ISSUED);
        }
        product.setStatus(IslamicDomainEnums.IslamicProductStatus.DRAFT);
        if (product.getShariahComplianceStatus() == null) {
            product.setShariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.DRAFT);
        }

        IslamicProductTemplate saved = productRepository.save(product);
        IslamicProductVersion version = createVersionSnapshot(saved,
                defaultText(request.getChangeDescription(), "Product created"),
                IslamicDomainEnums.VersionChangeType.CREATED,
                false,
                List.of(),
                null,
                IslamicDomainEnums.VersionReviewStatus.NOT_REQUIRED);
        saved.setCurrentVersionId(version.getId());
        saved.setProductVersion(version.getVersionNumber());
        saved = productRepository.save(saved);
        syncBaseTemplate(saved);
        syncCatalogEntry(saved);
        return toResponse(saved);
    }

    @Transactional
    public IslamicProductResponse updateProduct(Long productId, IslamicProductRequest request) {
        IslamicProductTemplate product = getProductEntity(productId);
        if (!StringUtils.hasText(request.getChangeDescription())) {
            throw new BusinessException("changeDescription is required for product updates",
                    "MISSING_CHANGE_DESCRIPTION");
        }

        Map<String, Object> beforeSnapshot = snapshotProduct(product);
        IslamicContractType contractType = request.getContractTypeId() != null
                ? contractTypeService.getById(request.getContractTypeId())
                : product.getContractType();
        applyRequestToProduct(product, request, contractType, false);
        product.setTenantId(defaultLong(product.getTenantId(), currentTenantResolver.getCurrentTenantId()));
        contractTypeService.validateProductAgainstContractType(product);
        validateReferenceCodes(request, product.getContractType());

        Map<String, Object> afterSnapshot = snapshotProduct(product);
        List<String> changedFields = determineChangedFields(beforeSnapshot, afterSnapshot);
        boolean materialChange = changedFields.stream()
                .anyMatch(field -> isMaterialField(field, beforeSnapshot.get(field), afterSnapshot.get(field)));

        Long reviewRequestId = null;
        IslamicDomainEnums.VersionReviewStatus reviewStatus = IslamicDomainEnums.VersionReviewStatus.NOT_REQUIRED;
        IslamicDomainEnums.VersionChangeType changeType = IslamicDomainEnums.VersionChangeType.NON_MATERIAL_CHANGE;
        if (materialChange) {
            reviewRequestId = createSsbReviewRequest(product, changedFields);
            reviewStatus = IslamicDomainEnums.VersionReviewStatus.PENDING;
            changeType = IslamicDomainEnums.VersionChangeType.MATERIAL_CHANGE;
            product.setActiveFatwaId(null);
            product.setShariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.PENDING_FATWA);
            if (product.getStatus() == IslamicDomainEnums.IslamicProductStatus.ACTIVE) {
                product.setStatus(IslamicDomainEnums.IslamicProductStatus.SUSPENDED);
            }
        }

        IslamicProductTemplate saved = productRepository.save(product);
        IslamicProductVersion version = createVersionSnapshot(saved,
                request.getChangeDescription().trim(),
                changeType,
                materialChange,
                changedFields,
                reviewRequestId,
                reviewStatus);
        saved.setCurrentVersionId(version.getId());
        saved.setProductVersion(version.getVersionNumber());
        saved = productRepository.save(saved);
        syncBaseTemplate(saved);
        syncCatalogEntry(saved);
        return toResponse(saved);
    }

    public IslamicProductResponse getProduct(Long productId) {
        return toResponse(getProductEntity(productId));
    }

    public IslamicProductResponse getProductByCode(String productCode) {
        return toResponse(productRepository.findByProductCodeIgnoreCase(productCode)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductTemplate", "productCode", productCode)));
    }

    public Page<IslamicProductResponse> searchProducts(IslamicProductSearchCriteria criteria, Pageable pageable) {
        List<IslamicProductTemplate> filtered = productRepository.findAll(buildSearchSpecification(criteria), resolveSort(pageable)).stream()
                .filter(product -> !StringUtils.hasText(criteria.getCountry())
                        || product.getEligibleCountries().isEmpty()
                        || product.getEligibleCountries().stream().anyMatch(code -> code.equalsIgnoreCase(criteria.getCountry())))
                .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        List<IslamicProductResponse> pageContent = start >= filtered.size()
                ? List.of()
                : filtered.subList(start, end).stream().map(this::toResponse).toList();
        return new PageImpl<>(pageContent, pageable, filtered.size());
    }

    @Transactional
    public void submitForApproval(Long productId) {
        IslamicProductTemplate product = getProductEntity(productId);
        if (product.getStatus() != IslamicDomainEnums.IslamicProductStatus.DRAFT
                && product.getStatus() != IslamicDomainEnums.IslamicProductStatus.SUSPENDED) {
            throw new BusinessException("Product must be in DRAFT or SUSPENDED before submission",
                    "INVALID_PRODUCT_STATUS");
        }
        validateReadyForApproval(product);
        product.setStatus(IslamicDomainEnums.IslamicProductStatus.PENDING_APPROVAL);
        IslamicProductTemplate saved = productRepository.save(product);
        recordStatusVersion(saved, "Submitted for approval");
        syncBaseTemplate(saved);
        syncCatalogEntry(saved);
    }

    @Transactional
    public void approveProduct(Long productId, String approvedBy) {
        IslamicProductTemplate product = getProductEntity(productId);
        if (product.getStatus() != IslamicDomainEnums.IslamicProductStatus.PENDING_APPROVAL) {
            throw new BusinessException("Product must be PENDING_APPROVAL before approval",
                    "INVALID_PRODUCT_STATUS");
        }
        if (StringUtils.hasText(product.getCreatedBy()) && product.getCreatedBy().equalsIgnoreCase(approvedBy)) {
            throw new BusinessException("Four-eyes principle violated: creator cannot approve the product",
                    HttpStatus.FORBIDDEN, "FOUR_EYES_VIOLATION");
        }
        if (product.getShariahComplianceStatus() != IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT
                && product.getShariahComplianceStatus() != IslamicDomainEnums.ShariahComplianceStatus.FATWA_ISSUED) {
            throw new BusinessException("Product cannot be approved until compliance status is FATWA_ISSUED or COMPLIANT",
                    "INVALID_COMPLIANCE_STATUS");
        }
        product.setStatus(IslamicDomainEnums.IslamicProductStatus.APPROVED);
        product.setApprovedBy(approvedBy);
        product.setApprovedAt(Instant.now());
        IslamicProductTemplate saved = productRepository.save(product);
        recordStatusVersion(saved, "Approved by " + approvedBy);
        syncBaseTemplate(saved);
        syncCatalogEntry(saved);
    }

    @Transactional
    public void activateProduct(Long productId) {
        IslamicProductTemplate product = getProductEntity(productId);
        if (product.getStatus() != IslamicDomainEnums.IslamicProductStatus.APPROVED
                && product.getStatus() != IslamicDomainEnums.IslamicProductStatus.SUSPENDED) {
            throw new BusinessException("Product must be APPROVED or SUSPENDED before activation",
                    "INVALID_PRODUCT_STATUS");
        }
        validateFatwaForActivation(productId);
        product.setStatus(IslamicDomainEnums.IslamicProductStatus.ACTIVE);
        if (product.getShariahComplianceStatus() == IslamicDomainEnums.ShariahComplianceStatus.FATWA_ISSUED) {
            product.setShariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT);
        }
        IslamicProductTemplate saved = productRepository.save(product);
        recordStatusVersion(saved, "Activated for new contracts");
        syncBaseTemplate(saved);
        syncCatalogEntry(saved);
    }

    @Transactional
    public void suspendProduct(Long productId, String reason) {
        IslamicProductTemplate product = getProductEntity(productId);
        product.setStatus(IslamicDomainEnums.IslamicProductStatus.SUSPENDED);
        if (product.getShariahComplianceStatus() == IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT
                && !hasActiveFatwa(product)) {
            product.setShariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.NON_COMPLIANT);
        }
        IslamicProductTemplate saved = productRepository.save(product);
        recordStatusVersion(saved, defaultText(reason, "Suspended"));
        syncBaseTemplate(saved);
        syncCatalogEntry(saved);
    }

    @Transactional
    public void retireProduct(Long productId, String reason) {
        IslamicProductTemplate product = getProductEntity(productId);
        product.setStatus(IslamicDomainEnums.IslamicProductStatus.RETIRED);
        product.setShariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.RETIRED);
        IslamicProductTemplate saved = productRepository.save(product);
        recordStatusVersion(saved, defaultText(reason, "Retired"));
        syncBaseTemplate(saved);
        syncCatalogEntry(saved);
    }

    @Transactional
    public void linkFatwaToProduct(Long productId, Long fatwaId) {
        IslamicProductTemplate product = getProductEntity(productId);
        validateFatwaForLinkage(product, fatwaId);
        product.setActiveFatwaId(fatwaId);
        if (product.getShariahComplianceStatus() == IslamicDomainEnums.ShariahComplianceStatus.PENDING_FATWA
                || product.getShariahComplianceStatus() == IslamicDomainEnums.ShariahComplianceStatus.DRAFT
                || product.getShariahComplianceStatus() == IslamicDomainEnums.ShariahComplianceStatus.NON_COMPLIANT) {
            product.setShariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.FATWA_ISSUED);
        }
        IslamicProductTemplate saved = productRepository.save(product);
        createVersionSnapshot(saved,
                "Fatwa linked: " + fatwaId,
                IslamicDomainEnums.VersionChangeType.FATWA_LINKED,
                false,
                List.of("fatwaId"),
                null,
                IslamicDomainEnums.VersionReviewStatus.NOT_REQUIRED);
        syncCatalogEntry(saved);
    }

    @Transactional
    public void unlinkFatwaFromProduct(Long productId, String reason) {
        IslamicProductTemplate product = getProductEntity(productId);
        product.setActiveFatwaId(null);
        product.setShariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.PENDING_FATWA);
        if (product.getStatus() == IslamicDomainEnums.IslamicProductStatus.ACTIVE) {
            product.setStatus(IslamicDomainEnums.IslamicProductStatus.SUSPENDED);
        }
        IslamicProductTemplate saved = productRepository.save(product);
        createVersionSnapshot(saved,
                defaultText(reason, "Fatwa unlinked"),
                IslamicDomainEnums.VersionChangeType.FATWA_UNLINKED,
                false,
                List.of("fatwaId"),
                null,
                IslamicDomainEnums.VersionReviewStatus.NOT_REQUIRED);
        syncBaseTemplate(saved);
        syncCatalogEntry(saved);
    }

    public void onFatwaStatusChange(Long fatwaId, FatwaStatus newStatus) {
        switch (newStatus) {
            case REVOKED -> onFatwaRevoked(new FatwaRevokedEvent(fatwaId, null));
            case SUPERSEDED -> unlinkAffectedFatwas(fatwaId, "Linked fatwa superseded");
            default -> {
            }
        }
    }

    public Object getParameter(Long productId, String paramName) {
        IslamicProductParameter parameter = parameterRepository
                .findByProductTemplateIdAndParameterNameIgnoreCase(productId, paramName)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductParameter", "parameterName", paramName));
        return convertParameterValue(parameter.getParameterType(), parameter.getParameterValue());
    }

    public Map<String, Object> getAllParameters(Long productId) {
        LinkedHashMap<String, Object> values = new LinkedHashMap<>();
        parameterRepository.findByProductTemplateIdOrderByParameterNameAsc(productId)
                .forEach(parameter -> values.put(parameter.getParameterName(),
                        convertParameterValue(parameter.getParameterType(), parameter.getParameterValue())));
        return values;
    }

    @Transactional
    public void setParameter(Long productId, SetIslamicProductParameterRequest request) {
        IslamicProductTemplate product = getProductEntity(productId);
        if (!StringUtils.hasText(request.getParameterName())) {
            throw new BusinessException("parameterName is required", "MISSING_PARAMETER_NAME");
        }
        IslamicProductParameter parameter = parameterRepository
                .findByProductTemplateIdAndParameterNameIgnoreCase(productId, request.getParameterName())
                .orElse(IslamicProductParameter.builder().productTemplate(product).build());
        parameter.setParameterName(request.getParameterName().trim());
        parameter.setParameterValue(request.getParameterValue());
        parameter.setParameterType(defaultEnum(request.getParameterType(), IslamicDomainEnums.ParameterType.STRING));
        parameter.setDescription(trimToNull(request.getDescription()));
        parameter.setDescriptionAr(trimToNull(request.getDescriptionAr()));
        parameter.setIsEditable(defaultBoolean(request.getEditable(), true));
        parameter.setValidationRule(trimToNull(request.getValidationRule()));
        parameterRepository.save(parameter);
        createVersionSnapshot(product,
                "Parameter updated: " + parameter.getParameterName(),
                IslamicDomainEnums.VersionChangeType.PARAMETER_CHANGE,
                false,
                List.of("parameter:" + parameter.getParameterName()),
                null,
                IslamicDomainEnums.VersionReviewStatus.NOT_REQUIRED);
    }

    public List<IslamicProductResponse> getProductsDueForShariahReview() {
        LocalDate today = LocalDate.now();
        return productRepository.findByNextShariahReviewDateBefore(today.plusDays(1)).stream()
                .filter(product -> product.getStatus() != IslamicDomainEnums.IslamicProductStatus.RETIRED)
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void recordShariahReview(Long productId, RecordShariahReviewRequest request) {
        IslamicProductTemplate product = getProductEntity(productId);
        product.setLastShariahReviewDate(defaultLocalDate(request.getReviewDate(), LocalDate.now()));
        product.setNextShariahReviewDate(request.getNextReviewDate());
        if (product.getActiveFatwaId() != null && hasActiveFatwa(product)) {
            product.setShariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT);
        }
        IslamicProductTemplate saved = productRepository.save(product);
        createVersionSnapshot(saved,
                defaultText(request.getNotes(), "Shariah review recorded"),
                IslamicDomainEnums.VersionChangeType.STATUS_CHANGE,
                false,
                List.of("lastShariahReviewDate", "nextShariahReviewDate"),
                null,
                IslamicDomainEnums.VersionReviewStatus.NOT_REQUIRED);
        syncCatalogEntry(saved);
    }

    public boolean isCustomerEligible(Long productId, Long customerId) {
        IslamicProductTemplate product = getProductEntity(productId);
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
        if (!product.getEligibleCustomerTypes().isEmpty()
                && product.getEligibleCustomerTypes().stream().noneMatch(type ->
                type.equalsIgnoreCase(customer.getCustomerType().name()) || "ANY".equalsIgnoreCase(type))) {
            return false;
        }
        if (!product.getEligibleCountries().isEmpty()) {
            String country = defaultText(customer.getCountryOfResidence(), defaultText(customer.getNationality(), ""));
            if (product.getEligibleCountries().stream().noneMatch(code -> code.equalsIgnoreCase(country))) {
                return false;
            }
        }
        if (!product.getEligibleSegments().isEmpty()) {
            Set<String> activeSegments = customerSegmentRepository.findActiveSegmentsForCustomer(customerId).stream()
                    .map(CustomerSegment::getSegment)
                    .filter(Objects::nonNull)
                    .map(segment -> segment.getCode())
                    .filter(StringUtils::hasText)
                    .map(code -> code.toUpperCase(Locale.ROOT))
                    .collect(java.util.stream.Collectors.toSet());
            boolean segmentMatch = product.getEligibleSegments().stream()
                    .map(code -> code.toUpperCase(Locale.ROOT))
                    .anyMatch(activeSegments::contains);
            if (!segmentMatch) {
                return false;
            }
        }
        return isProductAvailableForNewContracts(product);
    }

    public List<IslamicProductResponse> getEligibleProducts(Long customerId) {
        return productRepository.findByStatusAndEffectiveFromLessThanEqual(
                        IslamicDomainEnums.IslamicProductStatus.ACTIVE,
                        LocalDate.now())
                .stream()
                .filter(product -> isCustomerEligible(product.getId(), customerId))
                .map(this::toResponse)
                .toList();
    }

    public BigDecimal getApplicableProfitRate(Long productId, Map<String, Object> context) {
        IslamicProductTemplate product = getProductEntity(productId);
        if (StringUtils.hasText(product.getProfitRateDecisionTableCode())) {
            DecisionResultResponse result = decisionTableEvaluator.evaluateByRuleCode(
                    product.getProfitRateDecisionTableCode(), context);
            if (!Boolean.TRUE.equals(result.getMatched())) {
                throw new BusinessException("No matching decision table row for product " + product.getProductCode(),
                        "NO_DECISION_TABLE_MATCH");
            }
            Object output = result.getOutputs().get("profitRate");
            if (output == null) {
                output = result.getOutputs().values().stream()
                        .filter(value -> decimal(value) != null)
                        .findFirst()
                        .orElse(null);
            }
            BigDecimal rate = decimal(output);
            if (rate == null) {
                throw new BusinessException("Decision table did not return a numeric profit rate",
                        "INVALID_DECISION_TABLE_OUTPUT");
            }
            return rate;
        }
        if (product.getFixedProfitRate() != null) {
            return product.getFixedProfitRate();
        }
        if (product.getBaseRate() != null || product.getMargin() != null) {
            return defaultDecimal(product.getBaseRate()).add(defaultDecimal(product.getMargin()));
        }
        throw new BusinessException("No profit rate configuration found for product " + product.getProductCode(),
                "MISSING_PROFIT_RATE");
    }

    public List<IslamicProductVersion> getProductHistory(Long productId) {
        getProductEntity(productId);
        return versionRepository.findByProductTemplateIdOrderByVersionNumberDesc(productId);
    }

    public IslamicProductVersion getProductVersion(Long productId, Integer versionNumber) {
        getProductEntity(productId);
        return versionRepository.findByProductTemplateIdAndVersionNumber(productId, versionNumber)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductVersion", "versionNumber", versionNumber));
    }

    public IslamicProductResponse getProductAsOfDate(String productCode, LocalDate asOfDate) {
        IslamicProductTemplate product = productRepository.findByProductCodeIgnoreCase(productCode)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductTemplate", "productCode", productCode));
        Instant cutoff = asOfDate.atTime(LocalTime.MAX).toInstant(ZoneOffset.UTC);
        IslamicProductVersion version = versionRepository
                .findByProductTemplateIdAndChangedAtLessThanEqualOrderByChangedAtDesc(product.getId(), cutoff)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductVersion", "asOfDate", asOfDate));
        IslamicProductTemplate snapshotProduct = cloneFromSnapshot(product, version.getProductSnapshot());
        return toResponse(snapshotProduct);
    }

    public ProductChangeComparison compareVersions(Long productId, Integer version1, Integer version2) {
        Map<String, Object> first = getProductVersion(productId, version1).getProductSnapshot();
        Map<String, Object> second = getProductVersion(productId, version2).getProductSnapshot();
        Map<String, Object> flatFirst = flattenJson(objectMapper.valueToTree(first));
        Map<String, Object> flatSecond = flattenJson(objectMapper.valueToTree(second));
        Set<String> keys = new TreeSet<>();
        keys.addAll(flatFirst.keySet());
        keys.addAll(flatSecond.keySet());

        List<ProductChangeComparison.Difference> differences = new ArrayList<>();
        for (String key : keys) {
            Object left = flatFirst.get(key);
            Object right = flatSecond.get(key);
            if (!Objects.equals(left, right)) {
                differences.add(ProductChangeComparison.Difference.builder()
                        .field(key)
                        .oldValue(left)
                        .newValue(right)
                        .build());
            }
        }
        return ProductChangeComparison.builder()
                .version1(version1)
                .version2(version2)
                .differences(differences)
                .build();
    }

    public List<IslamicProductVersion> getMaterialChanges(Long productId) {
        getProductEntity(productId);
        return versionRepository.findByProductTemplateIdAndIsMaterialChangeTrueOrderByVersionNumberDesc(productId);
    }

    @Transactional
    public void onSsbReviewCompleted(Long ssbReviewRequestId, ReviewRequestStatus outcome) {
        IslamicProductVersion version = versionRepository.findBySsbReviewRequestId(ssbReviewRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductVersion", "ssbReviewRequestId", ssbReviewRequestId));
        IslamicProductTemplate product = getProductEntity(version.getProductTemplate().getId());

        if (outcome == ReviewRequestStatus.APPROVED) {
            version.setSsbReviewStatus(IslamicDomainEnums.VersionReviewStatus.APPROVED);
            product.setShariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT);
            productRepository.save(product);
            versionRepository.save(version);
            syncCatalogEntry(product);
            return;
        }

        if (outcome == ReviewRequestStatus.REJECTED) {
            version.setSsbReviewStatus(IslamicDomainEnums.VersionReviewStatus.REJECTED);
            versionRepository.save(version);
            if (version.getPreviousVersionId() != null) {
                IslamicProductVersion previous = versionRepository.findById(version.getPreviousVersionId())
                        .orElseThrow(() -> new ResourceNotFoundException("IslamicProductVersion", "id",
                                version.getPreviousVersionId()));
                restoreProductFromSnapshot(product, previous.getProductSnapshot());
                product.setShariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT);
                product.setCurrentVersionId(previous.getId());
                product.setProductVersion(previous.getVersionNumber());
                IslamicProductTemplate saved = productRepository.save(product);
                syncBaseTemplate(saved);
                syncCatalogEntry(saved);
            }
        }
    }

    public List<IslamicProductResponse> getProductsWithoutFatwa() {
        return productRepository.findAll().stream()
                .filter(product -> !hasActiveFatwa(product))
                .map(this::toResponse)
                .toList();
    }

    public List<IslamicProductResponse> getProductsWithExpiringFatwa(int daysThreshold) {
        LocalDate today = LocalDate.now();
        LocalDate cutoff = today.plusDays(daysThreshold);
        return productRepository.findAll().stream()
                .filter(product -> product.getActiveFatwaId() != null)
                .filter(product -> fatwaRecordRepository.findById(product.getActiveFatwaId())
                        .map(fatwa -> fatwa.getStatus() == FatwaStatus.ACTIVE
                                && fatwa.getExpiryDate() != null
                                && !fatwa.getExpiryDate().isBefore(today)
                                && !fatwa.getExpiryDate().isAfter(cutoff))
                        .orElse(false))
                .map(this::toResponse)
                .toList();
    }

    public FatwaComplianceSummary getFatwaComplianceSummary() {
        List<IslamicProductTemplate> products = productRepository.findAll();
        int activeFatwa = 0;
        int pendingFatwa = 0;
        int expiredFatwa = 0;
        int noFatwa = 0;
        int suspendedDueToFatwa = 0;
        List<FatwaComplianceSummary.ProductFatwaAlert> alerts = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (IslamicProductTemplate product : products) {
            if (product.getActiveFatwaId() == null) {
                noFatwa++;
                if (product.getShariahComplianceStatus() == IslamicDomainEnums.ShariahComplianceStatus.PENDING_FATWA) {
                    pendingFatwa++;
                }
                continue;
            }

            FatwaRecord fatwa = fatwaRecordRepository.findById(product.getActiveFatwaId()).orElse(null);
            if (fatwa == null) {
                noFatwa++;
                continue;
            }
            if (fatwa.getStatus() == FatwaStatus.ACTIVE && fatwa.getEffectiveDate() != null
                    && !fatwa.getEffectiveDate().isAfter(today)
                    && (fatwa.getExpiryDate() == null || !fatwa.getExpiryDate().isBefore(today))) {
                activeFatwa++;
                if (fatwa.getExpiryDate() != null && !fatwa.getExpiryDate().isAfter(today.plusDays(90))) {
                    alerts.add(FatwaComplianceSummary.ProductFatwaAlert.builder()
                            .productId(product.getId())
                            .productCode(product.getProductCode())
                            .productName(product.getName())
                            .fatwaId(fatwa.getId())
                            .fatwaReference(fatwa.getFatwaNumber())
                            .fatwaExpiryDate(fatwa.getExpiryDate())
                            .daysToExpiry(Duration.between(today.atStartOfDay(ZoneOffset.UTC),
                                    fatwa.getExpiryDate().atStartOfDay(ZoneOffset.UTC)).toDays())
                            .build());
                }
            } else {
                expiredFatwa++;
                if (product.getStatus() == IslamicDomainEnums.IslamicProductStatus.SUSPENDED) {
                    suspendedDueToFatwa++;
                }
            }
            if (product.getShariahComplianceStatus() == IslamicDomainEnums.ShariahComplianceStatus.PENDING_FATWA) {
                pendingFatwa++;
            }
        }

        return FatwaComplianceSummary.builder()
                .totalIslamicProducts(products.size())
                .productsWithActiveFatwa(activeFatwa)
                .productsPendingFatwa(pendingFatwa)
                .productsWithExpiredFatwa(expiredFatwa)
                .productsWithNoFatwa(noFatwa)
                .productsSuspendedDueToFatwa(suspendedDueToFatwa)
                .upcomingExpirations(alerts.stream()
                        .sorted(Comparator.comparing(FatwaComplianceSummary.ProductFatwaAlert::getDaysToExpiry))
                        .toList())
                .build();
    }

    public boolean hasActiveFatwa(Long productId) {
        return hasActiveFatwa(getProductEntity(productId));
    }

    public void validateFatwaForActivation(Long productId) {
        IslamicProductTemplate product = getProductEntity(productId);
        if (Boolean.TRUE.equals(product.getFatwaRequired()) && !hasActiveFatwa(product)) {
            FatwaStatus status = fatwaStatus(product.getActiveFatwaId());
            throw new BusinessException(
                    "Product cannot be activated without an active Fatwa from the Shariah Supervisory Board. Current fatwa status: "
                            + (status == null ? "NONE" : status.name()),
                    "FATWA_REQUIRED_FOR_ACTIVATION");
        }
    }

    public IslamicProductTemplate getProductEntity(Long productId) {
        IslamicProductTemplate product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductTemplate", "id", productId));
        validateTenantAccess(product.getTenantId());
        return product;
    }

    @EventListener
    @Transactional
    public void onFatwaExpired(FatwaExpiredEvent event) {
        productRepository.findByActiveFatwaId(event.fatwaId()).forEach(product -> {
            if (product.getStatus() == IslamicDomainEnums.IslamicProductStatus.ACTIVE) {
                product.setStatus(IslamicDomainEnums.IslamicProductStatus.SUSPENDED);
                product.setShariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.NON_COMPLIANT);
                IslamicProductTemplate saved = productRepository.save(product);
                recordStatusVersion(saved, "Product suspended due to Fatwa expiry");
                syncBaseTemplate(saved);
                syncCatalogEntry(saved);
            } else if (product.getShariahComplianceStatus() != IslamicDomainEnums.ShariahComplianceStatus.PENDING_FATWA) {
                product.setShariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.PENDING_FATWA);
                productRepository.save(product);
                syncCatalogEntry(product);
            }
        });
    }

    @EventListener
    @Transactional
    public void onFatwaRevoked(FatwaRevokedEvent event) {
        productRepository.findByActiveFatwaId(event.fatwaId()).forEach(product -> {
            product.setStatus(IslamicDomainEnums.IslamicProductStatus.SUSPENDED);
            product.setShariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.NON_COMPLIANT);
            IslamicProductTemplate saved = productRepository.save(product);
            recordStatusVersion(saved,
                    "Product suspended due to Fatwa REVOCATION - immediate Shariah board review required");
            syncBaseTemplate(saved);
            syncCatalogEntry(saved);
        });
    }

    @EventListener
    @Transactional
    public void onFatwaRenewed(FatwaRenewedEvent event) {
        productRepository.findByActiveFatwaId(event.oldFatwaId()).forEach(product -> {
            product.setActiveFatwaId(event.newFatwaId());
            if (product.getStatus() == IslamicDomainEnums.IslamicProductStatus.SUSPENDED) {
                product.setShariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.FATWA_ISSUED);
            }
            IslamicProductTemplate saved = productRepository.save(product);
            createVersionSnapshot(saved,
                    "Fatwa renewed from " + event.oldFatwaNumber() + " to " + event.newFatwaNumber(),
                    IslamicDomainEnums.VersionChangeType.FATWA_LINKED,
                    false,
                    List.of("fatwaId"),
                    null,
                    IslamicDomainEnums.VersionReviewStatus.NOT_REQUIRED);
            syncCatalogEntry(saved);
        });
    }

    IslamicProductCatalogueEntry toCatalogueEntry(IslamicProductTemplate product) {
        IslamicContractType contractType = product.getContractType();
        FatwaRecord fatwa = product.getActiveFatwaId() == null ? null : fatwaRecordRepository.findById(product.getActiveFatwaId()).orElse(null);
        boolean activeFatwa = hasActiveFatwa(product);
        return IslamicProductCatalogueEntry.builder()
                .productId(product.getId())
                .productCode(product.getProductCode())
                .name(product.getName())
                .nameAr(product.getNameAr())
                .description(product.getDescription())
                .descriptionAr(product.getDescriptionAr())
                .category(product.getProductCategory())
                .subCategory(product.getSubCategory())
                .contractTypeCode(contractType.getCode())
                .contractTypeName(contractType.getName())
                .contractTypeNameAr(contractType.getNameAr())
                .contractCategory(contractType.getCategory())
                .shariahBasis(contractType.getShariahBasis())
                .profitCalculationMethod(product.getProfitCalculationMethod())
                .profitRateDisplay(buildProfitRateDisplay(product))
                .indicativeRate(resolveIndicativeRate(product))
                .profitDistributionFrequency(product.getProfitDistributionFrequency() == null
                        ? null
                        : product.getProfitDistributionFrequency().name())
                .tenorRange(buildTenorRange(product))
                .amountRange(buildAmountRange(product))
                .currencies(copyList(product.getCurrencies()))
                .complianceStatus(product.getShariahComplianceStatus())
                .hasActiveFatwa(activeFatwa)
                .fatwaReference(fatwa == null ? null : fatwa.getFatwaNumber())
                .fatwaIssueDate(fatwa == null ? fatwaEffectiveDateFromApprovedAt(null) : fatwaEffectiveDateFromApprovedAt(fatwa))
                .fatwaExpiryDate(fatwa == null ? null : fatwa.getExpiryDate())
                .issuingAuthority("DigiCore CBS Shariah Supervisory Board")
                .lastShariahReview(product.getLastShariahReviewDate())
                .nextShariahReview(product.getNextShariahReviewDate())
                .aaoifiStandard(product.getAaoifiStandard())
                .keyShariahPrinciples(copyList(contractType.getKeyShariahPrinciples()))
                .status(product.getStatus())
                .availableForNewContracts(isProductAvailableForNewContracts(product))
                .availableFrom(product.getEffectiveFrom())
                .availableTo(product.getEffectiveTo())
                .eligibleCustomerTypes(copyList(product.getEligibleCustomerTypes()))
                .eligibleSegments(copyList(product.getEligibleSegments()))
                .eligibleCountries(copyList(product.getEligibleCountries()))
                .build();
    }

    IslamicProductResponse toResponse(IslamicProductTemplate product) {
        FatwaRecord fatwa = product.getActiveFatwaId() == null ? null : fatwaRecordRepository.findById(product.getActiveFatwaId()).orElse(null);
        IslamicContractType contractType = product.getContractType();
        return IslamicProductResponse.builder()
                .id(product.getId())
                .baseProductId(product.getBaseProductId())
                .productCode(product.getProductCode())
                .name(product.getName())
                .nameAr(product.getNameAr())
                .description(product.getDescription())
                .descriptionAr(product.getDescriptionAr())
                .contractTypeId(contractType.getId())
                .contractTypeCode(contractType.getCode())
                .contractTypeName(contractType.getName())
                .contractTypeNameAr(contractType.getNameAr())
                .productCategory(product.getProductCategory())
                .subCategory(product.getSubCategory())
                .profitCalculationMethod(product.getProfitCalculationMethod())
                .profitRateType(product.getProfitRateType())
                .baseRate(product.getBaseRate())
                .baseRateReference(product.getBaseRateReference())
                .margin(product.getMargin())
                .fixedProfitRate(product.getFixedProfitRate())
                .profitRateDecisionTableCode(product.getProfitRateDecisionTableCode())
                .profitDistributionFrequency(product.getProfitDistributionFrequency())
                .profitDistributionMethod(product.getProfitDistributionMethod())
                .bankSharePercentage(product.getBankSharePercentage())
                .customerSharePercentage(product.getCustomerSharePercentage())
                .profitSharingRatioBank(product.getProfitSharingRatioBank())
                .profitSharingRatioCustomer(product.getProfitSharingRatioCustomer())
                .lossSharingMethod(product.getLossSharingMethod())
                .diminishingSchedule(product.getDiminishingSchedule())
                .diminishingFrequency(product.getDiminishingFrequency())
                .diminishingUnitsTotal(product.getDiminishingUnitsTotal())
                .markupRate(product.getMarkupRate())
                .costPriceRequired(product.getCostPriceRequired())
                .sellingPriceImmutable(product.getSellingPriceImmutable())
                .gracePeriodDays(product.getGracePeriodDays())
                .latePenaltyToCharity(product.getLatePenaltyToCharity())
                .charityGlAccountCode(product.getCharityGlAccountCode())
                .assetOwnershipDuringTenor(product.getAssetOwnershipDuringTenor())
                .assetTransferOnCompletion(product.getAssetTransferOnCompletion())
                .rentalReviewFrequency(product.getRentalReviewFrequency())
                .maintenanceResponsibility(product.getMaintenanceResponsibility())
                .insuranceResponsibility(product.getInsuranceResponsibility())
                .takafulModel(product.getTakafulModel())
                .wakalahFeePercentage(product.getWakalahFeePercentage())
                .takafulPoolSeparation(product.getTakafulPoolSeparation())
                .aaoifiStandard(product.getAaoifiStandard())
                .ifsbStandard(product.getIfsbStandard())
                .regulatoryProductCode(product.getRegulatoryProductCode())
                .riskWeightPercentage(product.getRiskWeightPercentage())
                .activeFatwaId(product.getActiveFatwaId())
                .fatwaReference(fatwa == null ? null : fatwa.getFatwaNumber())
                .fatwaStatus(fatwa == null ? null : fatwa.getStatus().name())
                .fatwaRequired(product.getFatwaRequired())
                .shariahComplianceStatus(product.getShariahComplianceStatus())
                .lastShariahReviewDate(product.getLastShariahReviewDate())
                .nextShariahReviewDate(product.getNextShariahReviewDate())
                .shariahRuleGroupCode(product.getShariahRuleGroupCode())
                .status(product.getStatus())
                .effectiveFrom(product.getEffectiveFrom())
                .effectiveTo(product.getEffectiveTo())
                .productVersion(product.getProductVersion())
                .currentVersionId(product.getCurrentVersionId())
                .approvedBy(product.getApprovedBy())
                .approvedAt(product.getApprovedAt())
                .minAmount(product.getMinAmount())
                .maxAmount(product.getMaxAmount())
                .minTenorMonths(product.getMinTenorMonths())
                .maxTenorMonths(product.getMaxTenorMonths())
                .currencies(copyList(product.getCurrencies()))
                .eligibleCustomerTypes(copyList(product.getEligibleCustomerTypes()))
                .eligibleSegments(copyList(product.getEligibleSegments()))
                .eligibleCountries(copyList(product.getEligibleCountries()))
                .financingAssetGl(product.getFinancingAssetGl())
                .profitReceivableGl(product.getProfitReceivableGl())
                .profitIncomeGl(product.getProfitIncomeGl())
                .depositLiabilityGl(product.getDepositLiabilityGl())
                .profitPayableGl(product.getProfitPayableGl())
                .profitExpenseGl(product.getProfitExpenseGl())
                .charityGl(product.getCharityGl())
                .takafulPoolGl(product.getTakafulPoolGl())
                .suspenseGl(product.getSuspenseGl())
                .tenantId(product.getTenantId())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .createdBy(product.getCreatedBy())
                .updatedBy(product.getUpdatedBy())
                .active(product.getStatus() == IslamicDomainEnums.IslamicProductStatus.ACTIVE)
                .hasActiveFatwa(hasActiveFatwa(product))
                .activeContractCount(countActiveContracts(product.getId()))
                .parameters(parameterRepository.findByProductTemplateIdOrderByParameterNameAsc(product.getId()).stream()
                        .map(parameter -> IslamicProductResponse.IslamicProductParameterView.builder()
                                .id(parameter.getId())
                                .parameterName(parameter.getParameterName())
                                .parameterValue(convertParameterValue(parameter.getParameterType(), parameter.getParameterValue()))
                                .parameterType(parameter.getParameterType())
                                .description(parameter.getDescription())
                                .descriptionAr(parameter.getDescriptionAr())
                                .editable(parameter.getIsEditable())
                                .validationRule(parameter.getValidationRule())
                                .build())
                        .toList())
                .applicableShariahRules(resolveApplicableShariahRules(product))
                .build();
    }

    private void validateCommonRequest(IslamicProductRequest request, boolean create) {
        if (create) {
            requireText(request.getProductCode(), "productCode is required");
            requireText(request.getName(), "name is required");
            requireText(request.getNameAr(), "nameAr is required");
            if (request.getContractTypeId() == null) {
                throw new BusinessException("contractTypeId is required", "MISSING_CONTRACT_TYPE");
            }
            if (request.getProductCategory() == null) {
                throw new BusinessException("productCategory is required", "MISSING_PRODUCT_CATEGORY");
            }
            if (request.getProfitCalculationMethod() == null) {
                throw new BusinessException("profitCalculationMethod is required", "MISSING_PROFIT_METHOD");
            }
        }

        if (request.getMinAmount() != null && request.getMinAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("minAmount must be >= 0", "INVALID_MIN_AMOUNT");
        }
        if (request.getMaxAmount() != null && request.getMinAmount() != null
                && request.getMaxAmount().compareTo(request.getMinAmount()) < 0) {
            throw new BusinessException("maxAmount must be >= minAmount", "INVALID_MAX_AMOUNT");
        }
        if (request.getMinTenorMonths() != null && request.getMinTenorMonths() < 0) {
            throw new BusinessException("minTenorMonths must be >= 0", "INVALID_MIN_TENOR");
        }
        if (request.getMaxTenorMonths() != null && request.getMinTenorMonths() != null
                && request.getMaxTenorMonths() < request.getMinTenorMonths()) {
            throw new BusinessException("maxTenorMonths must be >= minTenorMonths", "INVALID_MAX_TENOR");
        }
        if (create && (request.getCurrencies() == null || request.getCurrencies().isEmpty())) {
            throw new BusinessException("At least one currency is required", "MISSING_CURRENCY");
        }
        if (create && (request.getEligibleCustomerTypes() == null || request.getEligibleCustomerTypes().isEmpty())) {
            throw new BusinessException("At least one eligible customer type is required",
                    "MISSING_ELIGIBLE_CUSTOMER_TYPE");
        }
    }

    private void validateReadyForApproval(IslamicProductTemplate product) {
        contractTypeService.validateProductAgainstContractType(product);
        validateProductCode(product.getProductCode());
        if (Boolean.TRUE.equals(product.getFatwaRequired()) && product.getActiveFatwaId() == null) {
            throw new BusinessException("Product requires a linked Fatwa before approval submission",
                    "FATWA_REQUIRED");
        }
        validateGlMappings(product);
    }

    private void validateGlMappings(IslamicProductTemplate product) {
        if (product.getProductCategory() == IslamicDomainEnums.IslamicProductCategory.FINANCING
                && !StringUtils.hasText(product.getFinancingAssetGl())) {
            throw new BusinessException("financingAssetGl is required for financing products",
                    "MISSING_GL_MAPPING");
        }
        if (Boolean.TRUE.equals(product.getLatePenaltyToCharity()) && !StringUtils.hasText(product.getCharityGl())) {
            throw new BusinessException("charityGl is required when late penalties are routed to charity",
                    "MISSING_GL_MAPPING");
        }
    }

    private void validateReferenceCodes(IslamicProductRequest request, IslamicContractType contractType) {
        if (StringUtils.hasText(request.getProfitRateDecisionTableCode())) {
            resolveBusinessRule(request.getProfitRateDecisionTableCode());
        }
        String ruleGroupCode = defaultText(request.getShariahRuleGroupCode(), contractType.getShariahRuleGroupCode());
        if (StringUtils.hasText(ruleGroupCode)
                && resolveBusinessRule(ruleGroupCode) == null
                && businessRuleRepository.findBySubCategoryAndTenantIdOrderByPriorityAscRuleCodeAsc(
                        ruleGroupCode, currentTenantResolver.getCurrentTenantId()).isEmpty()
                && businessRuleRepository.findBySubCategoryAndTenantIdIsNullOrderByPriorityAscRuleCodeAsc(ruleGroupCode).isEmpty()) {
            throw new BusinessException("Unknown shariah rule group code: " + ruleGroupCode,
                    "UNKNOWN_SHARIAH_RULE_GROUP");
        }
    }

    private ProductTemplate resolveOrCreateBaseTemplate(IslamicProductRequest request, Long tenantId) {
        if (request.getBaseProductId() != null) {
            return productTemplateRepository.findById(request.getBaseProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("ProductTemplate", "id", request.getBaseProductId()));
        }
        ProductTemplate existing = productTemplateRepository.findByTemplateCode(request.getProductCode()).orElse(null);
        if (existing != null) {
            return existing;
        }

        ProductTemplate template = ProductTemplate.builder()
                .templateCode(request.getProductCode())
                .templateName(request.getName())
                .productCategory(resolveBaseTemplateCategory(request))
                .interestConfig(buildInterestConfig(request))
                .feeConfig(buildFeeConfig(request))
                .limitConfig(buildLimitConfig(request))
                .eligibilityRules(buildEligibilityRules(request))
                .lifecycleRules(buildLifecycleRules(request))
                .glMapping(buildGlMapping(request))
                .status("DRAFT")
                .templateVersion(1)
                .createdBy(currentActorProvider.getCurrentActor())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        return productTemplateRepository.save(template);
    }

    private void syncBaseTemplate(IslamicProductTemplate product) {
        ProductTemplate template = productTemplateRepository.findById(product.getBaseProductId()).orElse(null);
        if (template == null) {
            return;
        }
        template.setTemplateCode(product.getProductCode());
        template.setTemplateName(product.getName());
        template.setProductCategory(resolveBaseTemplateCategory(snapshotToRequest(snapshotProduct(product))));
        template.setInterestConfig(buildInterestConfig(snapshotToRequest(snapshotProduct(product))));
        template.setFeeConfig(buildFeeConfig(snapshotToRequest(snapshotProduct(product))));
        template.setLimitConfig(buildLimitConfig(snapshotToRequest(snapshotProduct(product))));
        template.setEligibilityRules(buildEligibilityRules(snapshotToRequest(snapshotProduct(product))));
        template.setLifecycleRules(buildLifecycleRules(snapshotToRequest(snapshotProduct(product))));
        template.setGlMapping(buildGlMapping(snapshotToRequest(snapshotProduct(product))));
        template.setStatus(mapBaseTemplateStatus(product.getStatus()));
        template.setApprovedBy(product.getApprovedBy());
        template.setApprovedAt(product.getApprovedAt());
        if (product.getStatus() == IslamicDomainEnums.IslamicProductStatus.ACTIVE && template.getActivatedAt() == null) {
            template.setActivatedAt(Instant.now());
        }
        template.setTemplateVersion(product.getProductVersion());
        template.setUpdatedAt(Instant.now());
        productTemplateRepository.save(template);
    }

    private void syncCatalogEntry(IslamicProductTemplate product) {
        ProductCatalogEntry entry = productCatalogEntryRepository.findByProductCode(product.getProductCode())
                .orElseGet(() -> ProductCatalogEntry.builder().productCode(product.getProductCode()).build());
        entry.setProductName(product.getName());
        entry.setProductFamily(mapCatalogueFamily(product.getProductCategory()));
        entry.setProductSubType(product.getSubCategory());
        entry.setDescription(product.getDescription());
        entry.setTargetSegment(product.getEligibleSegments().isEmpty() ? "ALL" : product.getEligibleSegments().getFirst());
        entry.setAvailableChannels(List.of("BRANCH", "MOBILE", "WEB"));
        entry.setEligibilityCriteria(Map.of(
                "customerTypes", copyList(product.getEligibleCustomerTypes()),
                "segments", copyList(product.getEligibleSegments()),
                "countries", copyList(product.getEligibleCountries())
        ));
        entry.setKeyFeatures(List.of(
                Map.of("label", "Contract Type", "value", product.getContractType().getName()),
                Map.of("label", "Profit Method", "value", product.getProfitCalculationMethod().name()),
                Map.of("label", "Shariah Compliance", "value", product.getShariahComplianceStatus().name())
        ));
        entry.setFeeSchedule(buildFeeConfig(snapshotToRequest(snapshotProduct(product))));
        entry.setInterestRates(buildInterestConfig(snapshotToRequest(snapshotProduct(product))));
        entry.setRegulatoryClassification(product.getRegulatoryProductCode());
        entry.setRiskWeightPct(product.getRiskWeightPercentage());
        entry.setIsShariaCompliant(product.getShariahComplianceStatus() == IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT
                || product.getShariahComplianceStatus() == IslamicDomainEnums.ShariahComplianceStatus.FATWA_ISSUED);
        entry.setStatus(mapCatalogueStatus(product.getStatus()));
        if (product.getStatus() == IslamicDomainEnums.IslamicProductStatus.ACTIVE && entry.getLaunchedAt() == null) {
            entry.setLaunchedAt(Instant.now());
        }
        if (product.getStatus() == IslamicDomainEnums.IslamicProductStatus.RETIRED) {
            entry.setRetiredAt(Instant.now());
        }
        productCatalogEntryRepository.save(entry);
    }

    private void validateFatwaForLinkage(IslamicProductTemplate product, Long fatwaId) {
        FatwaRecord fatwa = fatwaRecordRepository.findById(fatwaId)
                .orElseThrow(() -> new ResourceNotFoundException("FatwaRecord", "id", fatwaId));
        if (fatwa.getStatus() != FatwaStatus.ACTIVE) {
            throw new BusinessException("Only ACTIVE fatwas can be linked to products", "INVALID_FATWA_STATUS");
        }
        LocalDate productStart = defaultLocalDate(product.getEffectiveFrom(), LocalDate.now());
        if (fatwa.getEffectiveDate() != null && fatwa.getEffectiveDate().isAfter(productStart)) {
            throw new BusinessException("Fatwa effective date does not cover the product effective date",
                    "INVALID_FATWA_EFFECTIVE_DATE");
        }
        if (fatwa.getExpiryDate() != null && fatwa.getExpiryDate().isBefore(productStart)) {
            throw new BusinessException("Fatwa is expired for the product effective date", "EXPIRED_FATWA");
        }
        List<String> scopes = fatwa.getApplicableContractTypes() == null ? List.of() : fatwa.getApplicableContractTypes();
        if (!scopes.isEmpty() && scopes.stream().noneMatch(item -> item.equalsIgnoreCase(product.getContractType().getCode()))) {
            throw new BusinessException("Fatwa does not cover contract type " + product.getContractType().getCode(),
                    "FATWA_SCOPE_MISMATCH");
        }
    }

    private Long createSsbReviewRequest(IslamicProductTemplate product, List<String> changedFields) {
        List<Long> activeMembers = ssbBoardMemberRepository.findByIsActiveTrueOrderByFullNameAsc().stream()
                .map(member -> member.getId())
                .toList();
        if (activeMembers.isEmpty()) {
            throw new BusinessException("No active SSB members available to assign a product review",
                    "NO_ACTIVE_SSB_MEMBERS");
        }
        CreateReviewRequest request = CreateReviewRequest.builder()
                .requestType(ReviewRequestType.PRODUCT_CHANGE)
                .title("Material change review for " + product.getProductCode())
                .description("Material change to " + product.getProductCode() + ": " + String.join(", ", changedFields))
                .assignedMemberIds(activeMembers)
                .requiredQuorum(activeMembers.size())
                .linkedFatwaId(product.getActiveFatwaId())
                .linkedProductCode(product.getProductCode())
                .priority(product.getStatus() == IslamicDomainEnums.IslamicProductStatus.ACTIVE ? "HIGH" : "NORMAL")
                .build();
        ReviewRequestResponse response = shariahGovernanceService.createReview(request, currentActorProvider.getCurrentActor());
        return response.getId();
    }

    private boolean isMaterialField(String field, Object before, Object after) {
        if (IGNORED_DIFF_FIELDS.contains(field)) {
            return false;
        }
        if (MATERIAL_FIELDS.contains(field)) {
            return true;
        }
        if ("markupRate".equals(field)) {
            BigDecimal beforeRate = decimal(before);
            BigDecimal afterRate = decimal(after);
            if (beforeRate == null || afterRate == null) {
                return !Objects.equals(beforeRate, afterRate);
            }
            if (beforeRate.compareTo(BigDecimal.ZERO) == 0) {
                return afterRate.compareTo(BigDecimal.ZERO) != 0;
            }
            BigDecimal change = afterRate.subtract(beforeRate).abs()
                    .divide(beforeRate.abs(), 8, RoundingMode.HALF_UP)
                    .multiply(HUNDRED);
            return change.compareTo(new BigDecimal("10")) > 0;
        }
        if ("latePenaltyToCharity".equals(field)) {
            return Boolean.FALSE.equals(after);
        }
        if ("charityGlAccountCode".equals(field)) {
            return !StringUtils.hasText(String.valueOf(after));
        }
        return false;
    }

    private List<String> determineChangedFields(Map<String, Object> beforeSnapshot, Map<String, Object> afterSnapshot) {
        Set<String> keys = new LinkedHashSet<>();
        keys.addAll(beforeSnapshot.keySet());
        keys.addAll(afterSnapshot.keySet());
        return keys.stream()
                .filter(key -> !IGNORED_DIFF_FIELDS.contains(key))
                .filter(key -> !Objects.equals(beforeSnapshot.get(key), afterSnapshot.get(key)))
                .toList();
    }

    private IslamicProductVersion createVersionSnapshot(
            IslamicProductTemplate product,
            String description,
            IslamicDomainEnums.VersionChangeType changeType,
            boolean material,
            List<String> changedFields,
            Long ssbReviewRequestId,
            IslamicDomainEnums.VersionReviewStatus reviewStatus
    ) {
        int nextVersion = versionRepository.findFirstByProductTemplateIdOrderByVersionNumberDesc(product.getId())
                .map(existing -> existing.getVersionNumber() + 1)
                .orElse(1);
        IslamicProductVersion version = IslamicProductVersion.builder()
                .productTemplate(product)
                .versionNumber(nextVersion)
                .productSnapshot(snapshotProduct(product))
                .changeDescription(description)
                .changeType(changeType)
                .isMaterialChange(material)
                .changedFields(new ArrayList<>(changedFields))
                .changedBy(currentActorProvider.getCurrentActor())
                .changedAt(Instant.now())
                .ssbReviewRequestId(ssbReviewRequestId)
                .ssbReviewStatus(reviewStatus)
                .previousVersionId(product.getCurrentVersionId())
                .build();
        return versionRepository.save(version);
    }

    private void recordStatusVersion(IslamicProductTemplate product, String description) {
        IslamicProductVersion version = createVersionSnapshot(product,
                description,
                IslamicDomainEnums.VersionChangeType.STATUS_CHANGE,
                false,
                List.of("status"),
                null,
                IslamicDomainEnums.VersionReviewStatus.NOT_REQUIRED);
        product.setCurrentVersionId(version.getId());
        product.setProductVersion(version.getVersionNumber());
        productRepository.save(product);
    }

    private Map<String, Object> snapshotProduct(IslamicProductTemplate product) {
        LinkedHashMap<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("baseProductId", product.getBaseProductId());
        snapshot.put("productCode", product.getProductCode());
        snapshot.put("name", product.getName());
        snapshot.put("nameAr", product.getNameAr());
        snapshot.put("description", product.getDescription());
        snapshot.put("descriptionAr", product.getDescriptionAr());
        snapshot.put("contractTypeId", product.getContractType().getId());
        snapshot.put("productCategory", product.getProductCategory());
        snapshot.put("subCategory", product.getSubCategory());
        snapshot.put("profitCalculationMethod", product.getProfitCalculationMethod());
        snapshot.put("profitRateType", product.getProfitRateType());
        snapshot.put("baseRate", product.getBaseRate());
        snapshot.put("baseRateReference", product.getBaseRateReference());
        snapshot.put("margin", product.getMargin());
        snapshot.put("fixedProfitRate", product.getFixedProfitRate());
        snapshot.put("profitRateDecisionTableCode", product.getProfitRateDecisionTableCode());
        snapshot.put("profitDistributionFrequency", product.getProfitDistributionFrequency());
        snapshot.put("profitDistributionMethod", product.getProfitDistributionMethod());
        snapshot.put("bankSharePercentage", product.getBankSharePercentage());
        snapshot.put("customerSharePercentage", product.getCustomerSharePercentage());
        snapshot.put("profitSharingRatioBank", product.getProfitSharingRatioBank());
        snapshot.put("profitSharingRatioCustomer", product.getProfitSharingRatioCustomer());
        snapshot.put("lossSharingMethod", product.getLossSharingMethod());
        snapshot.put("diminishingSchedule", product.getDiminishingSchedule());
        snapshot.put("diminishingFrequency", product.getDiminishingFrequency());
        snapshot.put("diminishingUnitsTotal", product.getDiminishingUnitsTotal());
        snapshot.put("markupRate", product.getMarkupRate());
        snapshot.put("costPriceRequired", product.getCostPriceRequired());
        snapshot.put("sellingPriceImmutable", product.getSellingPriceImmutable());
        snapshot.put("gracePeriodDays", product.getGracePeriodDays());
        snapshot.put("latePenaltyToCharity", product.getLatePenaltyToCharity());
        snapshot.put("charityGlAccountCode", product.getCharityGlAccountCode());
        snapshot.put("assetOwnershipDuringTenor", product.getAssetOwnershipDuringTenor());
        snapshot.put("assetTransferOnCompletion", product.getAssetTransferOnCompletion());
        snapshot.put("rentalReviewFrequency", product.getRentalReviewFrequency());
        snapshot.put("maintenanceResponsibility", product.getMaintenanceResponsibility());
        snapshot.put("insuranceResponsibility", product.getInsuranceResponsibility());
        snapshot.put("takafulModel", product.getTakafulModel());
        snapshot.put("wakalahFeePercentage", product.getWakalahFeePercentage());
        snapshot.put("takafulPoolSeparation", product.getTakafulPoolSeparation());
        snapshot.put("aaoifiStandard", product.getAaoifiStandard());
        snapshot.put("ifsbStandard", product.getIfsbStandard());
        snapshot.put("regulatoryProductCode", product.getRegulatoryProductCode());
        snapshot.put("riskWeightPercentage", product.getRiskWeightPercentage());
        snapshot.put("fatwaId", product.getActiveFatwaId());
        snapshot.put("fatwaRequired", product.getFatwaRequired());
        snapshot.put("shariahRuleGroupCode", product.getShariahRuleGroupCode());
        snapshot.put("effectiveFrom", product.getEffectiveFrom());
        snapshot.put("effectiveTo", product.getEffectiveTo());
        snapshot.put("minAmount", product.getMinAmount());
        snapshot.put("maxAmount", product.getMaxAmount());
        snapshot.put("minTenorMonths", product.getMinTenorMonths());
        snapshot.put("maxTenorMonths", product.getMaxTenorMonths());
        snapshot.put("currencies", copyList(product.getCurrencies()));
        snapshot.put("eligibleCustomerTypes", copyList(product.getEligibleCustomerTypes()));
        snapshot.put("eligibleSegments", copyList(product.getEligibleSegments()));
        snapshot.put("eligibleCountries", copyList(product.getEligibleCountries()));
        snapshot.put("financingAssetGl", product.getFinancingAssetGl());
        snapshot.put("profitReceivableGl", product.getProfitReceivableGl());
        snapshot.put("profitIncomeGl", product.getProfitIncomeGl());
        snapshot.put("depositLiabilityGl", product.getDepositLiabilityGl());
        snapshot.put("profitPayableGl", product.getProfitPayableGl());
        snapshot.put("profitExpenseGl", product.getProfitExpenseGl());
        snapshot.put("charityGl", product.getCharityGl());
        snapshot.put("takafulPoolGl", product.getTakafulPoolGl());
        snapshot.put("suspenseGl", product.getSuspenseGl());
            snapshot.put("baseTemplateCategory", resolveBaseTemplateCategory(snapshotToRequest(new LinkedHashMap<>(snapshot))));
        snapshot.put("status", product.getStatus());
        snapshot.put("shariahComplianceStatus", product.getShariahComplianceStatus());
        snapshot.put("lastShariahReviewDate", product.getLastShariahReviewDate());
        snapshot.put("nextShariahReviewDate", product.getNextShariahReviewDate());
        snapshot.put("approvedBy", product.getApprovedBy());
        snapshot.put("approvedAt", product.getApprovedAt());
        snapshot.put("productVersion", product.getProductVersion());
        snapshot.put("currentVersionId", product.getCurrentVersionId());
        return snapshot;
    }

    private void restoreProductFromSnapshot(IslamicProductTemplate product, Map<String, Object> snapshot) {
        IslamicProductRequest request = snapshotToRequest(snapshot);
        applyRequestToProduct(product, request, contractTypeService.getById(request.getContractTypeId()), true);
        if (snapshot.containsKey("status")) {
            product.setStatus(objectMapper.convertValue(snapshot.get("status"), IslamicDomainEnums.IslamicProductStatus.class));
        }
        if (snapshot.containsKey("shariahComplianceStatus")) {
            product.setShariahComplianceStatus(objectMapper.convertValue(snapshot.get("shariahComplianceStatus"),
                    IslamicDomainEnums.ShariahComplianceStatus.class));
        }
        product.setApprovedBy((String) snapshot.get("approvedBy"));
        product.setApprovedAt(snapshot.get("approvedAt") == null ? null : Instant.parse(String.valueOf(snapshot.get("approvedAt"))));
    }

    private IslamicProductTemplate cloneFromSnapshot(IslamicProductTemplate source, Map<String, Object> snapshot) {
        IslamicProductTemplate clone = IslamicProductTemplate.builder().id(source.getId()).tenantId(source.getTenantId()).build();
        restoreProductFromSnapshot(clone, snapshot);
        clone.setCreatedAt(source.getCreatedAt());
        clone.setUpdatedAt(source.getUpdatedAt());
        clone.setCreatedBy(source.getCreatedBy());
        clone.setUpdatedBy(source.getUpdatedBy());
        clone.setCurrentVersionId(source.getCurrentVersionId());
        return clone;
    }

    private void applyRequestToProduct(
            IslamicProductTemplate product,
            IslamicProductRequest request,
            IslamicContractType contractType,
            boolean replaceNulls
    ) {
        product.setContractType(contractType);
        if (replaceNulls || request.getBaseProductId() != null) product.setBaseProductId(request.getBaseProductId());
        if (replaceNulls || request.getProductCode() != null) product.setProductCode(trimToNull(request.getProductCode()));
        if (replaceNulls || request.getName() != null) product.setName(trimToNull(request.getName()));
        if (replaceNulls || request.getNameAr() != null) product.setNameAr(trimToNull(request.getNameAr()));
        if (replaceNulls || request.getDescription() != null) product.setDescription(trimToNull(request.getDescription()));
        if (replaceNulls || request.getDescriptionAr() != null) product.setDescriptionAr(trimToNull(request.getDescriptionAr()));
        if (replaceNulls || request.getProductCategory() != null) product.setProductCategory(request.getProductCategory());
        if (replaceNulls || request.getSubCategory() != null) product.setSubCategory(trimToNull(request.getSubCategory()));
        if (replaceNulls || request.getProfitCalculationMethod() != null) product.setProfitCalculationMethod(request.getProfitCalculationMethod());
        if (replaceNulls || request.getProfitRateType() != null) product.setProfitRateType(request.getProfitRateType());
        if (replaceNulls || request.getBaseRate() != null) product.setBaseRate(request.getBaseRate());
        if (replaceNulls || request.getBaseRateReference() != null) product.setBaseRateReference(trimToNull(request.getBaseRateReference()));
        if (replaceNulls || request.getMargin() != null) product.setMargin(request.getMargin());
        if (replaceNulls || request.getFixedProfitRate() != null) product.setFixedProfitRate(request.getFixedProfitRate());
        if (replaceNulls || request.getProfitRateDecisionTableCode() != null) product.setProfitRateDecisionTableCode(trimToNull(request.getProfitRateDecisionTableCode()));
        if (replaceNulls || request.getProfitDistributionFrequency() != null) product.setProfitDistributionFrequency(request.getProfitDistributionFrequency());
        if (replaceNulls || request.getProfitDistributionMethod() != null) product.setProfitDistributionMethod(request.getProfitDistributionMethod());
        if (replaceNulls || request.getBankSharePercentage() != null) product.setBankSharePercentage(request.getBankSharePercentage());
        if (replaceNulls || request.getCustomerSharePercentage() != null) product.setCustomerSharePercentage(request.getCustomerSharePercentage());
        if (replaceNulls || request.getProfitSharingRatioBank() != null) product.setProfitSharingRatioBank(request.getProfitSharingRatioBank());
        if (replaceNulls || request.getProfitSharingRatioCustomer() != null) product.setProfitSharingRatioCustomer(request.getProfitSharingRatioCustomer());
        if (replaceNulls || request.getLossSharingMethod() != null) product.setLossSharingMethod(request.getLossSharingMethod());
        if (replaceNulls || request.getDiminishingSchedule() != null) product.setDiminishingSchedule(defaultBoolean(request.getDiminishingSchedule(), false));
        if (replaceNulls || request.getDiminishingFrequency() != null) product.setDiminishingFrequency(request.getDiminishingFrequency());
        if (replaceNulls || request.getDiminishingUnitsTotal() != null) product.setDiminishingUnitsTotal(request.getDiminishingUnitsTotal());
        if (replaceNulls || request.getMarkupRate() != null) product.setMarkupRate(request.getMarkupRate());
        if (replaceNulls || request.getCostPriceRequired() != null) product.setCostPriceRequired(defaultBoolean(request.getCostPriceRequired(), false));
        if (replaceNulls || request.getSellingPriceImmutable() != null) product.setSellingPriceImmutable(defaultBoolean(request.getSellingPriceImmutable(), false));
        if (replaceNulls || request.getGracePeriodDays() != null) product.setGracePeriodDays(request.getGracePeriodDays());
        if (replaceNulls || request.getLatePenaltyToCharity() != null) product.setLatePenaltyToCharity(defaultBoolean(request.getLatePenaltyToCharity(), false));
        if (replaceNulls || request.getCharityGlAccountCode() != null) product.setCharityGlAccountCode(trimToNull(request.getCharityGlAccountCode()));
        if (replaceNulls || request.getAssetOwnershipDuringTenor() != null) product.setAssetOwnershipDuringTenor(request.getAssetOwnershipDuringTenor());
        if (replaceNulls || request.getAssetTransferOnCompletion() != null) product.setAssetTransferOnCompletion(request.getAssetTransferOnCompletion());
        if (replaceNulls || request.getRentalReviewFrequency() != null) product.setRentalReviewFrequency(request.getRentalReviewFrequency());
        if (replaceNulls || request.getMaintenanceResponsibility() != null) product.setMaintenanceResponsibility(request.getMaintenanceResponsibility());
        if (replaceNulls || request.getInsuranceResponsibility() != null) product.setInsuranceResponsibility(request.getInsuranceResponsibility());
        if (replaceNulls || request.getTakafulModel() != null) product.setTakafulModel(request.getTakafulModel());
        if (replaceNulls || request.getWakalahFeePercentage() != null) product.setWakalahFeePercentage(request.getWakalahFeePercentage());
        if (replaceNulls || request.getTakafulPoolSeparation() != null) product.setTakafulPoolSeparation(request.getTakafulPoolSeparation());
        if (replaceNulls || request.getAaoifiStandard() != null) product.setAaoifiStandard(trimToNull(request.getAaoifiStandard()));
        if (replaceNulls || request.getIfsbStandard() != null) product.setIfsbStandard(trimToNull(request.getIfsbStandard()));
        if (replaceNulls || request.getRegulatoryProductCode() != null) product.setRegulatoryProductCode(trimToNull(request.getRegulatoryProductCode()));
        if (replaceNulls || request.getRiskWeightPercentage() != null) product.setRiskWeightPercentage(request.getRiskWeightPercentage());
        if (replaceNulls || request.getFatwaId() != null) product.setActiveFatwaId(request.getFatwaId());
        if (replaceNulls || request.getFatwaRequired() != null) product.setFatwaRequired(defaultBoolean(request.getFatwaRequired(), true));
        if (replaceNulls || request.getShariahRuleGroupCode() != null) product.setShariahRuleGroupCode(trimToNull(request.getShariahRuleGroupCode()));
        if (replaceNulls || request.getEffectiveFrom() != null) product.setEffectiveFrom(defaultLocalDate(request.getEffectiveFrom(), LocalDate.now()));
        if (replaceNulls || request.getEffectiveTo() != null) product.setEffectiveTo(request.getEffectiveTo());
        if (replaceNulls || request.getMinAmount() != null) product.setMinAmount(defaultDecimal(request.getMinAmount()));
        if (replaceNulls || request.getMaxAmount() != null) product.setMaxAmount(request.getMaxAmount());
        if (replaceNulls || request.getMinTenorMonths() != null) product.setMinTenorMonths(defaultInt(request.getMinTenorMonths(), 0));
        if (replaceNulls || request.getMaxTenorMonths() != null) product.setMaxTenorMonths(defaultInt(request.getMaxTenorMonths(), 0));
        if (replaceNulls || request.getCurrencies() != null) product.setCurrencies(copyList(request.getCurrencies()));
        if (replaceNulls || request.getEligibleCustomerTypes() != null) product.setEligibleCustomerTypes(copyList(request.getEligibleCustomerTypes()));
        if (replaceNulls || request.getEligibleSegments() != null) product.setEligibleSegments(copyList(request.getEligibleSegments()));
        if (replaceNulls || request.getEligibleCountries() != null) product.setEligibleCountries(copyList(request.getEligibleCountries()));
        if (replaceNulls || request.getFinancingAssetGl() != null) product.setFinancingAssetGl(trimToNull(request.getFinancingAssetGl()));
        if (replaceNulls || request.getProfitReceivableGl() != null) product.setProfitReceivableGl(trimToNull(request.getProfitReceivableGl()));
        if (replaceNulls || request.getProfitIncomeGl() != null) product.setProfitIncomeGl(trimToNull(request.getProfitIncomeGl()));
        if (replaceNulls || request.getDepositLiabilityGl() != null) product.setDepositLiabilityGl(trimToNull(request.getDepositLiabilityGl()));
        if (replaceNulls || request.getProfitPayableGl() != null) product.setProfitPayableGl(trimToNull(request.getProfitPayableGl()));
        if (replaceNulls || request.getProfitExpenseGl() != null) product.setProfitExpenseGl(trimToNull(request.getProfitExpenseGl()));
        if (replaceNulls || request.getCharityGl() != null) product.setCharityGl(trimToNull(request.getCharityGl()));
        if (replaceNulls || request.getTakafulPoolGl() != null) product.setTakafulPoolGl(trimToNull(request.getTakafulPoolGl()));
        if (replaceNulls || request.getSuspenseGl() != null) product.setSuspenseGl(trimToNull(request.getSuspenseGl()));
    }

    private Specification<IslamicProductTemplate> buildSearchSpecification(IslamicProductSearchCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            Long tenantId = currentTenantResolver.getCurrentTenantId();
            if (tenantId != null) {
                predicates.add(cb.or(cb.isNull(root.get("tenantId")), cb.equal(root.get("tenantId"), tenantId)));
            }
            if (StringUtils.hasText(criteria.getQuery())) {
                String like = "%" + criteria.getQuery().trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("productCode")), like),
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(root.get("subCategory")), like)
                ));
            }
            if (criteria.getContractTypeId() != null) {
                predicates.add(cb.equal(root.get("contractType").get("id"), criteria.getContractTypeId()));
            }
            if (criteria.getProductCategory() != null) {
                predicates.add(cb.equal(root.get("productCategory"), criteria.getProductCategory()));
            }
            if (criteria.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), criteria.getStatus()));
            }
            if (criteria.getComplianceStatus() != null) {
                predicates.add(cb.equal(root.get("shariahComplianceStatus"), criteria.getComplianceStatus()));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Sort resolveSort(Pageable pageable) {
        return pageable.getSort().isSorted() ? pageable.getSort() : Sort.by(Sort.Direction.ASC, "productCode");
    }

    private boolean hasActiveFatwa(IslamicProductTemplate product) {
        if (product.getActiveFatwaId() == null) {
            return false;
        }
        return fatwaRecordRepository.findById(product.getActiveFatwaId())
                .map(fatwa -> fatwa.getStatus() == FatwaStatus.ACTIVE
                        && (fatwa.getEffectiveDate() == null || !fatwa.getEffectiveDate().isAfter(LocalDate.now()))
                        && (fatwa.getExpiryDate() == null || !fatwa.getExpiryDate().isBefore(LocalDate.now())))
                .orElse(false);
    }

    private FatwaStatus fatwaStatus(Long fatwaId) {
        if (fatwaId == null) return null;
        return fatwaRecordRepository.findById(fatwaId).map(FatwaRecord::getStatus).orElse(null);
    }

    private List<String> resolveApplicableShariahRules(IslamicProductTemplate product) {
        LinkedHashSet<String> codes = new LinkedHashSet<>();
        String ruleGroup = product.getShariahRuleGroupCode();
        if (StringUtils.hasText(ruleGroup)) {
            BusinessRule direct = resolveBusinessRule(ruleGroup);
            if (direct != null && direct.getStatus() == BusinessRuleStatus.ACTIVE) {
                codes.add(direct.getRuleCode());
            }
            businessRuleRepository.findBySubCategoryAndTenantIdOrderByPriorityAscRuleCodeAsc(
                            ruleGroup, currentTenantResolver.getCurrentTenantId())
                    .stream()
                    .filter(rule -> rule.getStatus() == BusinessRuleStatus.ACTIVE)
                    .map(BusinessRule::getRuleCode)
                    .forEach(codes::add);
            businessRuleRepository.findBySubCategoryAndTenantIdIsNullOrderByPriorityAscRuleCodeAsc(ruleGroup)
                    .stream()
                    .filter(rule -> rule.getStatus() == BusinessRuleStatus.ACTIVE)
                    .map(BusinessRule::getRuleCode)
                    .forEach(codes::add);
        }
        return new ArrayList<>(codes);
    }

    private String buildProfitRateDisplay(IslamicProductTemplate product) {
        return switch (product.getProfitCalculationMethod()) {
            case NONE -> "No contractual profit";
            case COST_PLUS_MARKUP -> "Cost + " + safeDecimal(product.getMarkupRate()) + "% markup";
            case PROFIT_SHARING_RATIO -> safeDecimal(product.getProfitSharingRatioCustomer()) + ":"
                    + safeDecimal(product.getProfitSharingRatioBank()) + " profit sharing";
            case RENTAL_RATE -> safeDecimal(product.getFixedProfitRate()) + "% p.a. rental rate";
            case EXPECTED_PROFIT_RATE -> safeDecimal(product.getFixedProfitRate()) + "% p.a. (indicative)";
            case COMMISSION_BASED -> safeDecimal(product.getWakalahFeePercentage()) + "% agency fee";
        };
    }

    private BigDecimal resolveIndicativeRate(IslamicProductTemplate product) {
        if (product.getFixedProfitRate() != null) return product.getFixedProfitRate();
        if (product.getMarkupRate() != null) return product.getMarkupRate();
        if (product.getProfitSharingRatioCustomer() != null) return product.getProfitSharingRatioCustomer();
        if (product.getWakalahFeePercentage() != null) return product.getWakalahFeePercentage();
        if (product.getBaseRate() != null || product.getMargin() != null) {
            return defaultDecimal(product.getBaseRate()).add(defaultDecimal(product.getMargin()));
        }
        return BigDecimal.ZERO;
    }

    private String buildTenorRange(IslamicProductTemplate product) {
        if (defaultInt(product.getMinTenorMonths(), 0) == 0 && defaultInt(product.getMaxTenorMonths(), 0) == 0) {
            return "Open-ended";
        }
        return product.getMinTenorMonths() + " - " + product.getMaxTenorMonths() + " months";
    }

    private String buildAmountRange(IslamicProductTemplate product) {
        String currency = product.getCurrencies().isEmpty() ? "" : product.getCurrencies().getFirst() + " ";
        String max = product.getMaxAmount() == null ? "unbounded" : product.getMaxAmount().stripTrailingZeros().toPlainString();
        return currency + product.getMinAmount().stripTrailingZeros().toPlainString() + " - " + max;
    }

    private boolean isProductAvailableForNewContracts(IslamicProductTemplate product) {
        LocalDate today = LocalDate.now();
        return product.getStatus() == IslamicDomainEnums.IslamicProductStatus.ACTIVE
                && product.getShariahComplianceStatus() == IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT
                && hasActiveFatwa(product)
                && !product.getEffectiveFrom().isAfter(today)
                && (product.getEffectiveTo() == null || !product.getEffectiveTo().isBefore(today));
    }

    private Map<String, Object> buildInterestConfig(IslamicProductRequest request) {
        LinkedHashMap<String, Object> values = new LinkedHashMap<>();
        values.put("profitCalculationMethod", enumName(request.getProfitCalculationMethod()));
        values.put("profitRateType", enumName(request.getProfitRateType()));
        values.put("baseRate", request.getBaseRate());
        values.put("baseRateReference", request.getBaseRateReference());
        values.put("margin", request.getMargin());
        values.put("fixedProfitRate", request.getFixedProfitRate());
        values.put("profitRateDecisionTableCode", request.getProfitRateDecisionTableCode());
        values.put("markupRate", request.getMarkupRate());
        values.put("wakalahFeePercentage", request.getWakalahFeePercentage());
        return values;
    }

    private Map<String, Object> buildFeeConfig(IslamicProductRequest request) {
        LinkedHashMap<String, Object> values = new LinkedHashMap<>();
        values.put("latePenaltyToCharity", request.getLatePenaltyToCharity());
        values.put("gracePeriodDays", request.getGracePeriodDays());
        values.put("charityGlAccountCode", request.getCharityGlAccountCode());
        return values;
    }

    private Map<String, Object> buildLimitConfig(IslamicProductRequest request) {
        LinkedHashMap<String, Object> values = new LinkedHashMap<>();
        values.put("minAmount", request.getMinAmount());
        values.put("maxAmount", request.getMaxAmount());
        values.put("minTenorMonths", request.getMinTenorMonths());
        values.put("maxTenorMonths", request.getMaxTenorMonths());
        values.put("currencies", copyList(request.getCurrencies()));
        return values;
    }

    private List<Map<String, Object>> buildEligibilityRules(IslamicProductRequest request) {
        return List.of(
                Map.of("customerTypes", copyList(request.getEligibleCustomerTypes())),
                Map.of("segments", copyList(request.getEligibleSegments())),
                Map.of("countries", copyList(request.getEligibleCountries()))
        );
    }

    private Map<String, Object> buildLifecycleRules(IslamicProductRequest request) {
        LinkedHashMap<String, Object> values = new LinkedHashMap<>();
        values.put("effectiveFrom", request.getEffectiveFrom());
        values.put("effectiveTo", request.getEffectiveTo());
        values.put("fatwaRequired", request.getFatwaRequired());
        return values;
    }

    private Map<String, Object> buildGlMapping(IslamicProductRequest request) {
        LinkedHashMap<String, Object> values = new LinkedHashMap<>();
        values.put("financingAssetGl", request.getFinancingAssetGl());
        values.put("profitReceivableGl", request.getProfitReceivableGl());
        values.put("profitIncomeGl", request.getProfitIncomeGl());
        values.put("depositLiabilityGl", request.getDepositLiabilityGl());
        values.put("profitPayableGl", request.getProfitPayableGl());
        values.put("profitExpenseGl", request.getProfitExpenseGl());
        values.put("charityGl", request.getCharityGl());
        values.put("takafulPoolGl", request.getTakafulPoolGl());
        values.put("suspenseGl", request.getSuspenseGl());
        return values;
    }

    private String resolveBaseTemplateCategory(IslamicProductRequest request) {
        if (StringUtils.hasText(request.getBaseTemplateCategory())) {
            return request.getBaseTemplateCategory().trim().toUpperCase(Locale.ROOT);
        }
        String subCategory = defaultText(request.getSubCategory(), "").toUpperCase(Locale.ROOT);
        return switch (request.getProductCategory()) {
            case DEPOSIT -> {
                if (subCategory.contains("RECURRING")) yield "RECURRING_DEPOSIT";
                if (subCategory.contains("TERM") || subCategory.contains("FIXED")) yield "FIXED_DEPOSIT";
                yield "SAVINGS";
            }
            case FINANCING -> {
                if (subCategory.contains("SME") || subCategory.contains("WORKING_CAPITAL") || subCategory.contains("BUSINESS")) {
                    yield "SME_LOAN";
                }
                if (subCategory.contains("HOME") || subCategory.contains("MORTGAGE")) {
                    yield "MORTGAGE";
                }
                if (subCategory.contains("OVERDRAFT")) {
                    yield "OVERDRAFT";
                }
                yield "PERSONAL_LOAN";
            }
            case INVESTMENT -> "FIXED_DEPOSIT";
            case TRADE, GUARANTEE -> "SME_LOAN";
            case AGENCY, SUKUK -> "CURRENT";
            case INSURANCE -> throw new BusinessException(
                    "baseTemplateCategory is required for INSURANCE products because the base product factory does not define a native insurance category",
                    "MISSING_BASE_TEMPLATE_CATEGORY");
        };
    }

    private String mapBaseTemplateStatus(IslamicDomainEnums.IslamicProductStatus status) {
        return status.name();
    }

    private String mapCatalogueFamily(IslamicDomainEnums.IslamicProductCategory category) {
        return switch (category) {
            case FINANCING -> "LENDING";
            case DEPOSIT -> "DEPOSITS";
            case INVESTMENT, SUKUK, AGENCY -> "INVESTMENT";
            case INSURANCE -> "INSURANCE";
            case TRADE, GUARANTEE -> "TRADE_FINANCE";
        };
    }

    private String mapCatalogueStatus(IslamicDomainEnums.IslamicProductStatus status) {
        return switch (status) {
            case ACTIVE -> "ACTIVE";
            case SUSPENDED -> "SUSPENDED";
            case RETIRED -> "RETIRED";
            default -> "DRAFT";
        };
    }

    private BusinessRule resolveBusinessRule(String ruleCode) {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        if (tenantId != null) {
            Optional<BusinessRule> tenantRule = businessRuleRepository.findByRuleCodeAndTenantId(ruleCode, tenantId);
            if (tenantRule.isPresent()) return tenantRule.get();
        }
        return businessRuleRepository.findByRuleCodeAndTenantIdIsNull(ruleCode).orElse(null);
    }

    private void unlinkAffectedFatwas(Long fatwaId, String reason) {
        productRepository.findByActiveFatwaId(fatwaId)
                .forEach(product -> unlinkFatwaFromProduct(product.getId(), reason));
    }

    private Object convertParameterValue(IslamicDomainEnums.ParameterType type, String value) {
        if (value == null) return null;
        return switch (type) {
            case STRING -> value;
            case DECIMAL -> new BigDecimal(value);
            case INTEGER -> Integer.parseInt(value);
            case BOOLEAN -> Boolean.parseBoolean(value);
            case DATE -> LocalDate.parse(value);
            case JSON -> readJson(value);
        };
    }

    private Object readJson(String value) {
        try {
            return objectMapper.readValue(value, Object.class);
        } catch (Exception ex) {
            return value;
        }
    }

    private Map<String, Object> flattenJson(JsonNode node) {
        Map<String, Object> output = new LinkedHashMap<>();
        flattenJson("", node, output);
        return output;
    }

    private void flattenJson(String path, JsonNode node, Map<String, Object> output) {
        if (node == null || node.isNull()) {
            output.put(path, null);
            return;
        }
        if (node.isValueNode()) {
            output.put(path, objectMapper.convertValue(node, Object.class));
            return;
        }
        if (node.isArray()) {
            for (int i = 0; i < node.size(); i++) {
                flattenJson(path + "[" + i + "]", node.get(i), output);
            }
            return;
        }
        node.properties().forEach(entry -> {
            String child = path.isEmpty() ? entry.getKey() : path + "." + entry.getKey();
            flattenJson(child, entry.getValue(), output);
        });
    }

    private IslamicProductRequest snapshotToRequest(Map<String, Object> snapshot) {
        LinkedHashMap<String, Object> requestSnapshot = new LinkedHashMap<>(snapshot);
        requestSnapshot.remove("status");
        requestSnapshot.remove("shariahComplianceStatus");
        requestSnapshot.remove("lastShariahReviewDate");
        requestSnapshot.remove("nextShariahReviewDate");
        requestSnapshot.remove("approvedBy");
        requestSnapshot.remove("approvedAt");
        requestSnapshot.remove("productVersion");
        requestSnapshot.remove("currentVersionId");
        requestSnapshot.remove("baseTemplateCategory");
        return objectMapper.convertValue(requestSnapshot, IslamicProductRequest.class);
    }

    private void validateProductCode(String productCode) {
        if (!StringUtils.hasText(productCode)) {
            throw new BusinessException("productCode is required", "MISSING_PRODUCT_CODE");
        }
        String code = productCode.trim();
        if (code.length() > 30 || !code.matches("^[A-Z0-9]+(?:-[A-Z0-9]+)*$")) {
            throw new BusinessException(
                    "productCode must be uppercase, <= 30 characters, and follow {CONTRACT}-{CATEGORY}-{SEQUENCE} style",
                    "INVALID_PRODUCT_CODE");
        }
    }

    private void validateTenantAccess(Long tenantId) {
        Long currentTenantId = currentTenantResolver.getCurrentTenantId();
        if (currentTenantId != null && tenantId != null && !Objects.equals(currentTenantId, tenantId)) {
            throw new BusinessException("Product does not belong to the current tenant", "TENANT_ACCESS_DENIED");
        }
    }

    private void requireText(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new BusinessException(message, "VALIDATION_ERROR");
        }
    }

    private BigDecimal decimal(Object value) {
        if (value == null) return null;
        if (value instanceof BigDecimal bigDecimal) return bigDecimal;
        if (value instanceof Number number) return BigDecimal.valueOf(number.doubleValue());
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private BigDecimal defaultDecimal(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private Integer defaultInt(Integer value, Integer fallback) {
        return value == null ? fallback : value;
    }

    private boolean defaultBoolean(Boolean value, boolean fallback) {
        return value == null ? fallback : value;
    }

    private Long defaultLong(Long value, Long fallback) {
        return value == null ? fallback : value;
    }

    private LocalDate defaultLocalDate(LocalDate value, LocalDate fallback) {
        return value == null ? fallback : value;
    }

    private <E extends Enum<E>> E defaultEnum(E value, E fallback) {
        return value == null ? fallback : value;
    }

    private String defaultText(String value, String fallback) {
        return StringUtils.hasText(value) ? value.trim() : fallback;
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String enumName(Enum<?> value) {
        return value == null ? null : value.name();
    }

    private List<String> copyList(List<String> values) {
        return values == null ? new ArrayList<>() : new ArrayList<>(values);
    }

    /**
     * Counts active contracts across all contract entity types that reference the given Islamic product template.
     * Uses JPQL queries against known contract entities with a try-catch fallback to 0 for entities that may not exist.
     */
    private int countActiveContracts(Long productTemplateId) {
        if (productTemplateId == null) {
            return 0;
        }
        int total = 0;
        // Query each known contract entity type that has an islamicProductTemplateId field
        String[] entityNames = {
                "MurabahaContract", "IjarahContract", "MusharakahContract",
                "WakalaDepositAccount", "QardHasanAccount", "WadiahAccount", "MudarabahAccount"
        };
        for (String entityName : entityNames) {
            try {
                Long count = entityManager.createQuery(
                        "SELECT COUNT(c) FROM " + entityName + " c WHERE c.islamicProductTemplateId = :templateId",
                        Long.class
                ).setParameter("templateId", productTemplateId).getSingleResult();
                total += count.intValue();
            } catch (Exception ex) {
                // Entity may not exist or may not have the expected field - skip silently
                log.trace("Unable to count contracts for entity {}: {}", entityName, ex.getMessage());
            }
        }
        return total;
    }

    private String safeDecimal(BigDecimal value) {
        return value == null ? "0" : value.stripTrailingZeros().toPlainString();
    }

    private LocalDate fatwaEffectiveDateFromApprovedAt(FatwaRecord fatwa) {
        if (fatwa == null) return null;
        return fatwa.getEffectiveDate();
    }
}
