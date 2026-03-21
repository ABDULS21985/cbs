package com.cbs.security.repository;

import com.cbs.security.entity.PiiFieldRegistry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PiiFieldRegistryRepository extends JpaRepository<PiiFieldRegistry, Long> {
    List<PiiFieldRegistry> findAllByOrderByEntityTypeAscFieldNameAsc();
    List<PiiFieldRegistry> findByEntityTypeOrderByFieldNameAsc(String entityType);
}
