package com.cbs.datalake.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.datalake.entity.DataExportJob;
import com.cbs.datalake.repository.DataExportJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.io.OutputStream;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class DataLakeService {

    private static final Pattern IDENTIFIER_PATTERN = Pattern.compile("[A-Za-z_][A-Za-z0-9_]*");

    private final DataExportJobRepository jobRepository;
    private final DataSource dataSource;

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
            ExportResult exportResult = export(job);

            job.setLastRunAt(Instant.now());
            job.setLastRecordCount(exportResult.recordCount());
            job.setLastFileSizeBytes(exportResult.fileSize());
            job.setLastDurationMs((int)(System.currentTimeMillis() - startTime));
            job.setLastExportedDate(exportResult.lastExportedDate());
            job.setStatus("ACTIVE");
            job.setErrorMessage(null);
            job.setUpdatedAt(Instant.now());

            log.info("Export completed: job={}, records={}, size={}KB, time={}ms",
                    job.getJobName(), exportResult.recordCount(), exportResult.fileSize() / 1024, job.getLastDurationMs());
        } catch (Exception e) {
            job.setLastRunAt(Instant.now());
            job.setLastDurationMs((int)(System.currentTimeMillis() - startTime));
            job.setStatus("FAILED");
            job.setErrorMessage(e.getMessage());
            job.setUpdatedAt(Instant.now());
            log.error("Export failed: job={}, error={}", job.getJobName(), e.getMessage());
        }

        return jobRepository.save(job);
    }

    public List<DataExportJob> getActiveJobs() { return jobRepository.findByStatusOrderByJobNameAsc("ACTIVE"); }
    public List<DataExportJob> getJobsByEntity(String entity) { return jobRepository.findBySourceEntityOrderByJobNameAsc(entity); }

    private ExportResult export(DataExportJob job) throws Exception {
        String destinationType = normalize(job.getDestinationType());
        if (!"LOCAL".equals(destinationType)) {
            throw new BusinessException("Direct export currently supports LOCAL destinations only");
        }

        String format = normalize(job.getExportFormat());
        if (!"CSV".equals(format) && !"JSON".equals(format)) {
            throw new BusinessException("Direct export currently supports CSV and JSON formats only");
        }

        Path outputPath = Path.of(requireText(job.getDestinationPath(), "destinationPath")).toAbsolutePath().normalize();
        Path outputDir = outputPath.getParent();
        if (outputDir != null) {
            Files.createDirectories(outputDir);
        }

        ExportPlan plan = buildExportPlan(job, format);
        Path tempFile = Files.createTempFile(outputDir != null ? outputDir : outputPath.getParent(), outputPath.getFileName().toString() + ".", ".part");

        try (Connection connection = dataSource.getConnection()) {
            int recordCount = Math.toIntExact(queryForLong(connection, plan.countSql(), plan.sinceDate()));
            runCopyExport(connection, plan.copySql(), tempFile);
            long fileSize = Files.size(tempFile);
            LocalDate lastExportedDate = plan.maxDateSql() != null
                    ? queryForDate(connection, plan.maxDateSql(), plan.sinceDate())
                    : null;

            Files.move(tempFile, outputPath, StandardCopyOption.REPLACE_EXISTING);
            return new ExportResult(
                    recordCount,
                    fileSize,
                    lastExportedDate != null
                            ? lastExportedDate
                            : job.getLastExportedDate() != null ? job.getLastExportedDate() : LocalDate.now()
            );
        } catch (Exception e) {
            Files.deleteIfExists(tempFile);
            throw e;
        }
    }

    private ExportPlan buildExportPlan(DataExportJob job, String format) {
        String tableName = qualifyTableName(requireText(job.getSourceEntity(), "sourceEntity"));
        String queryWhereClause = "";
        String copyWhereClause = "";
        LocalDate sinceDate = null;
        String dateColumn = null;

        if (hasText(job.getDateColumn())) {
            dateColumn = quoteIdentifier(job.getDateColumn());
            if (Boolean.TRUE.equals(job.getIncremental()) && job.getLastExportedDate() != null) {
                sinceDate = job.getLastExportedDate();
                queryWhereClause = " WHERE (" + dateColumn + ")::date > ?";
                copyWhereClause = " WHERE (" + dateColumn + ")::date > DATE '" + sinceDate + "'";
            }
        }

        String selectSql = "SELECT * FROM " + tableName + copyWhereClause;
        String copySql = switch (format) {
            case "CSV" -> "COPY (" + selectSql + ") TO STDOUT WITH (FORMAT CSV, HEADER TRUE)";
            case "JSON" -> "COPY (SELECT row_to_json(t)::text FROM (" + selectSql + ") t) TO STDOUT";
            default -> throw new BusinessException("Unsupported export format: " + format);
        };

        String countSql = "SELECT COUNT(*) FROM " + tableName + queryWhereClause;
        String maxDateSql = dateColumn != null ? "SELECT MAX((" + dateColumn + ")::date) FROM " + tableName + queryWhereClause : null;
        return new ExportPlan(copySql, countSql, maxDateSql, sinceDate);
    }

    private void runCopyExport(Connection connection, String copySql, Path outputPath) throws Exception {
        Class<?> pgConnectionClass = Class.forName("org.postgresql.PGConnection");
        Object pgConnection = connection.unwrap(pgConnectionClass);
        Method getCopyApi = pgConnectionClass.getMethod("getCopyAPI");
        Object copyManager = getCopyApi.invoke(pgConnection);
        Method copyOut = copyManager.getClass().getMethod("copyOut", String.class, OutputStream.class);

        try (OutputStream outputStream = Files.newOutputStream(
                outputPath,
                StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING,
                StandardOpenOption.WRITE)) {
            copyOut.invoke(copyManager, copySql, outputStream);
        }
    }

    private long queryForLong(Connection connection, String sql, LocalDate sinceDate) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            bindSinceDate(statement, sinceDate);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next() ? resultSet.getLong(1) : 0L;
            }
        }
    }

    private LocalDate queryForDate(Connection connection, String sql, LocalDate sinceDate) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            bindSinceDate(statement, sinceDate);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next() ? resultSet.getObject(1, LocalDate.class) : null;
            }
        }
    }

    private void bindSinceDate(PreparedStatement statement, LocalDate sinceDate) throws Exception {
        if (sinceDate != null) {
            statement.setObject(1, sinceDate);
        }
    }

    private String qualifyTableName(String sourceEntity) {
        String[] parts = sourceEntity.split("\\.");
        if (parts.length == 1) {
            return quoteIdentifier("cbs") + "." + quoteIdentifier(parts[0]);
        }
        if (parts.length == 2) {
            return quoteIdentifier(parts[0]) + "." + quoteIdentifier(parts[1]);
        }
        throw new BusinessException("Invalid sourceEntity: " + sourceEntity);
    }

    private String quoteIdentifier(String identifier) {
        String normalized = requireText(identifier, "identifier").toLowerCase(Locale.ROOT);
        if (!IDENTIFIER_PATTERN.matcher(normalized).matches()) {
            throw new BusinessException("Invalid SQL identifier: " + identifier);
        }
        return "\"" + normalized + "\"";
    }

    private String requireText(String value, String fieldName) {
        if (!hasText(value)) {
            throw new BusinessException("Missing required field: " + fieldName);
        }
        return value.trim();
    }

    private String normalize(String value) {
        return requireText(value, "value").toUpperCase(Locale.ROOT);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private record ExportPlan(String copySql, String countSql, String maxDateSql, LocalDate sinceDate) {}
    private record ExportResult(int recordCount, long fileSize, LocalDate lastExportedDate) {}
}
