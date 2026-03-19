package com.cbs.ecl.repository;

import com.cbs.ecl.entity.EclProvisionMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EclProvisionMovementRepository extends JpaRepository<EclProvisionMovement, Long> {

    List<EclProvisionMovement> findByRunDateOrderByIdAsc(LocalDate runDate);

    void deleteByRunDate(LocalDate runDate);
}
