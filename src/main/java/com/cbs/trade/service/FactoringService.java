package com.cbs.trade.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.trade.entity.FactoringFacility;
import com.cbs.trade.entity.FactoringTransaction;
import com.cbs.trade.repository.FactoringFacilityRepository;
import com.cbs.trade.repository.FactoringTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class FactoringService {

    private final FactoringFacilityRepository facilityRepository;
    private final FactoringTransactionRepository transactionRepository;

    @Transactional
    public FactoringFacility createFacility(FactoringFacility facility) {
        facility.setFacilityCode("FF-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        facility.setUtilizedAmount(BigDecimal.ZERO);
        facility.setAvailableAmount(facility.getFacilityLimit());
        facility.setStatus("APPROVED");
        FactoringFacility saved = facilityRepository.save(facility);
        log.info("Factoring facility created: code={}, type={}, limit={}", saved.getFacilityCode(), saved.getFacilityType(), saved.getFacilityLimit());
        return saved;
    }

    @Transactional
    public FactoringTransaction submitInvoice(FactoringTransaction transaction) {
        transaction.setStatus("SUBMITTED");
        FactoringTransaction saved = transactionRepository.save(transaction);
        log.info("Invoice submitted: facilityId={}, invoiceRef={}, amount={}", saved.getFacilityId(), saved.getInvoiceRef(), saved.getInvoiceAmount());
        return saved;
    }

    @Transactional
    public FactoringTransaction approveAndFund(Long transactionId) {
        FactoringTransaction txn = getTransactionById(transactionId);
        FactoringFacility facility = getFacilityById(txn.getFacilityId());

        // Calculate advance = invoiceAmount × advanceRatePct / 100
        BigDecimal advance = txn.getInvoiceAmount()
                .multiply(facility.getAdvanceRatePct())
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);

        // Calculate discount = advance × discountRate × collectionDays / 365
        long collectionDays = facility.getCollectionPeriodDays() != null ? facility.getCollectionPeriodDays() : 30;
        BigDecimal discount = advance
                .multiply(facility.getDiscountRatePct())
                .multiply(BigDecimal.valueOf(collectionDays))
                .divide(BigDecimal.valueOf(36500), 4, RoundingMode.HALF_UP);

        // Net proceeds = advance - discount
        BigDecimal netProceeds = advance.subtract(discount);

        // Service fee
        BigDecimal serviceFee = txn.getInvoiceAmount()
                .multiply(facility.getServiceFeeRatePct() != null ? facility.getServiceFeeRatePct() : BigDecimal.ZERO)
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);

        txn.setAdvanceAmount(advance);
        txn.setDiscountAmount(discount);
        txn.setNetProceedsToSeller(netProceeds);
        txn.setServiceFeeCharged(serviceFee);
        txn.setCollectionDueDate(LocalDate.now().plusDays(collectionDays));
        txn.setStatus("FUNDED");

        // Update facility utilization
        facility.setUtilizedAmount(facility.getUtilizedAmount().add(advance));
        facility.setAvailableAmount(facility.getFacilityLimit().subtract(facility.getUtilizedAmount()));
        facilityRepository.save(facility);

        log.info("Invoice funded: invoiceRef={}, advance={}, discount={}, net={}", txn.getInvoiceRef(), advance, discount, netProceeds);
        return transactionRepository.save(txn);
    }

    @Transactional
    public FactoringTransaction recordCollection(Long transactionId, BigDecimal collectedAmount) {
        FactoringTransaction txn = getTransactionById(transactionId);
        txn.setCollectedAmount(collectedAmount);
        txn.setActualCollectionDate(LocalDate.now());

        if (collectedAmount.compareTo(txn.getInvoiceAmount()) >= 0) {
            txn.setStatus("COLLECTED");
        } else {
            txn.setStatus("PARTIALLY_COLLECTED");
        }

        // Release utilization
        FactoringFacility facility = getFacilityById(txn.getFacilityId());
        facility.setUtilizedAmount(facility.getUtilizedAmount().subtract(txn.getAdvanceAmount()));
        facility.setAvailableAmount(facility.getFacilityLimit().subtract(facility.getUtilizedAmount()));
        facilityRepository.save(facility);

        log.info("Collection recorded: invoiceRef={}, collected={}", txn.getInvoiceRef(), collectedAmount);
        return transactionRepository.save(txn);
    }

    @Transactional
    public FactoringTransaction exerciseRecourse(Long transactionId, BigDecimal recourseAmount) {
        FactoringTransaction txn = getTransactionById(transactionId);
        txn.setRecourseExercised(true);
        txn.setRecourseAmount(recourseAmount);
        txn.setStatus("RECOURSE");
        log.info("Recourse exercised: invoiceRef={}, amount={}", txn.getInvoiceRef(), recourseAmount);
        return transactionRepository.save(txn);
    }

    public Map<String, BigDecimal> getConcentrationReport(Long facilityId) {
        List<FactoringTransaction> txns = transactionRepository.findByFacilityIdAndStatus(facilityId, "FUNDED");
        BigDecimal total = txns.stream().map(FactoringTransaction::getAdvanceAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(BigDecimal.ZERO) == 0) return Map.of();
        return txns.stream()
                .filter(t -> t.getBuyerName() != null)
                .collect(Collectors.groupingBy(FactoringTransaction::getBuyerName,
                        Collectors.reducing(BigDecimal.ZERO, t -> t.getAdvanceAmount() != null ? t.getAdvanceAmount() : BigDecimal.ZERO, BigDecimal::add)))
                .entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey,
                        e -> e.getValue().multiply(BigDecimal.valueOf(100)).divide(total, 2, RoundingMode.HALF_UP)));
    }

    public FactoringFacility getFacilityByCode(String code) {
        return facilityRepository.findByFacilityCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("FactoringFacility", "facilityCode", code));
    }

    private FactoringFacility getFacilityById(Long id) {
        return facilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FactoringFacility", "id", id));
    }

    private FactoringTransaction getTransactionById(Long id) {
        return transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FactoringTransaction", "id", id));
    }
}
