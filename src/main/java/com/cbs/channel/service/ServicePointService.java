package com.cbs.channel.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.channel.entity.ServicePoint;
import com.cbs.channel.entity.ServicePointInteraction;
import com.cbs.channel.repository.ServicePointInteractionRepository;
import com.cbs.channel.repository.ServicePointRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ServicePointService {

    private final ServicePointRepository servicePointRepository;
    private final ServicePointInteractionRepository interactionRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public ServicePoint registerServicePoint(ServicePoint servicePoint) {
        // Field validation
        if (servicePoint.getServicePointName() == null || servicePoint.getServicePointName().isBlank()) {
            throw new BusinessException("Service point name is required", "MISSING_NAME");
        }
        if (servicePoint.getServicePointType() == null || servicePoint.getServicePointType().isBlank()) {
            throw new BusinessException("Service point type is required", "MISSING_TYPE");
        }
        // Duplicate check by name and location
        if (servicePoint.getLocationId() != null) {
            List<ServicePoint> existing = servicePointRepository.findByServicePointTypeAndStatusOrderByServicePointNameAsc(
                    servicePoint.getServicePointType(), "ONLINE");
            for (ServicePoint sp : existing) {
                if (servicePoint.getServicePointName().equals(sp.getServicePointName())
                        && servicePoint.getLocationId().equals(sp.getLocationId())) {
                    throw new BusinessException("Duplicate service point: same name and location already exists", "DUPLICATE_SERVICE_POINT");
                }
            }
        }
        servicePoint.setServicePointCode("SPT-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        ServicePoint saved = servicePointRepository.save(servicePoint);
        log.info("AUDIT: Service point registered: code={}, name={}, type={}, actor={}",
                saved.getServicePointCode(), saved.getServicePointName(), saved.getServicePointType(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public ServicePointInteraction startInteraction(Long servicePointId, ServicePointInteraction interaction) {
        if (!servicePointRepository.existsById(servicePointId)) {
            throw new ResourceNotFoundException("ServicePoint", "id", servicePointId);
        }
        interaction.setServicePointId(servicePointId);
        interaction.setStartedAt(Instant.now());
        return interactionRepository.save(interaction);
    }

    @Transactional
    public ServicePointInteraction endInteraction(Long servicePointId, String outcome, Integer satisfactionScore) {
        ServicePointInteraction interaction = interactionRepository
                .findFirstByServicePointIdAndEndedAtIsNullOrderByStartedAtDesc(servicePointId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Active ServicePointInteraction", "servicePointId", servicePointId));
        interaction.setEndedAt(Instant.now());
        interaction.setDurationSeconds((int) Duration.between(interaction.getStartedAt(), interaction.getEndedAt()).getSeconds());
        interaction.setOutcome(outcome);
        if (satisfactionScore != null) {
            interaction.setCustomerSatisfactionScore(satisfactionScore);
        }
        return interactionRepository.save(interaction);
    }

    public Map<String, Long> getServicePointStatus() {
        long online = servicePointRepository.countByStatus("ONLINE");
        long offline = servicePointRepository.countByStatus("OFFLINE");
        long maintenance = servicePointRepository.countByStatus("MAINTENANCE");
        return Map.of("online", online, "offline", offline, "maintenance", maintenance);
    }

    public Map<String, Object> getServicePointMetrics(Long servicePointId) {
        if (servicePointId == null) {
            return Map.of("servicePointCode", "", "avgDurationSeconds", 0.0, "avgSatisfaction", 0.0,
                    "utilizationPct", 0.0, "activeInteractions", 0L, "totalInteractions", 0);
        }
        ServicePoint sp = servicePointRepository.findById(servicePointId)
                .orElseThrow(() -> new ResourceNotFoundException("ServicePoint", "id", servicePointId));
        List<ServicePointInteraction> interactions = interactionRepository.findByServicePointIdOrderByStartedAtDesc(servicePointId);
        long activeCount = interactionRepository.countByServicePointIdAndEndedAtIsNull(servicePointId);

        double avgDuration = interactions.stream()
                .filter(i -> i.getDurationSeconds() != null)
                .mapToInt(ServicePointInteraction::getDurationSeconds)
                .average()
                .orElse(0.0);

        double avgSatisfaction = interactions.stream()
                .filter(i -> i.getCustomerSatisfactionScore() != null)
                .mapToInt(ServicePointInteraction::getCustomerSatisfactionScore)
                .average()
                .orElse(0.0);

        double utilization = sp.getMaxConcurrentCustomers() > 0
                ? (double) activeCount / sp.getMaxConcurrentCustomers() * 100
                : 0.0;

        return Map.of(
                "servicePointCode", sp.getServicePointCode(),
                "avgDurationSeconds", avgDuration,
                "avgSatisfaction", avgSatisfaction,
                "utilizationPct", utilization,
                "activeInteractions", activeCount,
                "totalInteractions", interactions.size()
        );
    }

    public List<ServicePoint> getAllServicePoints() {
        return servicePointRepository.findAll();
    }

    public List<ServicePoint> getAvailableServicePoints(String type) {
        if (type == null) {
            return servicePointRepository.findByStatusOrderByServicePointNameAsc("ONLINE");
        }
        return servicePointRepository.findByServicePointTypeAndStatusOrderByServicePointNameAsc(type, "ONLINE");
    }

    public ServicePoint getServicePointById(Long id) {
        return servicePointRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ServicePoint", "id", id));
    }

    @Transactional
    public ServicePoint updateServicePoint(Long id, ServicePoint updated) {
        ServicePoint existing = servicePointRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ServicePoint", "id", id));
        existing.setServicePointName(updated.getServicePointName());
        existing.setServicePointType(updated.getServicePointType());
        existing.setLocationId(updated.getLocationId());
        existing.setDeviceId(updated.getDeviceId());
        existing.setSupportedServices(updated.getSupportedServices());
        existing.setOperatingHours(updated.getOperatingHours());
        existing.setIsAccessible(updated.getIsAccessible());
        existing.setStaffRequired(updated.getStaffRequired());
        existing.setAssignedStaffId(updated.getAssignedStaffId());
        existing.setMaxConcurrentCustomers(updated.getMaxConcurrentCustomers());
        existing.setAvgServiceTimeMinutes(updated.getAvgServiceTimeMinutes());
        existing.setStatus(updated.getStatus());
        ServicePoint saved = servicePointRepository.save(existing);
        log.info("AUDIT: Service point updated: code={}, actor={}", existing.getServicePointCode(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public ServicePoint saveServicePoint(ServicePoint servicePoint) {
        return servicePointRepository.save(servicePoint);
    }

    @Transactional
    public void deleteServicePoint(Long id) {
        ServicePoint sp = servicePointRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ServicePoint", "id", id));
        // Check for active interactions before deactivating
        long activeInteractions = interactionRepository.countByServicePointIdAndEndedAtIsNull(id);
        if (activeInteractions > 0) {
            throw new BusinessException("Cannot delete service point " + sp.getServicePointCode()
                    + ": it has " + activeInteractions + " active interactions", "ACTIVE_INTERACTIONS_EXIST");
        }
        // Soft delete instead of hard delete
        sp.setStatus("DECOMMISSIONED");
        servicePointRepository.save(sp);
        log.info("AUDIT: Service point soft-deleted: code={}, actor={}", sp.getServicePointCode(), currentActorProvider.getCurrentActor());
    }
}
