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
    public List<CardClearingBatch> getByNetwork(String network, LocalDate date) { return batchRepository.findByNetworkAndClearingDateOrderByCreatedAtDesc(network, date); }
    public List<CardSettlementPosition> getPositions(LocalDate date, String network) { return positionRepository.findBySettlementDateAndNetworkOrderByCounterpartyNameAsc(date, network); }
}
