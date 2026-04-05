package com.cbs.servicedir.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.servicedir.entity.ServiceDirectoryEntry;
import com.cbs.servicedir.repository.ServiceDirectoryEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ServiceDirectoryService {

    private final ServiceDirectoryEntryRepository entryRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public ServiceDirectoryEntry create(ServiceDirectoryEntry entry) {
        validateEntryFields(entry);

        if (entryRepository.existsByServiceNameAndServiceCategory(entry.getServiceName(), entry.getServiceCategory())) {
            throw new BusinessException(
                    "A service with name '" + entry.getServiceName() + "' in category '"
                            + entry.getServiceCategory() + "' already exists.",
                    "DUPLICATE_SERVICE"
            );
        }

        if (entry.getServiceCode() == null || entry.getServiceCode().isBlank()) {
            entry.setServiceCode("SVC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        }
        entry.setIsActive(true);
        entry.setCreatedAt(Instant.now());

        ServiceDirectoryEntry saved = entryRepository.save(entry);
        log.info("Service directory entry created: code={}, name={}, category={}, by={}",
                saved.getServiceCode(), saved.getServiceName(), saved.getServiceCategory(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public ServiceDirectoryEntry update(String serviceCode, ServiceDirectoryEntry updated) {
        ServiceDirectoryEntry existing = getByCode(serviceCode);

        if (updated.getServiceName() != null && !updated.getServiceName().isBlank()) {
            existing.setServiceName(updated.getServiceName());
        }
        if (updated.getDescription() != null) {
            existing.setDescription(updated.getDescription());
        }
        if (updated.getAvailableChannels() != null) {
            existing.setAvailableChannels(updated.getAvailableChannels());
        }
        if (updated.getEligibilityRules() != null) {
            existing.setEligibilityRules(updated.getEligibilityRules());
        }
        if (updated.getRequiresAppointment() != null) {
            existing.setRequiresAppointment(updated.getRequiresAppointment());
        }
        if (updated.getSlaMinutes() != null) {
            if (updated.getSlaMinutes() <= 0) {
                throw new BusinessException("SLA minutes must be positive.", "INVALID_SLA");
            }
            existing.setSlaMinutes(updated.getSlaMinutes());
        }
        if (updated.getFeeApplicable() != null) {
            existing.setFeeApplicable(updated.getFeeApplicable());
        }
        if (updated.getFeeAmount() != null) {
            if (updated.getFeeAmount().compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessException("Fee amount cannot be negative.", "INVALID_FEE");
            }
            existing.setFeeAmount(updated.getFeeAmount());
        }
        if (updated.getDocumentationUrl() != null) {
            existing.setDocumentationUrl(updated.getDocumentationUrl());
        }

        ServiceDirectoryEntry saved = entryRepository.save(existing);
        log.info("Service directory entry updated: code={}, by={}", serviceCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public ServiceDirectoryEntry deactivate(String serviceCode) {
        ServiceDirectoryEntry entry = getByCode(serviceCode);
        if (!Boolean.TRUE.equals(entry.getIsActive())) {
            throw new BusinessException("Service " + serviceCode + " is already inactive.", "ALREADY_INACTIVE");
        }
        entry.setIsActive(false);
        ServiceDirectoryEntry saved = entryRepository.save(entry);
        log.info("Service deactivated: code={}, by={}", serviceCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public ServiceDirectoryEntry reactivate(String serviceCode) {
        ServiceDirectoryEntry entry = getByCode(serviceCode);
        if (Boolean.TRUE.equals(entry.getIsActive())) {
            throw new BusinessException("Service " + serviceCode + " is already active.", "ALREADY_ACTIVE");
        }
        entry.setIsActive(true);
        ServiceDirectoryEntry saved = entryRepository.save(entry);
        log.info("Service reactivated: code={}, by={}", serviceCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<ServiceDirectoryEntry> getByCategory(String category) {
        if (category == null || category.isBlank()) {
            throw new BusinessException("Service category is required.", "INVALID_CATEGORY");
        }
        return entryRepository.findByServiceCategoryAndIsActiveTrueOrderByServiceNameAsc(category);
    }

    public List<ServiceDirectoryEntry> getAll() {
        return entryRepository.findByIsActiveTrueOrderByServiceCategoryAscServiceNameAsc();
    }

    public List<ServiceDirectoryEntry> searchByName(String name) {
        if (name == null || name.isBlank()) {
            throw new BusinessException("Search name is required.", "INVALID_NAME");
        }
        return entryRepository.findByServiceNameContainingIgnoreCaseAndIsActiveTrueOrderByServiceNameAsc(name);
    }

    /**
     * Performs a health check on a service entry by verifying documentation availability
     * and SLA configuration.
     */
    public Map<String, Object> healthCheck(String serviceCode) {
        ServiceDirectoryEntry entry = getByCode(serviceCode);
        Map<String, Object> health = new LinkedHashMap<>();
        health.put("serviceCode", entry.getServiceCode());
        health.put("serviceName", entry.getServiceName());
        health.put("isActive", entry.getIsActive());

        List<String> warnings = new ArrayList<>();
        if (entry.getDocumentationUrl() == null || entry.getDocumentationUrl().isBlank()) {
            warnings.add("No documentation URL configured");
        }
        if (entry.getSlaMinutes() == null || entry.getSlaMinutes() <= 0) {
            warnings.add("No SLA defined");
        }
        if (entry.getAvailableChannels() == null || entry.getAvailableChannels().isEmpty()) {
            warnings.add("No available channels configured");
        }
        if (Boolean.TRUE.equals(entry.getFeeApplicable())
                && (entry.getFeeAmount() == null || entry.getFeeAmount().compareTo(BigDecimal.ZERO) <= 0)) {
            warnings.add("Fee marked as applicable but no fee amount set");
        }

        health.put("warnings", warnings);
        health.put("healthy", warnings.isEmpty());
        return health;
    }

    private ServiceDirectoryEntry getByCode(String code) {
        return entryRepository.findByServiceCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceDirectoryEntry", "serviceCode", code));
    }

    private void validateEntryFields(ServiceDirectoryEntry entry) {
        if (entry.getServiceName() == null || entry.getServiceName().isBlank()) {
            throw new BusinessException("Service name is required.", "INVALID_NAME");
        }
        if (entry.getServiceName().length() > 200) {
            throw new BusinessException("Service name must not exceed 200 characters.", "NAME_TOO_LONG");
        }
        if (entry.getServiceCategory() == null || entry.getServiceCategory().isBlank()) {
            throw new BusinessException("Service category is required.", "INVALID_CATEGORY");
        }
        if (entry.getFeeApplicable() != null && entry.getFeeApplicable()
                && (entry.getFeeAmount() == null || entry.getFeeAmount().compareTo(BigDecimal.ZERO) <= 0)) {
            throw new BusinessException("Fee amount is required when fee is applicable.", "MISSING_FEE_AMOUNT");
        }
    }
}
