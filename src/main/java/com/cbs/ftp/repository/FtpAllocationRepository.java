package com.cbs.ftp.repository;

import com.cbs.ftp.entity.FtpAllocation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;

@Repository
public interface FtpAllocationRepository extends JpaRepository<FtpAllocation, Long> {
    Page<FtpAllocation> findByAllocationDateAndEntityTypeOrderByNetMarginDesc(LocalDate date, String entityType, Pageable pageable);
    Page<FtpAllocation> findByEntityTypeAndEntityIdOrderByAllocationDateDesc(String entityType, Long entityId, Pageable pageable);
}
