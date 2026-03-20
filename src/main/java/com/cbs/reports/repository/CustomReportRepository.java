package com.cbs.reports.repository;

import com.cbs.reports.entity.CustomReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomReportRepository extends JpaRepository<CustomReport, Long> {
    List<CustomReport> findByOwnerOrderByCreatedAtDesc(String owner);
    List<CustomReport> findByAccessLevelIn(List<String> accessLevels);
}
