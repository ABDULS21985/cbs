package com.cbs.productfactory.islamic.service;

import com.cbs.productfactory.islamic.dto.IslamicProductCatalogueEntry;
import com.cbs.productfactory.islamic.dto.IslamicProductCatalogueSummary;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IslamicProductCatalogueService {

    private final IslamicProductTemplateRepository productRepository;
    private final IslamicProductService islamicProductService;

    public Page<IslamicProductCatalogueEntry> getCatalogue(
            String category,
            String contractType,
            String complianceStatus,
            String country,
            String currency,
            String customerType,
            BigDecimal minAmount,
            BigDecimal maxAmount,
            String search,
            boolean includeInactive,
            Pageable pageable
    ) {
        List<IslamicProductCatalogueEntry> filtered = productRepository.findAll().stream()
                .filter(product -> includeInactive || product.getStatus() == IslamicDomainEnums.IslamicProductStatus.ACTIVE)
                .map(islamicProductService::toCatalogueEntry)
                .filter(entry -> !StringUtils.hasText(category) || entry.getCategory().name().equalsIgnoreCase(category))
                .filter(entry -> !StringUtils.hasText(contractType) || entry.getContractTypeCode().equalsIgnoreCase(contractType))
                .filter(entry -> !StringUtils.hasText(complianceStatus) || entry.getComplianceStatus().name().equalsIgnoreCase(complianceStatus))
                .filter(entry -> !StringUtils.hasText(country) || entry.getEligibleCountries().isEmpty()
                        || entry.getEligibleCountries().stream().anyMatch(code -> code.equalsIgnoreCase(country)))
                .filter(entry -> !StringUtils.hasText(currency) || entry.getCurrencies().stream().anyMatch(code -> code.equalsIgnoreCase(currency)))
                .filter(entry -> !StringUtils.hasText(customerType) || entry.getEligibleCustomerTypes().stream().anyMatch(type -> type.equalsIgnoreCase(customerType)))
                .filter(entry -> minAmount == null || parseMinAmount(entry.getAmountRange()).compareTo(minAmount) >= 0)
                .filter(entry -> maxAmount == null || parseMinAmount(entry.getAmountRange()).compareTo(maxAmount) <= 0)
                .filter(entry -> !StringUtils.hasText(search)
                        || containsIgnoreCase(entry.getProductCode(), search)
                        || containsIgnoreCase(entry.getName(), search)
                        || containsIgnoreCase(entry.getDescription(), search)
                        || containsIgnoreCase(entry.getContractTypeName(), search))
                .sorted(Comparator.comparing(IslamicProductCatalogueEntry::getProductCode))
                .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        List<IslamicProductCatalogueEntry> pageContent = start >= filtered.size() ? List.of() : filtered.subList(start, end);
        return new PageImpl<>(pageContent, pageable, filtered.size());
    }

    public IslamicProductCatalogueEntry getProductDetail(String productCode) {
        IslamicProductTemplate product = productRepository.findByProductCodeIgnoreCase(productCode)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("IslamicProductTemplate", "productCode", productCode));
        return islamicProductService.toCatalogueEntry(product);
    }

    public List<IslamicProductCatalogueEntry> getAvailableProducts(Long customerId) {
        return islamicProductService.getEligibleProducts(customerId).stream()
                .map(response -> islamicProductService.toCatalogueEntry(islamicProductService.getProductEntity(response.getId())))
                .filter(IslamicProductCatalogueEntry::isAvailableForNewContracts)
                .sorted(Comparator.comparing(IslamicProductCatalogueEntry::getContractTypeCode)
                        .thenComparing(IslamicProductCatalogueEntry::getProductCode))
                .toList();
    }

    public IslamicProductCatalogueSummary getCatalogueSummary() {
        List<IslamicProductCatalogueEntry> entries = productRepository.findAll().stream()
                .map(islamicProductService::toCatalogueEntry)
                .toList();
        Map<String, Integer> byCategory = new LinkedHashMap<>();
        Map<String, Integer> byContractType = new LinkedHashMap<>();
        Map<String, Integer> byCompliance = new LinkedHashMap<>();

        for (IslamicProductCatalogueEntry entry : entries) {
            byCategory.merge(entry.getCategory().name(), 1, Integer::sum);
            byContractType.merge(entry.getContractTypeCode(), 1, Integer::sum);
            byCompliance.merge(entry.getComplianceStatus().name(), 1, Integer::sum);
        }

        return IslamicProductCatalogueSummary.builder()
                .totalProducts(entries.size())
                .activeProducts((int) entries.stream().filter(entry -> entry.getStatus() == IslamicDomainEnums.IslamicProductStatus.ACTIVE).count())
                .compliantProducts((int) entries.stream().filter(entry -> entry.getComplianceStatus() == IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT).count())
                .pendingFatwaProducts((int) entries.stream().filter(entry -> entry.getComplianceStatus() == IslamicDomainEnums.ShariahComplianceStatus.PENDING_FATWA).count())
                .suspendedProducts((int) entries.stream().filter(entry -> entry.getStatus() == IslamicDomainEnums.IslamicProductStatus.SUSPENDED).count())
                .productsByCategory(byCategory)
                .productsByContractType(byContractType)
                .productsByComplianceStatus(byCompliance)
                .build();
    }

    public List<IslamicProductCatalogueEntry> compareProducts(List<String> productCodes) {
        return productCodes.stream()
                .limit(5)
                .map(this::getProductDetail)
                .toList();
    }

    public List<IslamicProductCatalogueEntry> getRecommendedProducts(Long customerId) {
        return getAvailableProducts(customerId).stream()
                .sorted(Comparator.comparing(IslamicProductCatalogueEntry::getComplianceStatus)
                        .thenComparing(IslamicProductCatalogueEntry::getProductCode))
                .limit(10)
                .toList();
    }

    private boolean containsIgnoreCase(String value, String search) {
        return StringUtils.hasText(value) && value.toLowerCase(Locale.ROOT).contains(search.toLowerCase(Locale.ROOT));
    }

    private BigDecimal parseMinAmount(String amountRange) {
        if (!StringUtils.hasText(amountRange)) {
            return BigDecimal.ZERO;
        }
        String sanitized = amountRange.replaceAll("[^0-9. -]", "").trim();
        String first = sanitized.split("-")[0].trim();
        return first.isBlank() ? BigDecimal.ZERO : new BigDecimal(first);
    }
}