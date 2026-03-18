package com.cbs.cardswitch.service;

import com.cbs.cardswitch.entity.CardSwitchTransaction;
import com.cbs.cardswitch.repository.CardSwitchTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
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
}
