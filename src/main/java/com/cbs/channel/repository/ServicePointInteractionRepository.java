package com.cbs.channel.repository;

import com.cbs.channel.entity.ServicePointInteraction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServicePointInteractionRepository extends JpaRepository<ServicePointInteraction, Long> {
    List<ServicePointInteraction> findByServicePointIdOrderByStartedAtDesc(Long servicePointId);
    long countByServicePointIdAndEndedAtIsNull(Long servicePointId);
}
