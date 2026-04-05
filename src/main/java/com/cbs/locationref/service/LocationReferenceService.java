package com.cbs.locationref.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.locationref.entity.LocationReference;
import com.cbs.locationref.repository.LocationReferenceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class LocationReferenceService {

    private final LocationReferenceRepository locationRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public LocationReference create(LocationReference location) {
        validateLocationFields(location);

        if (locationRepository.existsByLocationNameAndLocationTypeAndIsActiveTrue(
                location.getLocationName(), location.getLocationType())) {
            throw new BusinessException(
                    "A location with name '" + location.getLocationName() + "' and type '"
                            + location.getLocationType() + "' already exists.",
                    "DUPLICATE_LOCATION"
            );
        }

        if (location.getParentLocationId() != null) {
            validateParentChild(location.getParentLocationId(), location.getLocationType());
        }

        if (location.getLocationCode() == null || location.getLocationCode().isBlank()) {
            location.setLocationCode("LOC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        }
        location.setIsActive(true);
        location.setCreatedAt(Instant.now());

        LocationReference saved = locationRepository.save(location);
        log.info("Location created: code={}, name={}, type={}, by={}",
                saved.getLocationCode(), saved.getLocationName(), saved.getLocationType(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public LocationReference update(String locationCode, LocationReference updated) {
        LocationReference existing = getByCode(locationCode);

        if (updated.getLocationName() != null && !updated.getLocationName().isBlank()) {
            existing.setLocationName(updated.getLocationName());
        }
        if (updated.getIsoCountryCode() != null) {
            existing.setIsoCountryCode(updated.getIsoCountryCode());
        }
        if (updated.getIsoSubdivisionCode() != null) {
            existing.setIsoSubdivisionCode(updated.getIsoSubdivisionCode());
        }
        if (updated.getLatitude() != null) {
            existing.setLatitude(updated.getLatitude());
        }
        if (updated.getLongitude() != null) {
            existing.setLongitude(updated.getLongitude());
        }
        if (updated.getTimezone() != null) {
            existing.setTimezone(updated.getTimezone());
        }
        if (updated.getCurrency() != null) {
            existing.setCurrency(updated.getCurrency());
        }
        if (updated.getRegulatoryZone() != null) {
            existing.setRegulatoryZone(updated.getRegulatoryZone());
        }
        if (updated.getParentLocationId() != null) {
            if (existing.getId().equals(updated.getParentLocationId())) {
                throw new BusinessException("A location cannot be its own parent.", "SELF_PARENT");
            }
            validateParentChild(updated.getParentLocationId(), existing.getLocationType());
            existing.setParentLocationId(updated.getParentLocationId());
        }

        LocationReference saved = locationRepository.save(existing);
        log.info("Location updated: code={}, by={}", locationCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public LocationReference deactivate(String locationCode) {
        LocationReference location = getByCode(locationCode);
        if (!Boolean.TRUE.equals(location.getIsActive())) {
            throw new BusinessException("Location " + locationCode + " is already inactive.", "ALREADY_INACTIVE");
        }

        List<LocationReference> children = locationRepository
                .findByParentLocationIdAndIsActiveTrueOrderByLocationNameAsc(location.getId());
        if (!children.isEmpty()) {
            throw new BusinessException(
                    "Cannot deactivate location " + locationCode + " because it has " + children.size() + " active child locations.",
                    "HAS_ACTIVE_CHILDREN"
            );
        }

        location.setIsActive(false);
        LocationReference saved = locationRepository.save(location);
        log.info("Location deactivated: code={}, by={}", locationCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<LocationReference> getByType(String type) {
        if (type == null || type.isBlank()) {
            throw new BusinessException("Location type is required.", "INVALID_TYPE");
        }
        return locationRepository.findByLocationTypeAndIsActiveTrueOrderByLocationNameAsc(type);
    }

    public List<LocationReference> getChildren(Long parentId) {
        if (parentId == null) {
            throw new BusinessException("Parent ID is required.", "INVALID_PARENT_ID");
        }
        return locationRepository.findByParentLocationIdAndIsActiveTrueOrderByLocationNameAsc(parentId);
    }

    public List<LocationReference> searchByName(String name) {
        if (name == null || name.isBlank()) {
            throw new BusinessException("Search name is required.", "INVALID_NAME");
        }
        return locationRepository.findByLocationNameContainingIgnoreCaseAndIsActiveTrueOrderByLocationNameAsc(name);
    }

    public List<LocationReference> getByRegion(String regulatoryZone) {
        if (regulatoryZone == null || regulatoryZone.isBlank()) {
            throw new BusinessException("Regulatory zone is required.", "INVALID_REGION");
        }
        return locationRepository.findByRegulatoryZoneAndIsActiveTrueOrderByLocationNameAsc(regulatoryZone);
    }

    private LocationReference getByCode(String code) {
        return locationRepository.findByLocationCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("LocationReference", "locationCode", code));
    }

    private void validateLocationFields(LocationReference location) {
        if (location.getLocationName() == null || location.getLocationName().isBlank()) {
            throw new BusinessException("Location name is required.", "INVALID_NAME");
        }
        if (location.getLocationType() == null || location.getLocationType().isBlank()) {
            throw new BusinessException("Location type is required.", "INVALID_TYPE");
        }
        if (location.getLocationName().length() > 200) {
            throw new BusinessException("Location name must not exceed 200 characters.", "NAME_TOO_LONG");
        }
    }

    private void validateParentChild(Long parentId, String childType) {
        LocationReference parent = locationRepository.findById(parentId)
                .orElseThrow(() -> new ResourceNotFoundException("LocationReference", "id", parentId));

        if (!Boolean.TRUE.equals(parent.getIsActive())) {
            throw new BusinessException("Parent location is inactive.", "INACTIVE_PARENT");
        }

        // Hierarchy validation: COUNTRY > STATE > CITY > BRANCH
        Map<String, Integer> hierarchy = Map.of(
                "COUNTRY", 1, "STATE", 2, "REGION", 2, "CITY", 3, "BRANCH", 4, "ATM", 4
        );
        int parentLevel = hierarchy.getOrDefault(parent.getLocationType(), 0);
        int childLevel = hierarchy.getOrDefault(childType, 0);

        if (childLevel > 0 && parentLevel > 0 && childLevel <= parentLevel) {
            throw new BusinessException(
                    String.format("Invalid hierarchy: child type '%s' cannot be under parent type '%s'.",
                            childType, parent.getLocationType()),
                    "INVALID_HIERARCHY"
            );
        }
    }
}
