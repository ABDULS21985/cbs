package com.cbs.portal.islamic.service;

import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.productfactory.islamic.dto.IslamicProductCatalogueEntry;
import com.cbs.productfactory.islamic.service.IslamicProductCatalogueService;
import com.cbs.productfactory.islamic.service.IslamicProductService;
import com.cbs.portal.islamic.dto.IslamicPortalDtos.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

/**
 * BFF for Capability 3 — Product Marketplace.
 * Loads Islamic product catalogue, applies Shariah badges, key features per
 * contract type, and eligibility checks for the portal UI.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IslamicProductMarketplaceService {

    private final IslamicProductCatalogueService catalogueService;
    private final IslamicProductService productService;
    private final IslamicTerminologyService terminologyService;
    private final HijriCalendarService hijriCalendarService;

    // ── Marketplace Overview ─────────────────────────────────────────────

    /**
     * Loads the product catalogue, filters by category/contract type, and returns
     * a marketplace view with featured products and category groupings.
     */
    public IslamicProductMarketplaceDTO getMarketplace(Long customerId, String language,
                                                        String category, String contractType) {
        Page<IslamicProductCatalogueEntry> page = catalogueService.getCatalogue(
                category, contractType, null, null, null, null,
                null, null, null, false, PageRequest.of(0, 100));

        List<ProductCardDTO> allProducts = page.getContent().stream()
                .map(entry -> toProductCard(entry, language))
                .toList();

        List<ProductCardDTO> featured = allProducts.stream()
                .filter(ProductCardDTO::isFeatured)
                .toList();

        Map<String, List<ProductCardDTO>> byCategory = allProducts.stream()
                .filter(p -> StringUtils.hasText(p.getCategory()))
                .collect(Collectors.groupingBy(ProductCardDTO::getCategory));

        List<ProductCategoryDTO> categories = byCategory.entrySet().stream()
                .map(e -> ProductCategoryDTO.builder()
                        .code(e.getKey())
                        .name(e.getKey())
                        .productCount(e.getValue().size())
                        .build())
                .toList();

        return IslamicProductMarketplaceDTO.builder()
                .categories(categories)
                .featuredProducts(featured)
                .allProducts(allProducts)
                .build();
    }

    // ── Single Product Detail ────────────────────────────────────────────

    /**
     * Single product with full Shariah badge and key features.
     */
    public ProductCardDTO getProductDetail(String productCode, Long customerId, String language) {
        Page<IslamicProductCatalogueEntry> page = catalogueService.getCatalogue(
                null, null, null, null, null, null,
                null, null, productCode, false, PageRequest.of(0, 1));

        IslamicProductCatalogueEntry entry = page.getContent().stream()
                .filter(e -> productCode.equals(e.getProductCode()))
                .findFirst()
                .orElse(null);

        if (entry == null) {
            // fallback: try loading all and filtering
            Page<IslamicProductCatalogueEntry> allPage = catalogueService.getCatalogue(
                    null, null, null, null, null, null,
                    null, null, null, false, PageRequest.of(0, 500));
            entry = allPage.getContent().stream()
                    .filter(e -> productCode.equals(e.getProductCode()))
                    .findFirst()
                    .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException(
                            "IslamicProduct", "productCode", productCode));
        }

        return toProductCard(entry, language);
    }

    // ── Product Comparison ───────────────────────────────────────────────

    /**
     * Compare up to 4 products side by side.
     */
    public ProductComparisonDTO compareProducts(List<String> productCodes, String language) {
        if (productCodes == null || productCodes.isEmpty()) {
            return ProductComparisonDTO.builder()
                    .products(Collections.emptyList())
                    .comparisonRows(Collections.emptyList())
                    .build();
        }

        List<String> codes = productCodes.size() > 4 ? productCodes.subList(0, 4) : productCodes;

        List<ProductCardDTO> products = codes.stream()
                .map(code -> {
                    try {
                        return getProductDetail(code, null, language);
                    } catch (Exception ex) {
                        log.warn("Product {} not found for comparison", code);
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();

        List<ComparisonRow> rows = buildComparisonRows(products, language);

        return ProductComparisonDTO.builder()
                .products(products)
                .comparisonRows(rows)
                .build();
    }

    // ── Recommended Products ─────────────────────────────────────────────

    /**
     * Returns recommended products for the customer. Currently returns featured
     * products as recommendations.
     */
    public List<ProductCardDTO> getRecommendedProducts(Long customerId, String language) {
        try {
            Page<IslamicProductCatalogueEntry> page = catalogueService.getCatalogue(
                    null, null, null, null, null, null,
                    null, null, null, false, PageRequest.of(0, 50));

            return page.getContent().stream()
                    .filter(IslamicProductCatalogueEntry::isAvailableForNewContracts)
                    .limit(6)
                    .map(entry -> toProductCard(entry, language))
                    .toList();
        } catch (Exception ex) {
            log.warn("Failed to load recommended products for customer {}: {}", customerId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    // ── Mapping ──────────────────────────────────────────────────────────

    private ProductCardDTO toProductCard(IslamicProductCatalogueEntry entry, String language) {
        String contractType = entry.getContractTypeCode() != null ? entry.getContractTypeCode() : "";

        List<KeyFeatureDTO> keyFeatures = generateKeyFeatures(contractType, language);
        List<ShariahBadgeDTO> badges = generateShariahBadges(entry, language);

        boolean featured = entry.isAvailableForNewContracts() && entry.isHasActiveFatwa();

        return ProductCardDTO.builder()
                .productCode(entry.getProductCode())
                .productName(entry.getName())
                .productNameAr(entry.getNameAr())
                .contractType(contractType)
                .category(entry.getCategory() != null ? entry.getCategory().name() : null)
                .shortDescription(entry.getDescription())
                .shortDescriptionAr(entry.getDescriptionAr())
                .fullDescription(entry.getDescription())
                .fullDescriptionAr(entry.getDescriptionAr())
                .keyFeatures(keyFeatures)
                .shariahBadges(badges)
                .indicativeRate(entry.getIndicativeRate())
                .currency(entry.getCurrencies() != null && !entry.getCurrencies().isEmpty()
                        ? entry.getCurrencies().get(0) : "SAR")
                .featured(featured)
                .availableOnline(entry.isAvailableForNewContracts())
                .build();
    }

    /**
     * Generate key features based on the contract type.
     */
    private List<KeyFeatureDTO> generateKeyFeatures(String contractType, String language) {
        return switch (safeUpper(contractType)) {
            case "WADIAH" -> List.of(
                    feature("shield", "Principal guaranteed",
                            "\u0631\u0623\u0633 \u0627\u0644\u0645\u0627\u0644 \u0645\u0636\u0645\u0648\u0646"),
                    feature("gift", "Discretionary Hibah",
                            "\u0647\u0628\u0629 \u062a\u0642\u062f\u064a\u0631\u064a\u0629"),
                    feature("lock", "Based on Wadiah Yad Dhamanah",
                            "\u0628\u0646\u0627\u0621\u064b \u0639\u0644\u0649 \u0627\u0644\u0648\u062f\u064a\u0639\u0629 \u0628\u064a\u062f \u0627\u0644\u0636\u0645\u0627\u0646")
            );
            case "MUDARABAH" -> List.of(
                    feature("trending-up", "Earn actual profit",
                            "\u0627\u0631\u0628\u062d \u0631\u0628\u062d\u064b\u0627 \u0641\u0639\u0644\u064a\u064b\u0627"),
                    feature("percent", "Profit sharing ratio",
                            "\u0646\u0633\u0628\u0629 \u062a\u0642\u0627\u0633\u0645 \u0627\u0644\u0623\u0631\u0628\u0627\u062d"),
                    feature("shield", "Protected by PER",
                            "\u0645\u062d\u0645\u064a \u0628\u0627\u062d\u062a\u064a\u0627\u0637\u064a \u0645\u0639\u0627\u062f\u0644\u0629 \u0627\u0644\u0623\u0631\u0628\u0627\u062d")
            );
            case "MURABAHA" -> List.of(
                    feature("file-text", "Cost-plus financing \u2014 cost disclosed",
                            "\u062a\u0645\u0648\u064a\u0644 \u0628\u0627\u0644\u0645\u0631\u0627\u0628\u062d\u0629 \u2014 \u0627\u0644\u062a\u0643\u0644\u0641\u0629 \u0645\u0639\u0644\u0646\u0629"),
                    feature("lock", "Fixed selling price",
                            "\u0633\u0639\u0631 \u0628\u064a\u0639 \u062b\u0627\u0628\u062a"),
                    feature("heart", "Late charges to charity",
                            "\u063a\u0631\u0627\u0645\u0627\u062a \u0627\u0644\u062a\u0623\u062e\u064a\u0631 \u0644\u0644\u062e\u064a\u0631")
            );
            case "IJARAH" -> List.of(
                    feature("home", "Bank owns asset during lease",
                            "\u0627\u0644\u0628\u0646\u0643 \u064a\u0645\u0644\u0643 \u0627\u0644\u0623\u0635\u0644 \u062e\u0644\u0627\u0644 \u0627\u0644\u0625\u062c\u0627\u0631\u0629"),
                    feature("key", "You pay rental for use",
                            "\u062a\u062f\u0641\u0639 \u0625\u064a\u062c\u0627\u0631\u064b\u0627 \u0644\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645"),
                    feature("tool", "Major maintenance by bank",
                            "\u0627\u0644\u0635\u064a\u0627\u0646\u0629 \u0627\u0644\u0643\u0628\u0631\u0649 \u0639\u0644\u0649 \u0627\u0644\u0628\u0646\u0643")
            );
            case "MUSHARAKAH" -> List.of(
                    feature("users", "Joint ownership",
                            "\u0645\u0644\u0643\u064a\u0629 \u0645\u0634\u062a\u0631\u0643\u0629"),
                    feature("trending-down", "Diminishing bank share",
                            "\u062d\u0635\u0629 \u0627\u0644\u0628\u0646\u0643 \u0645\u062a\u0646\u0627\u0642\u0635\u0629"),
                    feature("dollar-sign", "Rental decreases as you buy units",
                            "\u0627\u0644\u0625\u064a\u062c\u0627\u0631 \u064a\u0646\u062e\u0641\u0636 \u0643\u0644\u0645\u0627 \u0627\u0634\u062a\u0631\u064a\u062a \u0648\u062d\u062f\u0627\u062a")
            );
            default -> Collections.emptyList();
        };
    }

    private static KeyFeatureDTO feature(String icon, String textEn, String textAr) {
        return KeyFeatureDTO.builder().icon(icon).text(textEn).textAr(textAr).build();
    }

    private List<ShariahBadgeDTO> generateShariahBadges(IslamicProductCatalogueEntry entry, String language) {
        List<ShariahBadgeDTO> badges = new ArrayList<>();

        if (entry.isHasActiveFatwa()) {
            badges.add(ShariahBadgeDTO.builder()
                    .code("FATWA")
                    .label("Fatwa Approved")
                    .labelAr("\u0645\u0639\u062a\u0645\u062f \u0628\u0641\u062a\u0648\u0649")
                    .tooltip("Approved by Shariah Supervisory Board — " +
                            Objects.toString(entry.getFatwaReference(), ""))
                    .tooltipAr("\u0645\u0639\u062a\u0645\u062f \u0645\u0646 \u0647\u064a\u0626\u0629 \u0627\u0644\u0631\u0642\u0627\u0628\u0629 \u0627\u0644\u0634\u0631\u0639\u064a\u0629")
                    .build());
        }

        if (StringUtils.hasText(entry.getAaoifiStandard())) {
            badges.add(ShariahBadgeDTO.builder()
                    .code("AAOIFI")
                    .label("AAOIFI Compliant")
                    .labelAr("\u0645\u062a\u0648\u0627\u0641\u0642 \u0645\u0639 \u0623\u064a\u0648\u0641\u064a")
                    .tooltip("Standard: " + entry.getAaoifiStandard())
                    .tooltipAr("\u0627\u0644\u0645\u0639\u064a\u0627\u0631: " + entry.getAaoifiStandard())
                    .build());
        }

        if (entry.getComplianceStatus() != null && "COMPLIANT".equals(entry.getComplianceStatus().name())) {
            badges.add(ShariahBadgeDTO.builder()
                    .code("SHARIAH_COMPLIANT")
                    .label("Shariah Compliant")
                    .labelAr("\u0645\u062a\u0648\u0627\u0641\u0642 \u0634\u0631\u0639\u064b\u0627")
                    .build());
        }

        return badges;
    }

    // ── Comparison Rows ──────────────────────────────────────────────────

    private List<ComparisonRow> buildComparisonRows(List<ProductCardDTO> products, String language) {
        List<ComparisonRow> rows = new ArrayList<>();

        rows.add(comparisonRow("Contract Type", "\u0646\u0648\u0639 \u0627\u0644\u0639\u0642\u062f", products,
                p -> p.getContractType() != null ? p.getContractType() : "-"));
        rows.add(comparisonRow("Indicative Rate", "\u0627\u0644\u0645\u0639\u062f\u0644 \u0627\u0644\u0625\u0631\u0634\u0627\u062f\u064a", products,
                p -> p.getIndicativeRate() != null ? p.getIndicativeRate().toPlainString() + "%" : "-"));
        rows.add(comparisonRow("Currency", "\u0627\u0644\u0639\u0645\u0644\u0629", products,
                p -> p.getCurrency() != null ? p.getCurrency() : "-"));
        rows.add(comparisonRow("Available Online", "\u0645\u062a\u0627\u062d \u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\u064b\u0627", products,
                p -> p.isAvailableOnline() ? "Yes" : "No"));
        rows.add(comparisonRow("Profit Method", "\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u0631\u0628\u062d", products,
                p -> profitMethodByType(safeUpper(p.getContractType()))));
        rows.add(comparisonRow("Ownership", "\u0627\u0644\u0645\u0644\u0643\u064a\u0629", products,
                p -> ownershipByType(safeUpper(p.getContractType()))));
        rows.add(comparisonRow("Shariah Standard", "\u0627\u0644\u0645\u0639\u064a\u0627\u0631 \u0627\u0644\u0634\u0631\u0639\u064a", products,
                p -> shariahStandardByType(safeUpper(p.getContractType()))));
        rows.add(comparisonRow("Risk Profile", "\u0645\u0644\u0641 \u0627\u0644\u0645\u062e\u0627\u0637\u0631", products,
                p -> riskProfileByType(safeUpper(p.getContractType()))));

        return rows;
    }

    private static String profitMethodByType(String type) {
        return switch (type) {
            case "WADIAH" -> "Discretionary Hibah";
            case "MUDARABAH" -> "Profit Sharing";
            case "MURABAHA" -> "Cost + Markup";
            case "IJARAH" -> "Rental Income";
            case "MUSHARAKAH" -> "Profit Sharing + Buyout";
            default -> "-";
        };
    }

    private static String ownershipByType(String type) {
        return switch (type) {
            case "MURABAHA" -> "Transfers at signing";
            case "IJARAH" -> "Bank-owned during lease";
            case "MUSHARAKAH" -> "Joint \u2014 diminishing";
            default -> "-";
        };
    }

    private static String shariahStandardByType(String type) {
        return switch (type) {
            case "MURABAHA" -> "FAS 28";
            case "IJARAH" -> "FAS 8";
            case "MUSHARAKAH" -> "FAS 4";
            case "WADIAH" -> "FAS 2";
            case "MUDARABAH" -> "FAS 3";
            default -> "-";
        };
    }

    private static String riskProfileByType(String type) {
        return switch (type) {
            case "MURABAHA" -> "Fixed payment";
            case "IJARAH" -> "Asset residual risk";
            case "MUSHARAKAH" -> "Market value exposure";
            case "WADIAH" -> "No risk — principal guaranteed";
            case "MUDARABAH" -> "Capital loss exposure";
            default -> "-";
        };
    }

    private ComparisonRow comparisonRow(String attr, String attrAr, List<ProductCardDTO> products,
                                         java.util.function.Function<ProductCardDTO, String> extractor) {
        Map<String, String> values = new LinkedHashMap<>();
        for (ProductCardDTO p : products) {
            values.put(p.getProductCode(), extractor.apply(p));
        }
        return ComparisonRow.builder()
                .attribute(attr)
                .attributeAr(attrAr)
                .values(values)
                .build();
    }

    private static String safeUpper(String value) {
        return value != null ? value.toUpperCase().trim() : "";
    }
}
