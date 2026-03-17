package com.cbs.pfm.repository;

import com.cbs.pfm.entity.PfmSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PfmSnapshotRepository extends JpaRepository<PfmSnapshot, Long> {
    List<PfmSnapshot> findByCustomerIdOrderBySnapshotDateDesc(Long customerId);
    List<PfmSnapshot> findByCustomerIdAndSnapshotTypeOrderBySnapshotDateDesc(Long customerId, String snapshotType);
}
