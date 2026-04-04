package com.cbs.productfactory.islamic.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.productfactory.islamic.dto.IslamicProductRequest;
import com.cbs.productfactory.islamic.entity.IslamicContractType;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicContractTypeRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IslamicContractTypeService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };

    private final IslamicContractTypeRepository contractTypeRepository;
    private final CurrentTenantResolver currentTenantResolver;
    private final ObjectMapper objectMapper;

    public IslamicContractType getById(Long id) {
        IslamicContractType contractType = contractTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicContractType", "id", id));
        validateTenantAccess(contractType.getTenantId());
        return contractType;
    }

    public IslamicContractType getByCode(String code) {
        return resolveByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicContractType", "code", code));
    }

    public List<IslamicContractType> getAllActive() {
        return deduplicate(contractTypeRepository.findByStatusOrderByDisplayOrderAsc(
                IslamicDomainEnums.ContractTypeStatus.ACTIVE));
    }

    public List<IslamicContractType> getByCategory(IslamicDomainEnums.ContractCategory category) {
        return deduplicate(contractTypeRepository.findByCategoryOrderByDisplayOrderAsc(category)).stream()
                .filter(item -> item.getStatus() == IslamicDomainEnums.ContractTypeStatus.ACTIVE)
                .toList();
    }

    public List<IslamicContractType> getForProductCategory(String productCategory) {
        String normalized = normalize(productCategory);
        return getAllActive().stream()
                .filter(item -> item.getApplicableCategories().stream()
                        .map(this::normalize)
                        .anyMatch(normalized::equals))
                .toList();
    }

    public List<String> getRequiredProductFields(String contractTypeCode) {
        return new ArrayList<>(getByCode(contractTypeCode).getRequiredProductFields());
    }

    @Transactional
    public IslamicContractType create(IslamicContractType contractType) {
        String code = normalize(contractType.getCode());
        if (!StringUtils.hasText(code)) {
            throw new BusinessException("Contract type code is required", "INVALID_CONTRACT_TYPE");
        }
        if (resolveByCode(code).isPresent()) {
            throw new BusinessException("Contract type already exists: " + code, "DUPLICATE_CONTRACT_TYPE");
        }
        contractType.setCode(code);
        if (contractType.getStatus() == null) {
            contractType.setStatus(IslamicDomainEnums.ContractTypeStatus.ACTIVE);
        }
        if (contractType.getDisplayOrder() == null) {
            contractType.setDisplayOrder(100);
        }
        if (contractType.getTenantId() == null) {
            contractType.setTenantId(currentTenantResolver.getCurrentTenantId());
        }
        return contractTypeRepository.save(contractType);
    }

    @Transactional
    public IslamicContractType update(Long id, IslamicContractType request) {
        IslamicContractType current = getById(id);
        if (StringUtils.hasText(request.getCode())) {
            String incomingCode = normalize(request.getCode());
            resolveByCode(incomingCode)
                    .filter(existing -> !Objects.equals(existing.getId(), current.getId()))
                    .ifPresent(existing -> {
                        throw new BusinessException("Contract type already exists: " + incomingCode,
                                "DUPLICATE_CONTRACT_TYPE");
                    });
            current.setCode(incomingCode);
        }
        if (StringUtils.hasText(request.getName())) current.setName(request.getName().trim());
        if (request.getNameAr() != null) current.setNameAr(trimToNull(request.getNameAr()));
        if (request.getDescription() != null) current.setDescription(trimToNull(request.getDescription()));
        if (request.getDescriptionAr() != null) current.setDescriptionAr(trimToNull(request.getDescriptionAr()));
        if (request.getCategory() != null) current.setCategory(request.getCategory());
        if (request.getShariahBasis() != null) current.setShariahBasis(trimToNull(request.getShariahBasis()));
        if (request.getShariahBasisAr() != null) current.setShariahBasisAr(trimToNull(request.getShariahBasisAr()));
        if (request.getRequiredProductFields() != null) current.setRequiredProductFields(copyList(request.getRequiredProductFields()));
        if (request.getShariahRuleGroupCode() != null) current.setShariahRuleGroupCode(trimToNull(request.getShariahRuleGroupCode()));
        if (request.getKeyShariahPrinciples() != null) current.setKeyShariahPrinciples(copyList(request.getKeyShariahPrinciples()));
        if (request.getKeyShariahPrinciplesAr() != null) current.setKeyShariahPrinciplesAr(copyList(request.getKeyShariahPrinciplesAr()));
        if (request.getProhibitions() != null) current.setProhibitions(copyList(request.getProhibitions()));
        if (request.getProhibitionsAr() != null) current.setProhibitionsAr(copyList(request.getProhibitionsAr()));
        if (request.getAccountingTreatment() != null) current.setAccountingTreatment(request.getAccountingTreatment());
        if (request.getAaoifiStandard() != null) current.setAaoifiStandard(trimToNull(request.getAaoifiStandard()));
        if (request.getIfsbStandard() != null) current.setIfsbStandard(trimToNull(request.getIfsbStandard()));
        if (request.getBaselTreatment() != null) current.setBaselTreatment(trimToNull(request.getBaselTreatment()));
        if (request.getApplicableCategories() != null) current.setApplicableCategories(copyList(request.getApplicableCategories()));
        if (request.getIconCode() != null) current.setIconCode(trimToNull(request.getIconCode()));
        if (request.getDisplayOrder() != null) current.setDisplayOrder(request.getDisplayOrder());
        if (request.getStatus() != null) current.setStatus(request.getStatus());
        return contractTypeRepository.save(current);
    }

    public void validateProductAgainstContractType(IslamicProductRequest request) {
        IslamicContractType contractType = getById(requiredContractTypeId(request));
        validateProductAgainstContractType(request, contractType);
    }

    public void validateProductAgainstContractType(IslamicProductRequest request, IslamicContractType contractType) {
        if (contractType.getStatus() != IslamicDomainEnums.ContractTypeStatus.ACTIVE) {
            throw new BusinessException("Contract type must be ACTIVE: " + contractType.getCode(),
                    "INACTIVE_CONTRACT_TYPE");
        }

        Map<String, Object> values = objectMapper.convertValue(request, MAP_TYPE);
        for (String requiredField : safeList(contractType.getRequiredProductFields())) {
            if (isMissing(values.get(requiredField))) {
                throw new BusinessException("Field " + requiredField + " is required for contract type "
                        + contractType.getCode(), "MISSING_CONTRACT_FIELD");
            }
        }
        enforceContractRules(contractType.getCode(), values);
    }

    public void validateProductAgainstContractType(IslamicProductTemplate product) {
        IslamicProductRequest request = objectMapper.convertValue(product, IslamicProductRequest.class);
        request.setContractTypeId(product.getContractType().getId());
        request.setFatwaId(product.getActiveFatwaId());
        validateProductAgainstContractType(request, product.getContractType());
    }

    private void enforceContractRules(String contractCode, Map<String, Object> values) {
        switch (normalize(contractCode)) {
            case "MURABAHA" -> {
                requirePositive(values, "markupRate", "Murabaha requires markupRate > 0");
                requireBoolean(values, "costPriceRequired", true,
                        "Murabaha requires costPriceRequired=true");
                requireBoolean(values, "sellingPriceImmutable", true,
                        "Murabaha requires sellingPriceImmutable=true");
                requireBoolean(values, "latePenaltyToCharity", true,
                        "Murabaha requires latePenaltyToCharity=true");
                requireText(values, "charityGlAccountCode",
                        "Murabaha requires charityGlAccountCode");
            }
            case "IJARAH" -> {
                requirePresent(values, "assetOwnershipDuringTenor", "Ijarah requires assetOwnershipDuringTenor");
                requirePresent(values, "maintenanceResponsibility", "Ijarah requires maintenanceResponsibility");
                requirePresent(values, "insuranceResponsibility", "Ijarah requires insuranceResponsibility");
            }
            case "MUDARABAH" -> {
                requirePresent(values, "lossSharingMethod", "Mudarabah requires lossSharingMethod");
                BigDecimal bank = decimal(values.get("profitSharingRatioBank"));
                BigDecimal customer = decimal(values.get("profitSharingRatioCustomer"));
                if (bank == null || customer == null || bank.add(customer).compareTo(new BigDecimal("100")) != 0) {
                    throw new BusinessException(
                            "Mudarabah requires profitSharingRatioBank + profitSharingRatioCustomer = 100",
                            "INVALID_PROFIT_SHARING");
                }
            }
            case "MUSHARAKAH" -> {
                BigDecimal bank = decimal(values.get("bankSharePercentage"));
                BigDecimal customer = decimal(values.get("customerSharePercentage"));
                if (bank == null || customer == null || bank.add(customer).compareTo(new BigDecimal("100")) != 0) {
                    throw new BusinessException(
                            "Musharakah requires bankSharePercentage + customerSharePercentage = 100",
                            "INVALID_SHARE_SPLIT");
                }
                if (Boolean.TRUE.equals(values.get("diminishingSchedule"))) {
                    requirePresent(values, "diminishingFrequency",
                            "Diminishing Musharakah requires diminishingFrequency");
                    requirePresent(values, "diminishingUnitsTotal",
                            "Diminishing Musharakah requires diminishingUnitsTotal");
                }
            }
            case "TAKAFUL" -> {
                requirePresent(values, "takafulModel", "Takaful requires takafulModel");
                requireBoolean(values, "takafulPoolSeparation", true,
                        "Takaful requires takafulPoolSeparation=true");
                if ("WAKALAH".equals(normalize(String.valueOf(values.get("takafulModel"))))) {
                    requirePositive(values, "wakalahFeePercentage",
                            "Wakalah Takaful requires wakalahFeePercentage > 0");
                }
            }
            case "WADIAH" -> {
                BigDecimal bank = decimal(values.get("profitSharingRatioBank"));
                BigDecimal customer = decimal(values.get("profitSharingRatioCustomer"));
                if ((bank != null && bank.compareTo(BigDecimal.ZERO) > 0)
                        || (customer != null && customer.compareTo(BigDecimal.ZERO) > 0)) {
                    throw new BusinessException("Wadiah products cannot define profit sharing ratios",
                            "INVALID_WADIAH_PROFIT_SHARING");
                }
            }
            default -> {
            }
        }
    }

    private Optional<IslamicContractType> resolveByCode(String code) {
        String normalized = normalize(code);
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        List<IslamicContractType> candidates = contractTypeRepository.findAll().stream()
                .filter(item -> normalized.equals(normalize(item.getCode())))
                .filter(item -> item.getTenantId() == null || Objects.equals(item.getTenantId(), tenantId))
                .sorted(Comparator.comparing((IslamicContractType item) -> item.getTenantId() == null))
                .toList();
        return candidates.stream().findFirst();
    }

    private List<IslamicContractType> deduplicate(List<IslamicContractType> items) {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        LinkedHashMap<String, IslamicContractType> resolved = new LinkedHashMap<>();
        items.stream()
                .filter(item -> item.getTenantId() == null || Objects.equals(item.getTenantId(), tenantId))
                .sorted(Comparator.comparing((IslamicContractType item) -> item.getTenantId() == null)
                        .thenComparing(IslamicContractType::getDisplayOrder))
                .forEach(item -> resolved.putIfAbsent(normalize(item.getCode()), item));
        return new ArrayList<>(resolved.values());
    }

    private void validateTenantAccess(Long tenantId) {
        Long currentTenantId = currentTenantResolver.getCurrentTenantId();
        if (currentTenantId != null && tenantId != null && !Objects.equals(currentTenantId, tenantId)) {
            throw new BusinessException("Contract type does not belong to the current tenant",
                    "TENANT_ACCESS_DENIED");
        }
    }

    private Long requiredContractTypeId(IslamicProductRequest request) {
        if (request.getContractTypeId() == null) {
            throw new BusinessException("contractTypeId is required", "MISSING_CONTRACT_TYPE");
        }
        return request.getContractTypeId();
    }

    private void requirePresent(Map<String, Object> values, String key, String message) {
        if (isMissing(values.get(key))) {
            throw new BusinessException(message, "CONTRACT_VALIDATION_FAILED");
        }
    }

    private void requireText(Map<String, Object> values, String key, String message) {
        Object value = values.get(key);
        if (!(value instanceof String text) || !StringUtils.hasText(text)) {
            throw new BusinessException(message, "CONTRACT_VALIDATION_FAILED");
        }
    }

    private void requirePositive(Map<String, Object> values, String key, String message) {
        BigDecimal value = decimal(values.get(key));
        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException(message, "CONTRACT_VALIDATION_FAILED");
        }
    }

    private void requireBoolean(Map<String, Object> values, String key, boolean expected, String message) {
        Object value = values.get(key);
        if (!(value instanceof Boolean bool) || bool != expected) {
            throw new BusinessException(message, "CONTRACT_VALIDATION_FAILED");
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

    private boolean isMissing(Object value) {
        if (value == null) return true;
        if (value instanceof String text) return !StringUtils.hasText(text);
        if (value instanceof Collection<?> collection) return collection.isEmpty();
        return false;
    }

    private List<String> safeList(List<String> values) {
        return values == null ? List.of() : values;
    }

    private List<String> copyList(List<String> values) {
        return values == null ? new ArrayList<>() : new ArrayList<>(values);
    }

    private String normalize(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}