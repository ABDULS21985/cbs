package com.cbs.locationref.service;

import com.cbs.locationref.entity.LocationReference;
import com.cbs.locationref.repository.LocationReferenceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class LocationReferenceService {

    private final LocationReferenceRepository locationRepository;

    @Transactional
    public LocationReference create(LocationReference location) {
        return locationRepository.save(location);
    }

    public List<LocationReference> getByType(String type) {
        return locationRepository.findByLocationTypeAndIsActiveTrueOrderByLocationNameAsc(type);
    }

    public List<LocationReference> getChildren(Long parentId) {
        return locationRepository.findByParentLocationIdAndIsActiveTrueOrderByLocationNameAsc(parentId);
    }
}
