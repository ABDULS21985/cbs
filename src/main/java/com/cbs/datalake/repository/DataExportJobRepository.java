package com.cbs.datalake.repository;

import com.cbs.datalake.entity.DataExportJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DataExportJobRepository extends JpaRepository<DataExportJob, Long> {
    List<DataExportJob> findByStatusOrderByJobNameAsc(String status);
    List<DataExportJob> findBySourceEntityOrderByJobNameAsc(String sourceEntity);
}
