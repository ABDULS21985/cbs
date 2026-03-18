package com.cbs.locationref.repository;

import com.cbs.locationref.entity.LocationReference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LocationReferenceRepository extends JpaRepository<LocationReference, Long> {
    Optional<LocationReference> findByLocationCode(String code);
    List<LocationReference> findByLocationTypeAndIsActiveTrueOrderByLocationNameAsc(String type);
    List<LocationReference> findByParentLocationIdAndIsActiveTrueOrderByLocationNameAsc(Long parentId);
}
