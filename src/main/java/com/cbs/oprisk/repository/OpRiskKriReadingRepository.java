package com.cbs.oprisk.repository;

import com.cbs.oprisk.entity.OpRiskKriReading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface OpRiskKriReadingRepository extends JpaRepository<OpRiskKriReading, Long> {
    List<OpRiskKriReading> findByKriIdOrderByReadingDateDesc(Long kriId);
    List<OpRiskKriReading> findByReadingDateOrderByRagStatusDescKriIdAsc(LocalDate date);
}
