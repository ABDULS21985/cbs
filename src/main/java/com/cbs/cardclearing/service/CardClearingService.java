package com.cbs.cardclearing.service;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
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
    private final CurrentActorProvider currentActorProvider;

    private static final Set<String> VALID_POSITION_STATUSES = Set.of("PENDING", "CALCULATED", "CONFIRMED", "SETTLED", "DISPUTED");

    @Transactional
    public CardClearingBatch ingestBatch(CardClearingBatch batch) {
        // Null checks on amounts before arithmetic
        if (batch.getTotalAmount() == null) {
            throw new BusinessException("Total amount is required for batch ingestion", "MISSING_TOTAL_AMOUNT");
        }
        if (batch.getTotalFees() == null) batch.setTotalFees(BigDecimal.ZERO);
        if (batch.getInterchangeAmount() == null) batch.setInterchangeAmount(BigDecimal.ZERO);

        String batchId = "CCB-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        batch.setBatchId(batchId);

        // Duplicate batch detection: same network + clearing date + file reference
        if (batch.getNetwork() != null && batch.getClearingDate() != null) {
            List<CardClearingBatch> existing = batchRepository.findByNetworkAndClearingDateOrderByCreatedAtDesc(
                    batch.getNetwork(), batch.getClearingDate());
            for (CardClearingBatch e : existing) {
                if (batch.getTotalTransactions() != null && batch.getTotalTransactions().equals(e.getTotalTransactions())
                        && batch.getTotalAmount().compareTo(e.getTotalAmount()) == 0) {
                    throw new BusinessException("Duplicate batch detected for network=" + batch.getNetwork()
                            + ", clearingDate=" + batch.getClearingDate(), "DUPLICATE_BATCH");
                }
            }
        }

        batch.setNetSettlementAmount(batch.getTotalAmount().subtract(batch.getTotalFees()).subtract(batch.getInterchangeAmount()));
        CardClearingBatch saved = batchRepository.save(batch);
        log.info("AUDIT: Card clearing batch ingested: id={}, network={}, txns={}, amount={}, actor={}",
                saved.getBatchId(), saved.getNetwork(), saved.getTotalTransactions(), saved.getTotalAmount(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public CardClearingBatch settle(String batchId) {
        CardClearingBatch b = batchRepository.findByBatchId(batchId).orElseThrow(() -> new ResourceNotFoundException("CardClearingBatch", "batchId", batchId));
        // Status validation: only non-SETTLED batches can be settled
        if ("SETTLED".equals(b.getStatus())) {
            throw new BusinessException("Batch " + batchId + " is already SETTLED", "BATCH_ALREADY_SETTLED");
        }
        b.setStatus("SETTLED"); b.setSettlementDate(LocalDate.now()); b.setReconciledAt(Instant.now());
        CardClearingBatch saved = batchRepository.save(b);
        log.info("AUDIT: Card clearing batch settled: id={}, actor={}", batchId, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public CardSettlementPosition createPosition(CardSettlementPosition position) {
        // Null safety on amounts before arithmetic
        if (position.getGrossCredits() == null) position.setGrossCredits(BigDecimal.ZERO);
        if (position.getGrossDebits() == null) position.setGrossDebits(BigDecimal.ZERO);
        if (position.getInterchangeReceivable() == null) position.setInterchangeReceivable(BigDecimal.ZERO);
        if (position.getInterchangePayable() == null) position.setInterchangePayable(BigDecimal.ZERO);
        if (position.getSchemeFees() == null) position.setSchemeFees(BigDecimal.ZERO);

        position.setNetPosition(position.getGrossCredits().subtract(position.getGrossDebits())
                .add(position.getInterchangeReceivable()).subtract(position.getInterchangePayable()).subtract(position.getSchemeFees()));
        CardSettlementPosition saved = positionRepository.save(position);
        log.info("AUDIT: Settlement position created: id={}, net={}, actor={}", saved.getId(), saved.getNetPosition(), currentActorProvider.getCurrentActor());
        return saved;
    }

    /** Update the status of an existing settlement position (e.g. PENDING -> CONFIRMED, DISPUTED). */
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
        log.info("AUDIT: Settlement position status updated: id={}, {} -> {}, notes={}, actor={}",
                id, previousStatus, status, notes != null ? notes : "", currentActorProvider.getCurrentActor());
        return saved;
    }

    /** Escalate a settlement position -- marks as DISPUTED and logs escalation. */
    @Transactional
    public CardSettlementPosition escalatePosition(Long id, String reason) {
        CardSettlementPosition pos = positionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CardSettlementPosition", "id", id));
        String previousStatus = pos.getStatus();
        pos.setStatus("DISPUTED");
        CardSettlementPosition saved = positionRepository.save(pos);
        log.warn("AUDIT: Settlement position ESCALATED: id={}, {} -> DISPUTED, reason={}, actor={}",
                id, previousStatus, reason != null ? reason : "No reason provided", currentActorProvider.getCurrentActor());
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
