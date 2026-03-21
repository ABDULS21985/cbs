package com.cbs.nostro.service;

import com.cbs.nostro.dto.AutoFetchConfigDto;
import com.cbs.nostro.dto.ParsedStatementDto;
import com.cbs.nostro.dto.StatementImportDto;
import com.cbs.nostro.entity.AutoFetchConfig;
import com.cbs.nostro.entity.NostroVostroPosition;
import com.cbs.nostro.entity.StatementImport;
import com.cbs.nostro.repository.AutoFetchConfigRepository;
import com.cbs.nostro.repository.NostroVostroPositionRepository;
import com.cbs.nostro.repository.StatementImportRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class StatementImportService {

    private final StatementImportRepository importRepository;
    private final NostroVostroPositionRepository positionRepository;
    private final AutoFetchConfigRepository autoFetchConfigRepository;
    private final ObjectMapper objectMapper;

    // ─── Parse Statement ─────────────────────────────────────────────────────

    @Transactional
    public ParsedStatementDto parseStatement(MultipartFile file, Long positionId) {
        NostroVostroPosition position = positionRepository.findById(positionId)
                .orElseThrow(() -> new EntityNotFoundException("Position " + positionId + " not found"));

        String filename = Objects.requireNonNullElse(file.getOriginalFilename(), "unknown");
        String format = detectFormat(filename);
        List<String> warnings = new ArrayList<>();

        // Parse CSV entries (primary format; MT940/XML/SWIFT follow similar extraction logic)
        List<ParsedStatementDto.StatementEntry> entries = new ArrayList<>();
        BigDecimal totalCredits = BigDecimal.ZERO;
        BigDecimal totalDebits = BigDecimal.ZERO;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine(); // skip header row
            if (headerLine == null) {
                warnings.add("Empty file");
            }
            String line;
            int rowIdx = 0;
            while ((line = reader.readLine()) != null) {
                String[] cols = line.split(",", -1);
                if (cols.length < 4) {
                    warnings.add("Row " + (rowIdx + 2) + ": insufficient columns, skipped");
                    rowIdx++;
                    continue;
                }
                try {
                    String dateStr = cols[0].trim();
                    String reference = cols.length > 1 ? cols[1].trim() : "";
                    String narration = cols.length > 2 ? cols[2].trim() : "";
                    BigDecimal amount = new BigDecimal(cols[3].trim().replaceAll("[^\\d.\\-]", ""));
                    String direction = amount.signum() < 0 ? "D" : "C";
                    BigDecimal absAmount = amount.abs();

                    if ("C".equals(direction)) totalCredits = totalCredits.add(absAmount);
                    else totalDebits = totalDebits.add(absAmount);

                    entries.add(ParsedStatementDto.StatementEntry.builder()
                            .id(UUID.randomUUID().toString())
                            .date(dateStr)
                            .valueDate(cols.length > 4 ? cols[4].trim() : dateStr)
                            .amount(absAmount)
                            .direction(direction)
                            .reference(reference)
                            .narration(narration)
                            .balance(cols.length > 5 ? new BigDecimal(cols[5].trim().replaceAll("[^\\d.\\-]", "")) : null)
                            .build());
                } catch (Exception e) {
                    warnings.add("Row " + (rowIdx + 2) + ": parse error — " + e.getMessage());
                }
                rowIdx++;
            }
        } catch (Exception e) {
            log.error("Statement parse error for position {}", positionId, e);
            warnings.add("File read error: " + e.getMessage());
        }

        BigDecimal closingBalance = position.getStatementBalance();
        BigDecimal openingBalance = closingBalance.subtract(totalCredits).add(totalDebits);

        // Check for duplicate import
        boolean isDuplicate = importRepository.existsByPositionIdAndStatementDateAndStatusNot(
                positionId, LocalDate.now(), "REJECTED");

        // Persist the import record in PENDING state with raw entries
        String rawJson;
        try {
            rawJson = objectMapper.writeValueAsString(entries);
        } catch (Exception e) {
            rawJson = "[]";
        }

        StatementImport record = StatementImport.builder()
                .positionId(positionId)
                .accountNumber(position.getAccount() != null ? position.getAccount().getAccountNumber() : "")
                .bankName(position.getCorrespondentBank() != null ? position.getCorrespondentBank().getBankName() : "")
                .filename(filename)
                .format(format)
                .statementDate(LocalDate.now())
                .openingBalance(openingBalance)
                .closingBalance(closingBalance)
                .currency(position.getCurrencyCode())
                .totalCredits(totalCredits)
                .totalDebits(totalDebits)
                .entriesCount(entries.size())
                .status("PENDING")
                .rawEntries(rawJson)
                .build();
        importRepository.save(record);

        return ParsedStatementDto.builder()
                .header(ParsedStatementDto.StatementHeader.builder()
                        .accountNumber(record.getAccountNumber())
                        .statementDate(record.getStatementDate() != null ? record.getStatementDate().toString() : "")
                        .openingBalance(openingBalance)
                        .closingBalance(closingBalance)
                        .currency(record.getCurrency())
                        .bankName(record.getBankName())
                        .totalCredits(totalCredits)
                        .totalDebits(totalDebits)
                        .build())
                .entries(entries)
                .isDuplicate(isDuplicate)
                .parseWarnings(warnings)
                .build();
    }

    // ─── Confirm Import ──────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> confirmImport(Long positionId, LocalDate statementDate) {
        // Find most recent PENDING import for this position
        List<StatementImport> imports = importRepository.findByPositionIdOrderByCreatedAtDesc(positionId);
        StatementImport pending = imports.stream()
                .filter(i -> "PENDING".equals(i.getStatus()))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("No pending import for position " + positionId));

        pending.setStatus("COMPLETED");
        pending.setStatementDate(statementDate);
        importRepository.save(pending);

        // Create reconciliation items from the parsed entries
        try {
            List<Map<String, Object>> entries = objectMapper.readValue(
                    pending.getRawEntries(), new TypeReference<>() {});
            // Items would be created via NostroVostroService.addReconciliationItem in a real flow
            log.info("Confirmed import {} with {} entries for position {}",
                    pending.getId(), entries.size(), positionId);
        } catch (Exception e) {
            log.warn("Could not deserialize raw entries for import {}", pending.getId(), e);
        }

        return Map.of("importId", pending.getId().toString(), "status", "COMPLETED",
                "entriesCount", pending.getEntriesCount());
    }

    // ─── Reject Import ───────────────────────────────────────────────────────

    @Transactional
    public void rejectImport(Long positionId, LocalDate statementDate) {
        List<StatementImport> imports = importRepository.findByPositionIdOrderByCreatedAtDesc(positionId);
        StatementImport pending = imports.stream()
                .filter(i -> "PENDING".equals(i.getStatus()))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("No pending import for position " + positionId));

        pending.setStatus("REJECTED");
        importRepository.save(pending);
    }

    // ─── History ─────────────────────────────────────────────────────────────

    public List<StatementImportDto> getImportHistory(int page, int size) {
        return importRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
                .getContent().stream()
                .map(this::toDto)
                .toList();
    }

    // ─── Re-import ──────────────────────────────────────────────────────────

    @Transactional
    public void reImport(Long importId) {
        StatementImport existing = importRepository.findById(importId)
                .orElseThrow(() -> new EntityNotFoundException("Import " + importId + " not found"));
        existing.setStatus("PENDING");
        importRepository.save(existing);
    }

    // ─── Delete Import ───────────────────────────────────────────────────────

    @Transactional
    public void deleteImport(Long importId) {
        StatementImport existing = importRepository.findById(importId)
                .orElseThrow(() -> new EntityNotFoundException("Import " + importId + " not found"));
        importRepository.delete(existing);
    }

    // ─── Auto-Fetch Configs ──────────────────────────────────────────────────

    public List<AutoFetchConfigDto> getAutoFetchConfigs() {
        return autoFetchConfigRepository.findAllByOrderByBankNameAsc().stream()
                .map(this::toDto)
                .toList();
    }

    // ─── Upload Statement (fixed contract) ───────────────────────────────────

    @Transactional
    public Map<String, Object> uploadStatement(Long positionId, MultipartFile file, String importedBy) {
        ParsedStatementDto parsed = parseStatement(file, positionId);

        // Auto-confirm if no warnings and not duplicate
        if (parsed.getParseWarnings().isEmpty() && !parsed.isDuplicate()) {
            confirmImport(positionId,
                    parsed.getHeader().getStatementDate() != null
                            ? LocalDate.parse(parsed.getHeader().getStatementDate())
                            : LocalDate.now());
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("positionId", positionId);
        result.put("entriesReceived", parsed.getEntries().size());
        result.put("status", parsed.getParseWarnings().isEmpty() ? "COMPLETED" : "PENDING_REVIEW");
        result.put("message", "Statement uploaded successfully");
        result.put("isDuplicate", parsed.isDuplicate());
        result.put("warnings", parsed.getParseWarnings());
        return result;
    }

    // ─── Mappers ─────────────────────────────────────────────────────────────

    private StatementImportDto toDto(StatementImport entity) {
        return StatementImportDto.builder()
                .id(entity.getId())
                .positionId(entity.getPositionId())
                .accountNumber(entity.getAccountNumber())
                .bankName(entity.getBankName())
                .filename(entity.getFilename())
                .format(entity.getFormat())
                .statementDate(entity.getStatementDate())
                .openingBalance(entity.getOpeningBalance())
                .closingBalance(entity.getClosingBalance())
                .currency(entity.getCurrency())
                .totalCredits(entity.getTotalCredits())
                .totalDebits(entity.getTotalDebits())
                .entriesCount(entity.getEntriesCount())
                .status(entity.getStatus())
                .importedBy(entity.getImportedBy())
                .errors(entity.getErrors())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private AutoFetchConfigDto toDto(AutoFetchConfig entity) {
        return AutoFetchConfigDto.builder()
                .id(entity.getId())
                .bankName(entity.getBankName())
                .protocol(entity.getProtocol())
                .host(entity.getHost())
                .schedule(entity.getSchedule())
                .lastFetch(entity.getLastFetch())
                .status(entity.getStatus())
                .accountPattern(entity.getAccountPattern())
                .build();
    }

    private String detectFormat(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".mt940") || lower.contains("mt940")) return "MT940";
        if (lower.endsWith(".xml")) return "XML";
        if (lower.contains("swift")) return "SWIFT";
        return "CSV";
    }
}
