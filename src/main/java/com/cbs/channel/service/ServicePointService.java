package com.cbs.channel.service;

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

    @Transactional
    public ServicePoint registerServicePoint(ServicePoint servicePoint) {
        servicePoint.setServicePointCode("SPT-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return servicePointRepository.save(servicePoint);
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
    public ServicePointInteraction endInteraction(Long interactionId, String outcome, Integer satisfactionScore) {
        ServicePointInteraction interaction = interactionRepository.findById(interactionId)
                .orElseThrow(() -> new ResourceNotFoundException("ServicePointInteraction", "id", interactionId));
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
        return servicePointRepository.save(existing);
    }

    @Transactional
    public void deleteServicePoint(Long id) {
        if (!servicePointRepository.existsById(id)) {
            throw new ResourceNotFoundException("ServicePoint", "id", id);
        }
        servicePointRepository.deleteById(id);
    }
}
