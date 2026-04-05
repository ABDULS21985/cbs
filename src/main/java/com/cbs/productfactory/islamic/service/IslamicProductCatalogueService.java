package com.cbs.productfactory.islamic.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.productfactory.islamic.dto.IslamicProductCatalogueEntry;
import com.cbs.productfactory.islamic.dto.IslamicProductCatalogueSummary;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IslamicProductCatalogueService {

    private final IslamicProductTemplateRepository productRepository;
    private final IslamicProductService islamicProductService;
        private final CustomerRepository customerRepository;

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
        List<IslamicProductCatalogueEntry> filtered = productRepository
                .findAll(buildCatalogueSpecification(category, contractType, complianceStatus, search, includeInactive), resolveSort(pageable))
                .stream()
                .map(islamicProductService::toCatalogueEntry)
                .filter(entry -> !StringUtils.hasText(country) || entry.getEligibleCountries().isEmpty()
                        || entry.getEligibleCountries().stream().anyMatch(code -> code.equalsIgnoreCase(country)))
                .filter(entry -> !StringUtils.hasText(currency) || entry.getCurrencies().stream().anyMatch(code -> code.equalsIgnoreCase(currency)))
                .filter(entry -> !StringUtils.hasText(customerType) || entry.getEligibleCustomerTypes().stream().anyMatch(type -> type.equalsIgnoreCase(customerType)))
                .filter(entry -> minAmount == null || parseMinAmount(entry.getAmountRange()).compareTo(minAmount) >= 0)
                .filter(entry -> maxAmount == null || parseMaxAmount(entry.getAmountRange()).compareTo(maxAmount) <= 0)
                .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        List<IslamicProductCatalogueEntry> pageContent = start >= filtered.size() ? List.of() : filtered.subList(start, end);
        return new PageImpl<>(pageContent, pageable, filtered.size());
    }

    public IslamicProductCatalogueEntry getProductDetail(String productCode) {
        IslamicProductTemplate product = productRepository.findByProductCodeIgnoreCase(productCode)
                                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductTemplate", "productCode", productCode));
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
                        byCategory.put(entry.getCategory().name(), byCategory.getOrDefault(entry.getCategory().name(), 0) + 1);
                        byContractType.put(entry.getContractTypeCode(), byContractType.getOrDefault(entry.getContractTypeCode(), 0) + 1);
                        byCompliance.put(entry.getComplianceStatus().name(), byCompliance.getOrDefault(entry.getComplianceStatus().name(), 0) + 1);
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
        List<String> requestedCodes = normalizeRequestedCodes(productCodes);
        if (requestedCodes.isEmpty()) {
            return List.of();
        }

        List<IslamicProductTemplate> products = productRepository.findAll(
                byProductCodes(requestedCodes),
                Sort.by(Sort.Direction.ASC, "productCode"));
        Map<String, IslamicProductCatalogueEntry> entriesByCode = new LinkedHashMap<>();
        for (IslamicProductTemplate product : products) {
            entriesByCode.put(product.getProductCode().toLowerCase(Locale.ROOT), islamicProductService.toCatalogueEntry(product));
        }

        List<String> missingCodes = requestedCodes.stream()
                .filter(code -> !entriesByCode.containsKey(code))
                .toList();
        if (!missingCodes.isEmpty()) {
            throw new BusinessException(
                    "Products not found for comparison: " + String.join(", ", missingCodes),
                    "PRODUCT_COMPARE_NOT_FOUND");
        }

        return requestedCodes.stream()
                .map(entriesByCode::get)
                .toList();
    }

    public List<IslamicProductCatalogueEntry> getRecommendedProducts(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));

        return getAvailableProducts(customerId).stream()
                .sorted(Comparator
                        .comparingInt((IslamicProductCatalogueEntry entry) -> recommendationScore(entry, customer))
                        .reversed()
                        .thenComparing(IslamicProductCatalogueEntry::isAvailableForNewContracts, Comparator.reverseOrder())
                        .thenComparing(IslamicProductCatalogueEntry::getProductCode))
                .limit(10)
                .toList();
    }

    private Specification<IslamicProductTemplate> buildCatalogueSpecification(
            String category,
            String contractType,
            String complianceStatus,
            String search,
            boolean includeInactive
    ) {
        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            LocalDate today = LocalDate.now();
            if (!includeInactive) {
                predicates.add(cb.equal(root.get("status"), IslamicDomainEnums.IslamicProductStatus.ACTIVE));
                predicates.add(cb.lessThanOrEqualTo(root.get("effectiveFrom"), today));
                predicates.add(cb.or(cb.isNull(root.get("effectiveTo")), cb.greaterThanOrEqualTo(root.get("effectiveTo"), today)));
            }
            if (StringUtils.hasText(category)) {
                predicates.add(cb.equal(cb.upper(root.get("productCategory").as(String.class)), category.trim().toUpperCase(Locale.ROOT)));
            }
            if (StringUtils.hasText(contractType)) {
                predicates.add(cb.equal(cb.upper(root.get("contractType").get("code")), contractType.trim().toUpperCase(Locale.ROOT)));
            }
            if (StringUtils.hasText(complianceStatus)) {
                predicates.add(cb.equal(cb.upper(root.get("shariahComplianceStatus").as(String.class)), complianceStatus.trim().toUpperCase(Locale.ROOT)));
            }
            if (StringUtils.hasText(search)) {
                String like = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("productCode")), like),
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(root.get("description")), like),
                        cb.like(cb.lower(root.get("subCategory")), like),
                        cb.like(cb.lower(root.get("contractType").get("code")), like),
                        cb.like(cb.lower(root.get("contractType").get("name")), like)
                ));
            }
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }

    private Sort resolveSort(Pageable pageable) {
        return pageable.getSort().isSorted() ? pageable.getSort() : Sort.by(Sort.Direction.ASC, "productCode");
    }

    private Specification<IslamicProductTemplate> byProductCodes(List<String> productCodes) {
        return (root, query, cb) -> cb.lower(root.get("productCode")).in(productCodes);
    }

    private List<String> normalizeRequestedCodes(List<String> productCodes) {
        if (productCodes == null) {
            return List.of();
        }
        return productCodes.stream()
                .filter(StringUtils::hasText)
                .map(code -> code.trim().toLowerCase(Locale.ROOT))
                .distinct()
                .limit(5)
                .toList();
    }

    private int recommendationScore(IslamicProductCatalogueEntry entry, Customer customer) {
        int score = 0;
        if (entry.isAvailableForNewContracts()) {
            score += 35;
        }
        if (entry.getComplianceStatus() == IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT) {
            score += 25;
        } else if (entry.getComplianceStatus() == IslamicDomainEnums.ShariahComplianceStatus.FATWA_ISSUED) {
            score += 18;
        }
        if (entry.isHasActiveFatwa()) {
            score += 15;
        }
        if (customer.getCustomerType() != null && entry.getEligibleCustomerTypes() != null) {
            String customerType = customer.getCustomerType().name();
            if (entry.getEligibleCustomerTypes().stream().anyMatch(type -> type.equalsIgnoreCase(customerType))) {
                score += 10;
                if (entry.getEligibleCustomerTypes().size() == 1) {
                    score += 4;
                }
            }
        }
        if (StringUtils.hasText(customer.getCountryOfResidence()) && entry.getEligibleCountries() != null
                && entry.getEligibleCountries().stream().anyMatch(country -> country.equalsIgnoreCase(customer.getCountryOfResidence()))) {
            score += 6;
            if (entry.getEligibleCountries().size() == 1) {
                score += 2;
            }
        }
        if (entry.getNextShariahReview() == null || !entry.getNextShariahReview().isBefore(LocalDate.now())) {
            score += 5;
        }
        return score;
    }

    private BigDecimal parseMinAmount(String amountRange) {
        if (!StringUtils.hasText(amountRange)) {
            return BigDecimal.ZERO;
        }
                String first = sanitizedAmountRange(amountRange).split("-")[0].trim();
        return first.isBlank() ? BigDecimal.ZERO : new BigDecimal(first);
    }

        private BigDecimal parseMaxAmount(String amountRange) {
                if (!StringUtils.hasText(amountRange)) {
                        return BigDecimal.valueOf(Long.MAX_VALUE);
                }
                String[] parts = sanitizedAmountRange(amountRange).split("-");
                String last = parts[parts.length - 1].trim();
                return last.isBlank() ? BigDecimal.valueOf(Long.MAX_VALUE) : new BigDecimal(last);
        }

        private String sanitizedAmountRange(String amountRange) {
                return amountRange.replaceAll("[^0-9. -]", "").trim();
        }
}