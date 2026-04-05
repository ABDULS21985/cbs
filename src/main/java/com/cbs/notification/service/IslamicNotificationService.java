package com.cbs.notification.service;

import com.cbs.audit.entity.AuditAction;
import com.cbs.audit.service.AuditService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.notification.dto.*;
import com.cbs.notification.entity.*;
import com.cbs.notification.repository.IslamicTerminologyMapRepository;
import com.cbs.notification.repository.NotificationTemplateLocaleRepository;
import com.cbs.notification.repository.NotificationTemplateRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class IslamicNotificationService {

    private final NotificationTemplateRepository notificationTemplateRepository;
    private final NotificationTemplateLocaleRepository notificationTemplateLocaleRepository;
    private final IslamicTerminologyMapRepository islamicTerminologyMapRepository;
    private final CurrentTenantResolver currentTenantResolver;
    private final CurrentActorProvider currentActorProvider;
    private final AuditService auditService;

    @Transactional
    public TemplateLocaleResponse addLocaleTemplate(Long templateId, CreateLocaleTemplateRequest request) {
        NotificationTemplate template = getTemplate(templateId);
        Long tenantId = currentTenantResolver.getCurrentTenantId();

        ensureLocaleUniqueness(templateId, request.getLocale(), tenantId, null);
        if (Boolean.TRUE.equals(request.getIsDefault())) {
            clearDefaultLocale(templateId, tenantId);
        }

        NotificationTemplateLocale locale = NotificationTemplateLocale.builder()
                .template(template)
                .locale(request.getLocale())
                .subject(request.getSubject())
                .body(request.getBody())
                .bodyHtml(request.getBodyHtml())
                .textDirection(request.getTextDirection())
                .fontFamily(request.getFontFamily())
                .isDefault(Boolean.TRUE.equals(request.getIsDefault()))
                .status(request.getStatus())
                .tenantId(tenantId)
                .build();

        NotificationTemplateLocale saved = notificationTemplateLocaleRepository.save(locale);
        auditService.log("NotificationTemplateLocale", saved.getId(), AuditAction.CREATE,
                currentActorProvider.getCurrentActor(), "Created localized notification template");
        return toResponse(saved);
    }

    @Transactional
    public TemplateLocaleResponse updateLocaleTemplate(Long localeId, UpdateLocaleTemplateRequest request) {
        NotificationTemplateLocale locale = notificationTemplateLocaleRepository.findById(localeId)
                .orElseThrow(() -> new ResourceNotFoundException("NotificationTemplateLocale", "id", localeId));
        validateTenant(locale.getTenantId());

        String effectiveLocale = request.getLocale() != null ? request.getLocale() : locale.getLocale();
        ensureLocaleUniqueness(locale.getTemplate().getId(), effectiveLocale, locale.getTenantId(), locale.getId());

        if (request.getLocale() != null) locale.setLocale(request.getLocale());
        if (request.getSubject() != null) locale.setSubject(request.getSubject());
        if (request.getBody() != null) locale.setBody(request.getBody());
        if (request.getBodyHtml() != null) locale.setBodyHtml(request.getBodyHtml());
        if (request.getTextDirection() != null) locale.setTextDirection(request.getTextDirection());
        if (request.getFontFamily() != null) locale.setFontFamily(request.getFontFamily());
        if (request.getStatus() != null) locale.setStatus(request.getStatus());
        if (request.getIsDefault() != null) {
            if (request.getIsDefault()) {
                clearDefaultLocale(locale.getTemplate().getId(), locale.getTenantId());
            }
            locale.setIsDefault(request.getIsDefault());
        }
        locale.setReviewedBy(currentActorProvider.getCurrentActor());
        locale.setReviewedAt(Instant.now());

        NotificationTemplateLocale saved = notificationTemplateLocaleRepository.save(locale);
        auditService.log("NotificationTemplateLocale", saved.getId(), AuditAction.UPDATE,
                currentActorProvider.getCurrentActor(), "Updated localized notification template");
        return toResponse(saved);
    }

    public List<TemplateLocaleResponse> getLocaleTemplates(Long templateId) {
        getTemplate(templateId);
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        return getScopedLocaleTemplates(templateId, tenantId).stream()
                .map(this::toResponse)
                .toList();
    }

    public RenderedNotificationResponse resolveTemplate(Long templateId, String locale, Map<String, Object> variables, String context) {
        NotificationTemplate template = getTemplate(templateId);
        Long tenantId = currentTenantResolver.getCurrentTenantId();

        NotificationTemplateLocale localized = resolveLocaleTemplate(templateId, locale, tenantId);
        String resolvedLocale = localized != null ? localized.getLocale() : defaultText(locale, template.getLocale());
        String subject = localized != null ? localized.getSubject() : template.getSubject();
        String body = localized != null ? localized.getBody() : template.getBodyTemplate();
        String bodyHtml = localized != null ? localized.getBodyHtml() : (Boolean.TRUE.equals(template.getIsHtml()) ? template.getBodyTemplate() : null);
        TextDirection direction = localized != null ? localized.getTextDirection() : defaultDirection(resolvedLocale);
        String fontFamily = localized != null ? localized.getFontFamily() : defaultFont(resolvedLocale);

        Map<String, Object> safeVariables = variables == null ? Map.of() : variables;
        String renderedSubject = applyTerminology(applyVariables(subject, safeVariables), resolvedLocale, context, tenantId);
        String renderedBody = applyTerminology(applyVariables(body, safeVariables), resolvedLocale, context, tenantId);
        String renderedBodyHtml = bodyHtml != null
                ? applyTerminology(applyVariables(bodyHtml, safeVariables), resolvedLocale, context, tenantId)
                : null;

        return RenderedNotificationResponse.builder()
                .templateId(templateId)
                .locale(resolvedLocale)
                .subject(renderedSubject)
                .body(renderedBody)
                .bodyHtml(renderedBodyHtml)
                .textDirection(direction)
                .fontFamily(fontFamily)
                .build();
    }

    public BilingualNotificationResponse renderBilingual(Long templateId, Map<String, Object> variables, String context) {
        return BilingualNotificationResponse.builder()
                .english(resolveTemplate(templateId, "en", variables, context))
                .arabic(resolveTemplate(templateId, "ar", variables, context))
                .build();
    }

    @Transactional
    public TerminologyResponse addTerminologyMapping(CreateTerminologyRequest request) {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        ensureTerminologyUniqueness(request.getConventionalTerm(), request.getContext(), tenantId, null);

        IslamicTerminologyMap mapping = IslamicTerminologyMap.builder()
                .conventionalTerm(request.getConventionalTerm())
                .islamicTermEn(request.getIslamicTermEn())
                .islamicTermAr(request.getIslamicTermAr())
                .context(request.getContext())
                .status(TerminologyStatus.ACTIVE)
                .tenantId(tenantId)
                .build();

        IslamicTerminologyMap saved = islamicTerminologyMapRepository.save(mapping);
        auditService.log("IslamicTerminologyMap", saved.getId(), AuditAction.CREATE,
                currentActorProvider.getCurrentActor(), "Created Islamic terminology mapping");
        return toResponse(saved);
    }

    @Transactional
    public TerminologyResponse updateTerminologyMapping(Long id, UpdateTerminologyRequest request) {
        IslamicTerminologyMap mapping = islamicTerminologyMapRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicTerminologyMap", "id", id));
        validateTenant(mapping.getTenantId());

        String effectiveTerm = request.getConventionalTerm() != null ? request.getConventionalTerm() : mapping.getConventionalTerm();
        String effectiveContext = request.getContext() != null ? request.getContext() : mapping.getContext();
        ensureTerminologyUniqueness(effectiveTerm, effectiveContext, mapping.getTenantId(), mapping.getId());

        if (request.getConventionalTerm() != null) mapping.setConventionalTerm(request.getConventionalTerm());
        if (request.getIslamicTermEn() != null) mapping.setIslamicTermEn(request.getIslamicTermEn());
        if (request.getIslamicTermAr() != null) mapping.setIslamicTermAr(request.getIslamicTermAr());
        if (request.getContext() != null) mapping.setContext(request.getContext());
        if (request.getStatus() != null) mapping.setStatus(request.getStatus());

        IslamicTerminologyMap saved = islamicTerminologyMapRepository.save(mapping);
        auditService.log("IslamicTerminologyMap", saved.getId(), AuditAction.UPDATE,
                currentActorProvider.getCurrentActor(), "Updated Islamic terminology mapping");
        return toResponse(saved);
    }

    public List<TerminologyResponse> getTerminologyMappings(String context) {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        return getScopedTerminologyMappings(context, tenantId).stream()
                .map(this::toResponse)
                .toList();
    }

    public Map<String, TerminologyResponse> getTerminologyDictionary() {
        Long tenantId = currentTenantResolver.getCurrentTenantId();
        LinkedHashMap<String, TerminologyResponse> dictionary = new LinkedHashMap<>();
        for (IslamicTerminologyMap mapping : getScopedTerminologyMappings(null, tenantId)) {
            dictionary.put(mapping.getConventionalTerm().toLowerCase(Locale.ROOT), toResponse(mapping));
        }
        return dictionary;
    }

    @Transactional
    public void deactivateTerminologyMapping(Long id) {
        IslamicTerminologyMap mapping = islamicTerminologyMapRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("IslamicTerminologyMap", "id", id));
        validateTenant(mapping.getTenantId());
        mapping.setStatus(TerminologyStatus.INACTIVE);
        islamicTerminologyMapRepository.save(mapping);
        auditService.log("IslamicTerminologyMap", mapping.getId(), AuditAction.DELETE,
                currentActorProvider.getCurrentActor(), "Deactivated Islamic terminology mapping");
    }

    private NotificationTemplate getTemplate(Long templateId) {
        return notificationTemplateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("NotificationTemplate", "id", templateId));
    }

    private List<NotificationTemplateLocale> getScopedLocaleTemplates(Long templateId, Long tenantId) {
        if (tenantId != null) {
            List<NotificationTemplateLocale> tenantLocales =
                    notificationTemplateLocaleRepository.findByTemplateIdAndTenantIdOrderByIsDefaultDescLocaleAsc(templateId, tenantId);
            if (!tenantLocales.isEmpty()) {
                return tenantLocales;
            }
        }
        return notificationTemplateLocaleRepository.findByTemplateIdAndTenantIdIsNullOrderByIsDefaultDescLocaleAsc(templateId);
    }

    private NotificationTemplateLocale resolveLocaleTemplate(Long templateId, String requestedLocale, Long tenantId) {
        List<NotificationTemplateLocale> locales = resolveEffectiveLocaleTemplates(templateId, tenantId);
        if (locales.isEmpty()) {
            return null;
        }

        if (StringUtils.hasText(requestedLocale)) {
            String normalized = normalizeLocale(requestedLocale);
            Optional<NotificationTemplateLocale> exact = locales.stream()
                .filter(locale -> normalizeLocale(locale.getLocale()).equalsIgnoreCase(normalized))
                    .findFirst();
            if (exact.isPresent()) {
                return exact.get();
            }

            String language = normalized.contains("-")
                    ? normalized.substring(0, normalized.indexOf('-'))
                    : normalized;
            Optional<NotificationTemplateLocale> languageMatch = locales.stream()
                .filter(locale -> {
                String localeTag = normalizeLocale(locale.getLocale());
                return localeTag.equalsIgnoreCase(language)
                    || localeTag.startsWith(language.toLowerCase(Locale.ROOT) + "-");
                })
                    .findFirst();
            if (languageMatch.isPresent()) {
                return languageMatch.get();
            }
        }

        return locales.stream()
                .filter(locale -> Boolean.TRUE.equals(locale.getIsDefault()))
                .findFirst()
            .orElseGet(locales::getFirst);
        }

        private List<NotificationTemplateLocale> resolveEffectiveLocaleTemplates(Long templateId, Long tenantId) {
        LinkedHashMap<String, NotificationTemplateLocale> merged = new LinkedHashMap<>();

        notificationTemplateLocaleRepository.findByTemplateIdAndTenantIdIsNullOrderByIsDefaultDescLocaleAsc(templateId).stream()
            .filter(locale -> locale.getStatus() == NotificationTemplateLocaleStatus.ACTIVE)
            .forEach(locale -> merged.put(normalizeLocale(locale.getLocale()), locale));

        if (tenantId != null) {
            notificationTemplateLocaleRepository.findByTemplateIdAndTenantIdOrderByIsDefaultDescLocaleAsc(templateId, tenantId).stream()
                .filter(locale -> locale.getStatus() == NotificationTemplateLocaleStatus.ACTIVE)
                .forEach(locale -> merged.put(normalizeLocale(locale.getLocale()), locale));
        }

        return merged.values().stream()
            .sorted(Comparator.comparing(NotificationTemplateLocale::getIsDefault, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(NotificationTemplateLocale::getLocale, String.CASE_INSENSITIVE_ORDER))
            .toList();
    }

    private List<IslamicTerminologyMap> getScopedTerminologyMappings(String context, Long tenantId) {
        LinkedHashMap<String, IslamicTerminologyMap> merged = new LinkedHashMap<>();

        List<IslamicTerminologyMap> globalMappings = context != null
                ? islamicTerminologyMapRepository.findByContextAndStatusAndTenantIdIsNullOrderByConventionalTermAsc(context, TerminologyStatus.ACTIVE)
                : islamicTerminologyMapRepository.findByStatusAndTenantIdIsNullOrderByContextAscConventionalTermAsc(TerminologyStatus.ACTIVE);
        globalMappings.forEach(mapping -> merged.put(mapping.getContext() + "::" + mapping.getConventionalTerm().toLowerCase(Locale.ROOT), mapping));

        if (context == null || !"GENERAL".equalsIgnoreCase(context)) {
            List<IslamicTerminologyMap> generalGlobal = islamicTerminologyMapRepository
                    .findByContextAndStatusAndTenantIdIsNullOrderByConventionalTermAsc("GENERAL", TerminologyStatus.ACTIVE);
            generalGlobal.forEach(mapping -> merged.putIfAbsent(
                    mapping.getContext() + "::" + mapping.getConventionalTerm().toLowerCase(Locale.ROOT), mapping));
        }

        if (tenantId != null) {
            List<IslamicTerminologyMap> tenantMappings = context != null
                    ? islamicTerminologyMapRepository.findByContextAndStatusAndTenantIdOrderByConventionalTermAsc(context, TerminologyStatus.ACTIVE, tenantId)
                    : islamicTerminologyMapRepository.findByStatusAndTenantIdOrderByContextAscConventionalTermAsc(TerminologyStatus.ACTIVE, tenantId);
            tenantMappings.forEach(mapping -> merged.put(mapping.getContext() + "::" + mapping.getConventionalTerm().toLowerCase(Locale.ROOT), mapping));

            if (context == null || !"GENERAL".equalsIgnoreCase(context)) {
                islamicTerminologyMapRepository.findByContextAndStatusAndTenantIdOrderByConventionalTermAsc("GENERAL", TerminologyStatus.ACTIVE, tenantId)
                        .forEach(mapping -> merged.put(mapping.getContext() + "::" + mapping.getConventionalTerm().toLowerCase(Locale.ROOT), mapping));
            }
        }

        return new ArrayList<>(merged.values());
    }

    private String applyVariables(String template, Map<String, Object> variables) {
        if (template == null) {
            return null;
        }
        String rendered = template;
        for (Map.Entry<String, Object> entry : variables.entrySet()) {
            rendered = rendered.replace("{{" + entry.getKey() + "}}",
                    entry.getValue() == null ? "" : String.valueOf(entry.getValue()));
        }
        return rendered;
    }

    private String applyTerminology(String text, String locale, String context, Long tenantId) {
        if (!StringUtils.hasText(text)) {
            return text;
        }
        String localized = text;
        List<IslamicTerminologyMap> mappings = getScopedTerminologyMappings(context, tenantId).stream()
                .sorted(Comparator.comparingInt((IslamicTerminologyMap item) -> item.getConventionalTerm().length()).reversed())
                .toList();

        boolean arabic = locale != null && locale.toLowerCase(Locale.ROOT).startsWith("ar");
        for (IslamicTerminologyMap mapping : mappings) {
            String replacement = arabic
                    ? defaultText(mapping.getIslamicTermAr(), mapping.getIslamicTermEn())
                    : defaultText(mapping.getIslamicTermEn(), mapping.getConventionalTerm());
            if (!StringUtils.hasText(replacement)) {
                replacement = mapping.getConventionalTerm();
            }
            Pattern pattern = Pattern.compile("\\b" + Pattern.quote(mapping.getConventionalTerm()) + "\\b",
                    Pattern.CASE_INSENSITIVE);
            localized = pattern.matcher(localized).replaceAll(replacement);
        }
        return localized;
    }

    private void clearDefaultLocale(Long templateId, Long tenantId) {
        getScopedLocaleTemplates(templateId, tenantId).forEach(locale -> {
            if (Boolean.TRUE.equals(locale.getIsDefault())) {
                locale.setIsDefault(false);
                notificationTemplateLocaleRepository.save(locale);
            }
        });
    }

    private void ensureLocaleUniqueness(Long templateId, String locale, Long tenantId, Long ignoreId) {
        Optional<NotificationTemplateLocale> existing = tenantId != null
                ? notificationTemplateLocaleRepository.findByTemplateIdAndLocaleAndTenantId(templateId, locale, tenantId)
                : notificationTemplateLocaleRepository.findByTemplateIdAndLocaleAndTenantIdIsNull(templateId, locale);
        if (existing.isPresent() && !Objects.equals(existing.get().getId(), ignoreId)) {
            throw new BusinessException("A localized template already exists for locale " + locale);
        }
    }

    private void ensureTerminologyUniqueness(String term, String context, Long tenantId, Long ignoreId) {
        Optional<IslamicTerminologyMap> existing = tenantId != null
                ? islamicTerminologyMapRepository.findByConventionalTermAndContextAndTenantId(term, context, tenantId)
                : islamicTerminologyMapRepository.findByConventionalTermAndContextAndTenantIdIsNull(term, context);
        if (existing.isPresent() && !Objects.equals(existing.get().getId(), ignoreId)) {
            throw new BusinessException("Terminology mapping already exists for term/context combination");
        }
    }

    private TextDirection defaultDirection(String locale) {
        return locale != null && locale.toLowerCase(Locale.ROOT).startsWith("ar") ? TextDirection.RTL : TextDirection.LTR;
    }

    private String defaultFont(String locale) {
        return locale != null && locale.toLowerCase(Locale.ROOT).startsWith("ar") ? "Noto Sans Arabic" : null;
    }

    private void validateTenant(Long entityTenantId) {
        Long currentTenantId = currentTenantResolver.getCurrentTenantId();
        if (currentTenantId != null && entityTenantId != null && !Objects.equals(currentTenantId, entityTenantId)) {
            throw new BusinessException("Notification resource does not belong to the current tenant");
        }
    }

    private TemplateLocaleResponse toResponse(NotificationTemplateLocale locale) {
        return TemplateLocaleResponse.builder()
                .id(locale.getId())
                .templateId(locale.getTemplate().getId())
                .locale(locale.getLocale())
                .subject(locale.getSubject())
                .body(locale.getBody())
                .bodyHtml(locale.getBodyHtml())
                .textDirection(locale.getTextDirection())
                .fontFamily(locale.getFontFamily())
                .isDefault(locale.getIsDefault())
                .status(locale.getStatus())
                .reviewedBy(locale.getReviewedBy())
                .reviewedAt(locale.getReviewedAt())
                .tenantId(locale.getTenantId())
                .createdAt(locale.getCreatedAt())
                .updatedAt(locale.getUpdatedAt())
                .build();
    }

    private TerminologyResponse toResponse(IslamicTerminologyMap mapping) {
        return TerminologyResponse.builder()
                .id(mapping.getId())
                .conventionalTerm(mapping.getConventionalTerm())
                .islamicTermEn(mapping.getIslamicTermEn())
                .islamicTermAr(mapping.getIslamicTermAr())
                .context(mapping.getContext())
                .status(mapping.getStatus())
                .tenantId(mapping.getTenantId())
                .createdAt(mapping.getCreatedAt())
                .updatedAt(mapping.getUpdatedAt())
                .build();
    }

    private String defaultText(String value, String fallback) {
        return StringUtils.hasText(value) ? value : fallback;
    }

    private String normalizeLocale(String locale) {
        return locale == null ? "" : locale.trim().replace('_', '-').toLowerCase(Locale.ROOT);
    }
}
