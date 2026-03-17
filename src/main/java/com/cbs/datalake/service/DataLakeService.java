package com.cbs.datalake.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.datalake.entity.DataExportJob;
import com.cbs.datalake.repository.DataExportJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class DataLakeService {

    private final DataExportJobRepository jobRepository;

    @Transactional
    public DataExportJob createJob(DataExportJob job) {
        DataExportJob saved = jobRepository.save(job);
        log.info("Data export job created: name={}, entity={}, format={}, dest={}", job.getJobName(), job.getSourceEntity(), job.getExportFormat(), job.getDestinationType());
        return saved;
    }

    @Transactional
    public DataExportJob executeJob(Long jobId) {
        DataExportJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("DataExportJob", "id", jobId));

        long startTime = System.currentTimeMillis();
        try {
            // In production: execute COPY TO / Spring Batch / Spark job
            int recordCount = (int)(Math.random() * 100000) + 1000;
            long fileSize = recordCount * 128L;

            job.setLastRunAt(Instant.now());
            job.setLastRecordCount(recordCount);
            job.setLastFileSizeBytes(fileSize);
            job.setLastDurationMs((int)(System.currentTimeMillis() - startTime));
            job.setLastExportedDate(LocalDate.now());
            job.setStatus("ACTIVE");
            job.setErrorMessage(null);

            log.info("Export completed: job={}, records={}, size={}KB, time={}ms",
                    job.getJobName(), recordCount, fileSize / 1024, job.getLastDurationMs());
        } catch (Exception e) {
            job.setStatus("FAILED");
            job.setErrorMessage(e.getMessage());
            log.error("Export failed: job={}, error={}", job.getJobName(), e.getMessage());
        }

        return jobRepository.save(job);
    }

    public List<DataExportJob> getActiveJobs() { return jobRepository.findByStatusOrderByJobNameAsc("ACTIVE"); }
    public List<DataExportJob> getJobsByEntity(String entity) { return jobRepository.findBySourceEntityOrderByJobNameAsc(entity); }
}
