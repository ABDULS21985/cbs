package com.cbs.dspm.repository;

import com.cbs.dspm.entity.DspmDataSource;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DspmDataSourceRepository extends JpaRepository<DspmDataSource, Long> {
    Optional<DspmDataSource> findBySourceCode(String sourceCode);
    List<DspmDataSource> findByStatusOrderBySourceNameAsc(String status);
    List<DspmDataSource> findByClassificationOrderBySourceNameAsc(String classification);
}
