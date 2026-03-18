package com.cbs.channel.repository;

import com.cbs.channel.entity.ServicePoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ServicePointRepository extends JpaRepository<ServicePoint, Long> {
    Optional<ServicePoint> findByServicePointCode(String servicePointCode);
    List<ServicePoint> findByServicePointTypeAndStatusOrderByServicePointNameAsc(String servicePointType, String status);
    List<ServicePoint> findByStatusOrderByServicePointNameAsc(String status);
    long countByStatus(String status);
}
