package com.cbs.cardclearing.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.cardclearing.entity.*;
import com.cbs.cardclearing.repository.*;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CardClearingService {
    private final CardClearingBatchRepository batchRepository;
    private final CardSettlementPositionRepository positionRepository;

    private static final Set<String> VALID_POSITION_STATUSES = Set.of("PENDING", "CALCULATED", "CONFIRMED", "SETTLED", "DISPUTED");

    @Transactional
    public CardClearingBatch ingestBatch(CardClearingBatch batch) {
        batch.setBatchId("CCB-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        batch.setNetSettlementAmount(batch.getTotalAmount().subtract(batch.getTotalFees()).subtract(batch.getInterchangeAmount()));
        CardClearingBatch saved = batchRepository.save(batch);
        log.info("Card clearing batch ingested: id={}, network={}, txns={}, amount={}", saved.getBatchId(), saved.getNetwork(), saved.getTotalTransactions(), saved.getTotalAmount());
        return saved;
    }
    @Transactional
    public CardClearingBatch settle(String batchId) {
        CardClearingBatch b = batchRepository.findByBatchId(batchId).orElseThrow(() -> new ResourceNotFoundException("CardClearingBatch", "batchId", batchId));
        b.setStatus("SETTLED"); b.setSettlementDate(LocalDate.now()); b.setReconciledAt(Instant.now());
        return batchRepository.save(b);
    }
    @Transactional
    public CardSettlementPosition createPosition(CardSettlementPosition position) {
        position.setNetPosition(position.getGrossCredits().subtract(position.getGrossDebits())
                .add(position.getInterchangeReceivable()).subtract(position.getInterchangePayable()).subtract(position.getSchemeFees()));
        return positionRepository.save(position);
    }

    /** Update the status of an existing settlement position (e.g. PENDING → CONFIRMED, DISPUTED). */
    @Transactional
    public CardSettlementPosition updatePositionStatus(Long id, String status, String notes) {
        if (!VALID_POSITION_STATUSES.contains(status)) {
            throw new IllegalArgumentException("Invalid position status: " + status + ". Valid: " + VALID_POSITION_STATUSES);
        }
        CardSettlementPosition pos = positionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CardSettlementPosition", "id", id));
        String previousStatus = pos.getStatus();
        pos.setStatus(status);
        if ("SETTLED".equals(status)) {
            pos.setSettledAt(Instant.now());
        }
        CardSettlementPosition saved = positionRepository.save(pos);
        log.info("Settlement position status updated: id={}, {} → {}, notes={}", id, previousStatus, status, notes != null ? notes : "");
        return saved;
    }

    /** Escalate a settlement position — marks as DISPUTED and logs escalation. */
    @Transactional
    public CardSettlementPosition escalatePosition(Long id, String reason) {
        CardSettlementPosition pos = positionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CardSettlementPosition", "id", id));
        String previousStatus = pos.getStatus();
        pos.setStatus("DISPUTED");
        CardSettlementPosition saved = positionRepository.save(pos);
        log.warn("Settlement position ESCALATED: id={}, {} → DISPUTED, reason={}", id, previousStatus, reason != null ? reason : "No reason provided");
        return saved;
    }

    /** Get a single batch by its batchId reference. */
    public CardClearingBatch getBatchByBatchId(String batchId) {
        return batchRepository.findByBatchId(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("CardClearingBatch", "batchId", batchId));
    }

    public List<CardClearingBatch> getByNetwork(String network, LocalDate date) { return batchRepository.findByNetworkAndClearingDateOrderByCreatedAtDesc(network, date); }
    public List<CardSettlementPosition> getPositions(LocalDate date, String network) { return positionRepository.findBySettlementDateAndNetworkOrderByCounterpartyNameAsc(date, network); }
    public List<CardClearingBatch> getAllBatches() { return batchRepository.findAll(); }
    public List<CardSettlementPosition> getAllPositions() { return positionRepository.findAll(); }
}
