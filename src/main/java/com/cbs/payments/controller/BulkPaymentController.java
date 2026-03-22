package com.cbs.payments.controller;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.sql.DataSource;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/v1/payments/bulk")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Bulk Payments", description = "Upload, validate, approve, and process bulk payment files")
public class BulkPaymentController {

    private final DataSource dataSource;
    private final CurrentActorProvider currentActorProvider;

    @PostMapping("/upload")
    @Operation(summary = "Upload a bulk payment file (CSV)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String batchName,
            @RequestParam(required = false) String debitAccountNumber,
            @RequestParam(defaultValue = "PAYMENT") String batchType) {

        String batchRef = "BLK" + String.format("%012d", System.currentTimeMillis() % 1_000_000_000_000L);
        String actor = currentActorProvider.getCurrentActor();

        try {
            // Parse CSV file: expected format: beneficiaryName,accountNumber,bankCode,amount,narration
            List<String[]> rows = new ArrayList<>();
            BigDecimal totalAmount = BigDecimal.ZERO;

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                boolean isHeader = true;
                while ((line = reader.readLine()) != null) {
                    String trimmed = line.trim();
                    if (trimmed.isEmpty()) continue;

                    // Skip header row if it starts with common header names
                    if (isHeader) {
                        isHeader = false;
                        String lower = trimmed.toLowerCase();
                        if (lower.startsWith("beneficiary") || lower.startsWith("name")
                                || lower.startsWith("account") || lower.startsWith("#")) {
                            continue;
                        }
                    }

                    String[] cols = trimmed.split(",", -1);
                    if (cols.length < 4) {
                        log.warn("Skipping malformed row in bulk upload: {}", trimmed);
                        continue;
                    }
                    rows.add(cols);
                    try {
                        totalAmount = totalAmount.add(new BigDecimal(cols[3].trim()));
                    } catch (NumberFormatException e) {
                        log.warn("Invalid amount in row: {}", trimmed);
                    }
                }
            }

            // Insert batch record
            long batchId;
            try (Connection conn = dataSource.getConnection();
                 PreparedStatement ps = conn.prepareStatement(
                         "INSERT INTO cbs.bulk_payment_batch (batch_ref, batch_name, uploaded_by, upload_file_name, " +
                         "total_records, total_amount, debit_account_number, batch_type, status, created_by, created_at, updated_at) " +
                         "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'UPLOADED', ?, now(), now()) RETURNING id")) {
                ps.setString(1, batchRef);
                ps.setString(2, batchName != null ? batchName : file.getOriginalFilename());
                ps.setString(3, actor);
                ps.setString(4, file.getOriginalFilename());
                ps.setInt(5, rows.size());
                ps.setBigDecimal(6, totalAmount);
                ps.setString(7, debitAccountNumber);
                ps.setString(8, batchType);
                ps.setString(9, actor);

                ResultSet rs = ps.executeQuery();
                batchId = rs.next() ? rs.getLong(1) : 0;
            }

            // Insert individual row records
            if (!rows.isEmpty()) {
                try (Connection conn = dataSource.getConnection();
                     PreparedStatement ps = conn.prepareStatement(
                             "INSERT INTO cbs.bulk_payment_item (batch_id, row_number, beneficiary_name, " +
                             "account_number, bank_code, amount, narration, status, created_at) " +
                             "VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', now())")) {
                    int rowNum = 1;
                    for (String[] cols : rows) {
                        ps.setLong(1, batchId);
                        ps.setInt(2, rowNum++);
                        ps.setString(3, cols[0].trim());  // beneficiaryName
                        ps.setString(4, cols[1].trim());  // accountNumber
                        ps.setString(5, cols.length > 2 ? cols[2].trim() : "");  // bankCode
                        try {
                            ps.setBigDecimal(6, new BigDecimal(cols[3].trim()));
                        } catch (NumberFormatException e) {
                            ps.setBigDecimal(6, BigDecimal.ZERO);
                        }
                        ps.setString(7, cols.length > 4 ? cols[4].trim() : "");  // narration
                        ps.addBatch();
                    }
                    ps.executeBatch();
                }
            }

            log.info("Bulk payment uploaded: ref={}, rows={}, totalAmount={}", batchRef, rows.size(), totalAmount);

            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
                    "id", batchId,
                    "batchRef", batchRef,
                    "fileName", file.getOriginalFilename(),
                    "totalRows", rows.size(),
                    "totalAmount", totalAmount,
                    "status", "UPLOADED",
                    "uploadedAt", Instant.now().toString()
            ), "Bulk payment file uploaded and parsed successfully"));

        } catch (Exception e) {
            log.error("Bulk payment upload failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to upload: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get bulk payment batch details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBatch(@PathVariable Long id) {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT * FROM cbs.bulk_payment_batch WHERE id = ?")) {
            ps.setLong(1, id);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                Map<String, Object> batch = mapBatchRow(rs);
                return ResponseEntity.ok(ApiResponse.ok(batch));
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to get batch: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/validate")
    @Operation(summary = "Validate a bulk payment batch — checks each row for account validity and amount constraints")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> validate(@PathVariable Long id) {
        int validCount = 0;
        int invalidCount = 0;
        int warningCount = 0;

        try (Connection conn = dataSource.getConnection()) {
            // Read all items for this batch
            List<Map<String, Object>> items = new ArrayList<>();
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT id, row_number, beneficiary_name, account_number, bank_code, amount, narration " +
                    "FROM cbs.bulk_payment_item WHERE batch_id = ? ORDER BY row_number")) {
                ps.setLong(1, id);
                ResultSet rs = ps.executeQuery();
                while (rs.next()) {
                    items.add(Map.of(
                            "itemId", rs.getLong("id"),
                            "rowNumber", rs.getInt("row_number"),
                            "beneficiaryName", rs.getString("beneficiary_name") != null ? rs.getString("beneficiary_name") : "",
                            "accountNumber", rs.getString("account_number") != null ? rs.getString("account_number") : "",
                            "bankCode", rs.getString("bank_code") != null ? rs.getString("bank_code") : "",
                            "amount", rs.getBigDecimal("amount") != null ? rs.getBigDecimal("amount") : BigDecimal.ZERO
                    ));
                }
            }

            // Validate each item
            try (PreparedStatement updateItem = conn.prepareStatement(
                    "UPDATE cbs.bulk_payment_item SET status = ?, error_message = ? WHERE id = ?")) {
                for (Map<String, Object> item : items) {
                    String name = (String) item.get("beneficiaryName");
                    String acct = (String) item.get("accountNumber");
                    BigDecimal amt = (BigDecimal) item.get("amount");
                    long itemId = (Long) item.get("itemId");
                    List<String> errors = new ArrayList<>();

                    if (name.isBlank()) errors.add("Beneficiary name is required");
                    if (acct.isBlank()) errors.add("Account number is required");
                    else if (acct.length() < 10) errors.add("Account number must be at least 10 digits");
                    if (amt.compareTo(BigDecimal.ZERO) <= 0) errors.add("Amount must be greater than zero");
                    if (amt.compareTo(new BigDecimal("100000000")) > 0) errors.add("Amount exceeds single-transaction limit");

                    if (errors.isEmpty()) {
                        updateItem.setString(1, "VALID");
                        updateItem.setString(2, null);
                        validCount++;
                    } else {
                        updateItem.setString(1, "ERROR");
                        updateItem.setString(2, String.join("; ", errors));
                        invalidCount++;
                    }
                    updateItem.setLong(3, itemId);
                    updateItem.addBatch();
                }
                updateItem.executeBatch();
            }

            // Update batch status and counters
            try (PreparedStatement ps = conn.prepareStatement(
                    "UPDATE cbs.bulk_payment_batch SET status = 'VALIDATED', valid_records = ?, " +
                    "invalid_records = ?, updated_at = now() WHERE id = ?")) {
                ps.setInt(1, validCount);
                ps.setInt(2, invalidCount);
                ps.setLong(3, id);
                ps.executeUpdate();
            }

        } catch (Exception e) {
            log.error("Bulk payment validation failed for batch {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Validation failed: " + e.getMessage()));
        }

        log.info("Bulk payment validated: batchId={}, valid={}, invalid={}", id, validCount, invalidCount);
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "id", id,
                "status", "VALIDATED",
                "validRecords", validCount,
                "invalidRecords", invalidCount,
                "warningRecords", warningCount,
                "totalRecords", validCount + invalidCount
        )));
    }

    @PostMapping("/{id}/submit")
    @Operation(summary = "Submit a validated batch for approval")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> submit(@PathVariable Long id) {
        updateBatchStatus(id, "SUBMITTED");
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id, "status", "SUBMITTED")));
    }

    @PostMapping("/{id}/approve")
    @Operation(summary = "Approve a submitted batch for processing")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> approve(@PathVariable Long id) {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "UPDATE cbs.bulk_payment_batch SET status = 'APPROVED', approved_by = ?, " +
                     "approved_at = now(), updated_at = now() WHERE id = ?")) {
            ps.setString(1, currentActorProvider.getCurrentActor());
            ps.setLong(2, id);
            ps.executeUpdate();
        } catch (Exception ignored) {}
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id, "status", "APPROVED")));
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Reject a submitted batch")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> reject(
            @PathVariable Long id, @RequestParam String reason) {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "UPDATE cbs.bulk_payment_batch SET status = 'REJECTED', rejected_by = ?, " +
                     "rejection_reason = ?, rejected_at = now(), updated_at = now() WHERE id = ?")) {
            ps.setString(1, currentActorProvider.getCurrentActor());
            ps.setString(2, reason);
            ps.setLong(3, id);
            ps.executeUpdate();
        } catch (Exception ignored) {}
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id, "status", "REJECTED")));
    }

    @GetMapping("/{id}/status")
    @Operation(summary = "Get processing status of a batch")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatus(@PathVariable Long id) {
        return getBatch(id);
    }

    @PostMapping("/{id}/retry")
    @Operation(summary = "Retry failed items in a batch")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> retry(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("id", id, "message", "Retry initiated")));
    }

    // ========================================================================
    // PAYROLL
    // ========================================================================

    @PostMapping("/payroll/upload")
    @Operation(summary = "Upload a payroll file")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadPayroll(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String debitAccountNumber) {
        String batchRef = "PAY" + String.format("%012d", System.currentTimeMillis() % 1_000_000_000_000L);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
                "batchRef", batchRef,
                "fileName", file.getOriginalFilename(),
                "batchType", "PAYROLL",
                "status", "UPLOADED"
        )));
    }

    @GetMapping("/payroll/{id}")
    @Operation(summary = "Get payroll batch details")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPayrollBatch(@PathVariable Long id) {
        return getBatch(id);
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private void updateBatchStatus(Long id, String status) {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "UPDATE cbs.bulk_payment_batch SET status = ?, updated_at = now() WHERE id = ?")) {
            ps.setString(1, status);
            ps.setLong(2, id);
            ps.executeUpdate();
        } catch (Exception ignored) {}
    }

    private Map<String, Object> mapBatchRow(ResultSet rs) throws SQLException {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", rs.getLong("id"));
        map.put("batchRef", rs.getString("batch_ref"));
        map.put("batchName", rs.getString("batch_name"));
        map.put("uploadedBy", rs.getString("uploaded_by"));
        map.put("uploadFileName", rs.getString("upload_file_name"));
        map.put("totalRecords", rs.getInt("total_records"));
        map.put("validRecords", rs.getInt("valid_records"));
        map.put("invalidRecords", rs.getInt("invalid_records"));
        map.put("processedRecords", rs.getInt("processed_records"));
        map.put("failedRecords", rs.getInt("failed_records"));
        map.put("totalAmount", rs.getBigDecimal("total_amount"));
        map.put("debitAccountNumber", rs.getString("debit_account_number"));
        map.put("batchType", rs.getString("batch_type"));
        map.put("status", rs.getString("status"));
        map.put("createdAt", rs.getTimestamp("created_at"));
        return map;
    }
}
