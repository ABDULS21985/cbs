package com.cbs.datalake.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.datalake.entity.DataExportJob;
import com.cbs.datalake.service.DataLakeService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/data-lake") @RequiredArgsConstructor
@Tag(name = "Data Lakehouse", description = "Export jobs to cloud storage (S3/GCS/Azure Blob) in Parquet/CSV/JSON/Avro")
public class DataLakeController {

    private final DataLakeService dataLakeService;

    @PostMapping("/jobs")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DataExportJob>> createJob(@RequestBody DataExportJob job) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(dataLakeService.createJob(job)));
    }

    @PostMapping("/jobs/{id}/execute")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<DataExportJob>> execute(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(dataLakeService.executeJob(id)));
    }

    @GetMapping("/jobs")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<DataExportJob>>> getActiveJobs() {
        return ResponseEntity.ok(ApiResponse.ok(dataLakeService.getActiveJobs()));
    }

    @GetMapping("/jobs/entity/{entity}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<List<DataExportJob>>> getByEntity(@PathVariable String entity) {
        return ResponseEntity.ok(ApiResponse.ok(dataLakeService.getJobsByEntity(entity)));
    }
}
