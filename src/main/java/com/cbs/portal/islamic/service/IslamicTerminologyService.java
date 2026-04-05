package com.cbs.portal.islamic.service;

import com.cbs.notification.entity.IslamicTerminologyMap;
import com.cbs.notification.entity.TerminologyStatus;
import com.cbs.notification.repository.IslamicTerminologyMapRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Wraps the {@link IslamicTerminologyMapRepository} to provide fast lookups
 * of Islamic terminology translations.  An in-memory cache is populated on
 * startup and keyed by {@code context + conventionalTerm + language}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IslamicTerminologyService {

    private final IslamicTerminologyMapRepository terminologyRepository;

    /** Cache key: "CONTEXT|CONVENTIONAL_TERM|LANG" -> Islamic term */
    private final ConcurrentHashMap<String, String> cache = new ConcurrentHashMap<>();

    /** All active mappings keyed by context */
    private final ConcurrentHashMap<String, List<IslamicTerminologyMap>> contextCache = new ConcurrentHashMap<>();

    private volatile boolean loaded = false;

    // ── Initialisation ───────────────────────────────────────────────────

    @PostConstruct
    void init() {
        loadCache();
    }

    private void loadCache() {
        try {
            List<IslamicTerminologyMap> all =
                    terminologyRepository.findByStatusAndTenantIdIsNullOrderByContextAscConventionalTermAsc(
                            TerminologyStatus.ACTIVE);

            cache.clear();
            contextCache.clear();

            for (IslamicTerminologyMap m : all) {
                String base = cacheKey(m.getContext(), m.getConventionalTerm());
                cache.put(base + "|EN", m.getIslamicTermEn());
                cache.put(base + "|AR", m.getIslamicTermAr());
                contextCache.computeIfAbsent(m.getContext(), k -> new ArrayList<>()).add(m);
            }
            loaded = true;
            log.info("Islamic terminology cache loaded: {} mappings across {} contexts",
                    all.size(), contextCache.size());
        } catch (Exception ex) {
            log.error("Failed to load Islamic terminology cache — translations will fall back to original terms", ex);
        }
    }

    // ── Public API ───────────────────────────────────────────────────────

    /**
     * Look up the Islamic term for a conventional term in the given context.
     *
     * @param conventionalTerm the conventional (English) banking term
     * @param context          one of DEPOSITS, FINANCING, GENERAL
     * @param language         EN or AR
     * @return the Islamic equivalent, or the original term if no mapping exists
     */
    public String translate(String conventionalTerm, String context, String language) {
        if (!StringUtils.hasText(conventionalTerm)) {
            return conventionalTerm;
        }
        ensureLoaded();

        String lang = normaliseLanguage(language);
        String key = cacheKey(safeContext(context), conventionalTerm) + "|" + lang;
        String result = cache.get(key);

        if (result == null) {
            // Try GENERAL context as fallback
            key = cacheKey("GENERAL", conventionalTerm) + "|" + lang;
            result = cache.get(key);
        }
        return result != null ? result : conventionalTerm;
    }

    /**
     * Apply all known terminology mappings to a free-text transaction description.
     * Replaces conventional terms with their Islamic equivalents contextually.
     *
     * @param description       the original description
     * @param accountContractType WADIAH, MUDARABAH, MURABAHA, IJARAH, MUSHARAKAH
     * @param language          EN or AR
     * @return the description with Islamic terminology applied
     */
    public String translateTransactionDescription(String description, String accountContractType, String language) {
        if (!StringUtils.hasText(description)) {
            return description;
        }
        ensureLoaded();

        String lang = normaliseLanguage(language);
        String context = mapContractTypeToContext(accountContractType);
        String result = description;

        // Apply context-specific mappings first
        List<IslamicTerminologyMap> contextMappings = contextCache.getOrDefault(context, Collections.emptyList());
        for (IslamicTerminologyMap mapping : contextMappings) {
            String replacement = "EN".equals(lang) ? mapping.getIslamicTermEn() : mapping.getIslamicTermAr();
            if (result.contains(mapping.getConventionalTerm())) {
                result = result.replace(mapping.getConventionalTerm(), replacement);
            }
        }

        // Apply GENERAL mappings for any remaining conventional terms
        List<IslamicTerminologyMap> generalMappings = contextCache.getOrDefault("GENERAL", Collections.emptyList());
        for (IslamicTerminologyMap mapping : generalMappings) {
            String replacement = "EN".equals(lang) ? mapping.getIslamicTermEn() : mapping.getIslamicTermAr();
            if (result.contains(mapping.getConventionalTerm())) {
                result = result.replace(mapping.getConventionalTerm(), replacement);
            }
        }

        // Hard-coded fallback replacements for the most common terms if not in DB
        result = applyFallbackReplacements(result, context, lang);

        return result;
    }

    /**
     * Return all active mappings for a given context as a map of
     * conventional term to Islamic term in the requested language.
     *
     * @param context  one of DEPOSITS, FINANCING, GENERAL
     * @param language EN or AR
     * @return unmodifiable map
     */
    public Map<String, String> getTerminologyMap(String context, String language) {
        ensureLoaded();
        String lang = normaliseLanguage(language);
        String ctx = safeContext(context);

        List<IslamicTerminologyMap> mappings = contextCache.getOrDefault(ctx, Collections.emptyList());
        return Collections.unmodifiableMap(
                mappings.stream().collect(Collectors.toMap(
                        IslamicTerminologyMap::getConventionalTerm,
                        m -> "EN".equals(lang) ? m.getIslamicTermEn() : m.getIslamicTermAr(),
                        (a, b) -> a,
                        LinkedHashMap::new
                ))
        );
    }

    // ── Internals ────────────────────────────────────────────────────────

    private void ensureLoaded() {
        if (!loaded) {
            loadCache();
        }
    }

    private static String cacheKey(String context, String term) {
        return context.toUpperCase() + "|" + term;
    }

    private static String normaliseLanguage(String language) {
        if (!StringUtils.hasText(language)) return "EN";
        String upper = language.toUpperCase().trim();
        if (upper.startsWith("AR")) return "AR";
        return "EN";
    }

    private static String safeContext(String context) {
        return StringUtils.hasText(context) ? context.toUpperCase().trim() : "GENERAL";
    }

    private static String mapContractTypeToContext(String contractType) {
        if (!StringUtils.hasText(contractType)) return "GENERAL";
        String upper = contractType.toUpperCase().trim();
        return switch (upper) {
            case "WADIAH", "MUDARABAH" -> "DEPOSITS";
            case "MURABAHA", "IJARAH", "MUSHARAKAH" -> "FINANCING";
            default -> "GENERAL";
        };
    }

    /**
     * Hard-coded fallback replacements for the most common conventional-to-Islamic
     * term translations, used when the DB mapping table does not yet cover them.
     */
    private static String applyFallbackReplacements(String text, String context, String lang) {
        String result = text;

        if ("EN".equals(lang)) {
            if ("DEPOSITS".equals(context)) {
                result = result.replace("Interest Credit", "Hibah (Gift)");
            } else if ("FINANCING".equals(context)) {
                result = result.replace("Interest Credit", "Profit Distribution");
            }
            result = result.replace("Loan Repayment", "Financing Installment");
            result = result.replace("EMI", "Installment");
            result = result.replace("Interest", "Profit");
            result = result.replace("Loan", "Financing");
            result = result.replace("Penalty", "Late Payment Charge (to Charity)");
        } else {
            // Arabic fallbacks
            if ("DEPOSITS".equals(context)) {
                result = result.replace("Interest Credit", "\u0647\u0628\u0629");
            } else if ("FINANCING".equals(context)) {
                result = result.replace("Interest Credit", "\u062a\u0648\u0632\u064a\u0639 \u0627\u0644\u0623\u0631\u0628\u0627\u062d");
            }
            result = result.replace("Loan Repayment", "\u0642\u0633\u0637 \u0627\u0644\u062a\u0645\u0648\u064a\u0644");
            result = result.replace("EMI", "\u0642\u0633\u0637");
            result = result.replace("Interest", "\u0631\u0628\u062d");
            result = result.replace("Loan", "\u062a\u0645\u0648\u064a\u0644");
        }

        return result;
    }
}
