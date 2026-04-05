package com.cbs.integration.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.integration.entity.*;
import com.cbs.integration.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class Iso20022Service {

    private final Iso20022MessageRepository messageRepository;
    private final Iso20022CodeSetRepository codeSetRepository;

    // Known message definitions and their categories/functions
    private static final Map<String, String[]> MESSAGE_CATALOG = Map.ofEntries(
            Map.entry("pacs.008", new String[]{"PAYMENTS", "CREDIT_TRANSFER"}),
            Map.entry("pacs.002", new String[]{"PAYMENTS", "STATUS_REPORT"}),
            Map.entry("pacs.004", new String[]{"PAYMENTS", "RETURN"}),
            Map.entry("pacs.009", new String[]{"PAYMENTS", "CREDIT_TRANSFER"}),  // FI-to-FI
            Map.entry("pain.001", new String[]{"PAYMENTS", "CREDIT_TRANSFER"}),  // Customer init
            Map.entry("pain.002", new String[]{"PAYMENTS", "STATUS_REPORT"}),    // Customer status
            Map.entry("pain.008", new String[]{"PAYMENTS", "DIRECT_DEBIT"}),
            Map.entry("camt.053", new String[]{"CASH_MANAGEMENT", "STATEMENT"}),
            Map.entry("camt.054", new String[]{"CASH_MANAGEMENT", "NOTIFICATION"}),
            Map.entry("camt.056", new String[]{"PAYMENTS", "CANCELLATION"}),
            Map.entry("camt.029", new String[]{"PAYMENTS", "RESOLUTION"}),
            Map.entry("sese.023", new String[]{"SECURITIES", "NOTIFICATION"}),
            Map.entry("semt.017", new String[]{"SECURITIES", "STATEMENT"})
    );

    public String buildPacs008(CreditTransferDetails details) {
        String amount = details.amount().setScale(2, RoundingMode.HALF_UP).toPlainString();
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">
                  <FIToFICstmrCdtTrf>
                    <GrpHdr>
                      <MsgId>%s</MsgId>
                      <CreDtTm>%s</CreDtTm>
                      <NbOfTxs>1</NbOfTxs>
                      <TtlIntrBkSttlmAmt Ccy="%s">%s</TtlIntrBkSttlmAmt>
                    </GrpHdr>
                    <CdtTrfTxInf>
                      <PmtId>
                        <InstrId>%s</InstrId>
                        <EndToEndId>%s</EndToEndId>
                      </PmtId>
                      <IntrBkSttlmAmt Ccy="%s">%s</IntrBkSttlmAmt>
                      <Dbtr>
                        <Nm>%s</Nm>
                      </Dbtr>
                      <Cdtr>
                        <Nm>%s</Nm>
                      </Cdtr>
                    </CdtTrfTxInf>
                  </FIToFICstmrCdtTrf>
                </Document>
                """.formatted(
                escapeXml(details.messageId()),
                details.creationDateTime().toString(),
                escapeXml(details.currency()),
                amount,
                escapeXml(details.instructionId()),
                escapeXml(details.endToEndId()),
                escapeXml(details.currency()),
                amount,
                escapeXml(details.debtorName()),
                escapeXml(details.creditorName())
        );
    }

    /**
     * Escape XML special characters to prevent injection in generated ISO 20022 messages.
     */
    private String escapeXml(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }

    /**
     * Validate an ISO 20022 XML document against its XSD schema.
     * Returns a list of validation errors (empty if valid).
     * Currently a stub that performs basic structural checks; full XSD validation
     * requires loading schema files from the ISO 20022 catalogue.
     */
    public List<String> validateAgainstXsd(String xmlContent, String messageDefinition) {
        List<String> errors = new ArrayList<>();
        if (xmlContent == null || xmlContent.isBlank()) {
            errors.add("XSD: XML content is empty");
            return errors;
        }
        if (!xmlContent.contains("<?xml")) {
            errors.add("XSD: Missing XML declaration");
        }
        if (!xmlContent.contains("<Document")) {
            errors.add("XSD: Missing Document root element");
        }
        // TODO: Load actual XSD schema files and perform javax.xml.validation against them
        log.debug("XSD validation stub invoked for definition={}, {} structural checks performed", messageDefinition, errors.size() == 0 ? "passed" : "failed");
        return errors;
    }

    @Transactional
    public Iso20022Message ingestMessage(Iso20022Message message) {
        // Duplicate ingestion check: reject if same sender + same businessMessageId already ingested
        if (message.getBusinessMessageId() != null && message.getSenderBic() != null) {
            Optional<Iso20022Message> existing = messageRepository.findByBusinessMessageIdAndSenderBic(
                    message.getBusinessMessageId(), message.getSenderBic());
            if (existing.isPresent()) {
                log.warn("Duplicate ISO 20022 message rejected: bizMsgId={}, sender={}, existingId={}",
                        message.getBusinessMessageId(), message.getSenderBic(), existing.get().getMessageId());
                throw new BusinessException("Duplicate message: businessMessageId=" + message.getBusinessMessageId()
                        + " from sender " + message.getSenderBic() + " already ingested as " + existing.get().getMessageId());
            }
        }

        message.setMessageId("ISO-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());

        // Auto-fill category/function from message definition
        String defPrefix = extractDefinitionPrefix(message.getMessageDefinition());
        if (MESSAGE_CATALOG.containsKey(defPrefix)) {
            String[] meta = MESSAGE_CATALOG.get(defPrefix);
            if (message.getMessageCategory() == null) message.setMessageCategory(meta[0]);
            if (message.getMessageFunction() == null) message.setMessageFunction(meta[1]);
        }

        // Validate
        List<String> errors = validateMessage(message);
        if (errors.isEmpty()) {
            message.setValidationStatus("VALID");
            message.setStatus("VALIDATED");
        } else {
            message.setValidationStatus(errors.stream().anyMatch(e -> e.startsWith("SCHEMA:")) ? "SCHEMA_ERROR" : "BUSINESS_ERROR");
            message.setValidationErrors(errors);
            message.setStatus("REJECTED");
        }

        Iso20022Message saved = messageRepository.save(message);
        log.info("ISO 20022 message ingested: id={}, def={}, status={}, errors={}",
                saved.getMessageId(), saved.getMessageDefinition(), saved.getValidationStatus(), errors.size());
        return saved;
    }

    private List<String> validateMessage(Iso20022Message msg) {
        List<String> errors = new ArrayList<>();

        // Schema validation
        if (msg.getMessageDefinition() == null || !msg.getMessageDefinition().matches("\\w+\\.\\d{3}\\.\\d{3}\\.\\d{2}")) {
            errors.add("SCHEMA: Invalid message definition format — expected pattern like pacs.008.001.10");
        }

        // BIC validation
        if (msg.getSenderBic() != null && !msg.getSenderBic().matches("[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?")) {
            errors.add("BUSINESS: Invalid sender BIC format");
        }
        if (msg.getReceiverBic() != null && !msg.getReceiverBic().matches("[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?")) {
            errors.add("BUSINESS: Invalid receiver BIC format");
        }

        // Amount validation
        if (msg.getTotalAmount() != null && msg.getTotalAmount().signum() < 0) {
            errors.add("BUSINESS: Total amount cannot be negative");
        }

        // Currency validation (ISO 4217)
        if (msg.getCurrency() != null && !msg.getCurrency().matches("[A-Z]{3}")) {
            errors.add("BUSINESS: Invalid currency code — expected ISO 4217 (3 uppercase letters)");
        }

        // Creation date must not be in the future
        if (msg.getCreationDateTime() != null && msg.getCreationDateTime().isAfter(Instant.now().plusSeconds(60))) {
            errors.add("BUSINESS: Creation date-time is in the future");
        }

        return errors;
    }

    @Transactional
    public Iso20022Message updateStatus(String messageId, String newStatus) {
        Iso20022Message msg = messageRepository.findByMessageId(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Iso20022Message", "messageId", messageId));
        msg.setStatus(newStatus);
        msg.setUpdatedAt(Instant.now());
        return messageRepository.save(msg);
    }

    // ── Code Set Lookup ──────────────────────────────────────

    public String lookupCode(String codeSetName, String code) {
        return codeSetRepository.findByCodeSetNameAndCode(codeSetName, code)
                .map(Iso20022CodeSet::getDisplayName).orElse("Unknown code: " + code);
    }

    public List<Iso20022CodeSet> getCodeSet(String codeSetName) {
        return codeSetRepository.findByCodeSetNameAndIsActiveTrueOrderByCodeAsc(codeSetName);
    }

    // ── SWIFT MT to ISO 20022 Migration Helper ───────────────

    public Map<String, String> getSwiftToIsoMapping() {
        return Map.ofEntries(
                Map.entry("MT103", "pacs.008.001.10"),  // Single Customer Credit Transfer
                Map.entry("MT202", "pacs.009.001.10"),  // FI-to-FI Credit Transfer
                Map.entry("MT900", "camt.054.001.11"),  // Confirmation of Debit
                Map.entry("MT910", "camt.054.001.11"),  // Confirmation of Credit
                Map.entry("MT940", "camt.053.001.11"),  // Customer Statement
                Map.entry("MT950", "camt.053.001.11"),  // Statement Message
                Map.entry("MT199", "camt.056.001.10"),  // Free Format (mapped to cancellation)
                Map.entry("MT192", "camt.056.001.10"),  // Request for Cancellation
                Map.entry("MT101", "pain.001.001.11"),  // Request for Transfer
                Map.entry("MT104", "pain.008.001.10")   // Direct Debit
        );
    }

    public List<Iso20022Message> getByStatus(String status) { return messageRepository.findByStatusOrderByCreatedAtAsc(status); }
    public List<Iso20022Message> getAllMessages() { return messageRepository.findAll(); }

    private String extractDefinitionPrefix(String definition) {
        if (definition == null) return "";
        String[] parts = definition.split("\\.");
        return parts.length >= 2 ? parts[0] + "." + parts[1] : definition;
    }

    public record CreditTransferDetails(
            String messageId,
            String instructionId,
            String endToEndId,
            Instant creationDateTime,
            String debtorName,
            String creditorName,
            BigDecimal amount,
            String currency
    ) {}
}
