package com.cbs.ecl.repository;

import com.cbs.ecl.entity.EclModelParameter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface EclModelParameterRepository extends JpaRepository<EclModelParameter, Long> {
    @Query("SELECT p FROM EclModelParameter p WHERE p.segment = :seg AND p.stage = :stage AND p.isActive = true " +
           "AND p.effectiveDate <= :date ORDER BY p.effectiveDate DESC")
    List<EclModelParameter> findActiveParams(@Param("seg") String segment, @Param("stage") int stage, @Param("date") LocalDate date);
}
