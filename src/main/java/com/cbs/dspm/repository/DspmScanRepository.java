package com.cbs.dspm.repository;

import com.cbs.dspm.entity.DspmScan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DspmScanRepository extends JpaRepository<DspmScan, Long> {
    Optional<DspmScan> findByScanCode(String scanCode);
    List<DspmScan> findByStatusOrderByCreatedAtDesc(String status);
    List<DspmScan> findBySourceIdOrderByCreatedAtDesc(Long sourceId);
}
