package com.cbs.cardswitch.service;

import com.cbs.cardswitch.entity.CardSwitchTransaction;
import com.cbs.cardswitch.repository.CardSwitchTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CardSwitchService {
    private final CardSwitchTransactionRepository repository;

    @Transactional
    public CardSwitchTransaction processTransaction(CardSwitchTransaction txn) {
        txn.setSwitchRef("CSW-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        txn.setIsDeclined(!"00".equals(txn.getResponseCode()));
        txn.setProcessedAt(Instant.now());
        return repository.save(txn);
    }

    public Iso8583Message buildAuthorizationRequest(CardAuthorizationRequest request) {
        Map<Integer, String> fields = new HashMap<>();
        fields.put(2, request.pan());
        fields.put(3, request.processingCode() != null ? request.processingCode() : "000000");
        fields.put(4, formatMinorUnits(request.amount()));
        fields.put(7, Instant.now().atZone(ZoneOffset.UTC).format(DateTimeFormatter.ofPattern("MMddHHmmss")));
        fields.put(11, request.stan() != null
                ? String.format("%06d", Integer.parseInt(request.stan()))
                : String.format("%06d", ThreadLocalRandom.current().nextInt(0, 1_000_000)));
        fields.put(49, request.currencyNumericCode() != null ? request.currencyNumericCode() : "566");
        return new Iso8583Message("0100", fields);
    }

    public String mapResponseCode(String responseCode) {
        return switch (responseCode) {
            case "00" -> "APPROVED";
            case "05" -> "DO_NOT_HONOUR";
            case "14" -> "INVALID_CARD";
            case "51" -> "INSUFFICIENT_FUNDS";
            default -> "UNKNOWN";
        };
    }

    public List<CardSwitchTransaction> getByScheme(String scheme, Instant from, Instant to) {
        return repository.findByCardSchemeAndProcessedAtBetweenOrderByProcessedAtDesc(scheme, from, to);
    }

    public List<CardSwitchTransaction> getByMerchant(String merchantId) {
        return repository.findByMerchantIdOrderByProcessedAtDesc(merchantId);
    }

    public List<CardSwitchTransaction> getDeclines() {
        return repository.findByIsDeclinedTrueOrderByProcessedAtDesc();
    }

    public Map<String, Object> getStatsByScheme(String scheme, LocalDate date) {
        Instant from = date.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant to = date.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        long total = repository.countByCardSchemeAndProcessedAtBetween(scheme, from, to);
        long approved = repository.countByCardSchemeAndIsDeclinedFalseAndProcessedAtBetween(scheme, from, to);
        long declined = repository.countByCardSchemeAndIsDeclinedTrueAndProcessedAtBetween(scheme, from, to);
        BigDecimal approvalRate = total > 0
                ? BigDecimal.valueOf(approved).divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"))
                : BigDecimal.ZERO;
        return Map.of("scheme", scheme, "date", date.toString(), "total", total,
                "approved", approved, "declined", declined, "approvalRatePct", approvalRate);
    }

    private String formatMinorUnits(BigDecimal amount) {
        long value = amount.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
        return String.format("%012d", value);
    }

    public record CardAuthorizationRequest(
            String pan,
            String processingCode,
            BigDecimal amount,
            String stan,
            String currencyNumericCode
    ) { }

    public record Iso8583Message(String mti, Map<Integer, String> fields) {
        public String getField(int fieldNumber) {
            return fields.get(fieldNumber);
        }
    }
}
