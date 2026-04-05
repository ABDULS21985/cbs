package com.cbs.channel.repository;

import com.cbs.channel.entity.ServicePointInteraction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ServicePointInteractionRepository extends JpaRepository<ServicePointInteraction, Long> {
    List<ServicePointInteraction> findByServicePointIdOrderByStartedAtDesc(Long servicePointId);
    Optional<ServicePointInteraction> findFirstByServicePointIdAndEndedAtIsNullOrderByStartedAtDesc(Long servicePointId);
    long countByServicePointIdAndEndedAtIsNull(Long servicePointId);
}
