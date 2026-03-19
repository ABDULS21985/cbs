package com.cbs.ecl.repository;

import com.cbs.ecl.entity.EclPdTermStructure;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EclPdTermStructureRepository extends JpaRepository<EclPdTermStructure, Long> {

    List<EclPdTermStructure> findByIsActiveTrueOrderByRatingGradeAsc();
}
