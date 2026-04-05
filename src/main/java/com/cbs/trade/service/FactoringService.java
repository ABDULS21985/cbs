package com.cbs.trade.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.trade.entity.FactoringFacility;
import com.cbs.trade.entity.FactoringTransaction;
import com.cbs.trade.repository.FactoringFacilityRepository;
import com.cbs.trade.repository.FactoringTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

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
    private final GeneralLedgerService generalLedgerService;
    private final CurrentActorProvider currentActorProvider;
    private final CbsProperties cbsProperties;

    @Value("${cbs.factoring.gl.receivable:1300-FAC-001}")
    private String factoringReceivableGlCode;

    @Value("${cbs.factoring.gl.discount-income:4200-FAC-001}")
    private String discountIncomeGlCode;

    @Value("${cbs.factoring.gl.service-fee-income:4210-FAC-001}")
    private String serviceFeeIncomeGlCode;

    @Value("${cbs.factoring.gl.recourse-receivable:1310-FAC-001}")
    private String recourseReceivableGlCode;

    @Transactional
    public FactoringFacility createFacility(FactoringFacility facility) {
        if (!StringUtils.hasText(facility.getFacilityType())) {
            throw new BusinessException("Facility type is required", "MISSING_FACILITY_TYPE");
        }
        if (facility.getFacilityLimit() == null || facility.getFacilityLimit().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Facility limit must be positive", "INVALID_FACILITY_LIMIT");
        }
        facility.setFacilityCode("FF-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        facility.setUtilizedAmount(BigDecimal.ZERO);
        facility.setAvailableAmount(facility.getFacilityLimit());
        facility.setStatus("PENDING_APPROVAL");
        FactoringFacility saved = facilityRepository.save(facility);
        log.info("AUDIT: Factoring facility created: code={}, type={}, limit={}, actor={}",
                saved.getFacilityCode(), saved.getFacilityType(), saved.getFacilityLimit(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public FactoringFacility approveFacility(String facilityCode) {
        FactoringFacility facility = getFacilityByCode(facilityCode);
        if (!"PENDING_APPROVAL".equals(facility.getStatus())) {
            throw new BusinessException("Only PENDING_APPROVAL facilities can be approved; current: " + facility.getStatus(),
                    "INVALID_FACILITY_STATUS");
        }
        String approver = currentActorProvider.getCurrentActor();
        facility.setStatus("APPROVED");
        FactoringFacility saved = facilityRepository.save(facility);
        log.info("AUDIT: Factoring facility approved: code={}, by={}", facilityCode, approver);
        return saved;
    }

    @Transactional
    public FactoringTransaction submitInvoice(FactoringTransaction transaction) {
        if (transaction.getInvoiceAmount() == null || transaction.getInvoiceAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Invoice amount must be positive", "INVALID_INVOICE_AMOUNT");
        }
        if (!StringUtils.hasText(transaction.getInvoiceRef())) {
            throw new BusinessException("Invoice reference is required", "MISSING_INVOICE_REF");
        }
        // Check for duplicate invoice submission
        transactionRepository.findByInvoiceRefAndFacilityId(transaction.getInvoiceRef(), transaction.getFacilityId())
                .ifPresent(existing -> {
                    throw new BusinessException("Invoice " + transaction.getInvoiceRef() + " already submitted for this facility",
                            "DUPLICATE_INVOICE");
                });

        transaction.setStatus("SUBMITTED");
        FactoringTransaction saved = transactionRepository.save(transaction);
        log.info("AUDIT: Invoice submitted: facilityId={}, invoiceRef={}, amount={}, actor={}",
                saved.getFacilityId(), saved.getInvoiceRef(), saved.getInvoiceAmount(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public FactoringTransaction approveAndFund(Long transactionId) {
        FactoringTransaction txn = getTransactionById(transactionId);
        FactoringFacility facility = getFacilityById(txn.getFacilityId());

        // Validate transaction is in correct state
        if (!"SUBMITTED".equals(txn.getStatus())) {
            throw new BusinessException("Transaction must be in SUBMITTED status to approve and fund, current: " + txn.getStatus(),
                    "INVALID_TXN_STATUS");
        }
        if (txn.getInvoiceAmount() == null || txn.getInvoiceAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Invoice amount must be greater than zero", "INVALID_INVOICE_AMOUNT");
        }
        if (!"APPROVED".equals(facility.getStatus())) {
            throw new BusinessException("Facility must be in APPROVED status", "FACILITY_NOT_APPROVED");
        }

        // Calculate advance = invoiceAmount * advanceRatePct / 100
        BigDecimal advance = txn.getInvoiceAmount()
                .multiply(facility.getAdvanceRatePct())
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);

        // Validate facility has sufficient available amount
        if (facility.getAvailableAmount().compareTo(advance) < 0) {
            throw new BusinessException("Insufficient facility availability. Required: " + advance
                    + ", Available: " + facility.getAvailableAmount(), "INSUFFICIENT_FACILITY_LIMIT");
        }

        // Calculate discount = advance * discountRate * collectionDays / 365
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

        FactoringTransaction saved = transactionRepository.save(txn);

        // Resolve settlement GL from CbsProperties (trade finance config)
        String settlementGlCode = cbsProperties.getLedger().getTradeFinanceSettlementGlCode();
        if (settlementGlCode == null || settlementGlCode.isBlank()) {
            settlementGlCode = "2100-TF-001"; // fallback default
        }
        String currency = facility.getCurrency() != null ? facility.getCurrency() : "USD";

        // GL posting: Debit Factoring Receivable, Credit Customer Settlement Account (net proceeds)
        List<GeneralLedgerService.JournalLineRequest> journalLines = new ArrayList<>();

        journalLines.add(new GeneralLedgerService.JournalLineRequest(
                factoringReceivableGlCode, advance, BigDecimal.ZERO,
                currency, BigDecimal.ONE,
                "Factoring advance - " + txn.getInvoiceRef(),
                null, null, null, facility.getSellerCustomerId()));

        journalLines.add(new GeneralLedgerService.JournalLineRequest(
                settlementGlCode, BigDecimal.ZERO, netProceeds,
                currency, BigDecimal.ONE,
                "Factoring settlement to seller - " + txn.getInvoiceRef(),
                null, null, null, facility.getSellerCustomerId()));

        if (discount.compareTo(BigDecimal.ZERO) > 0) {
            journalLines.add(new GeneralLedgerService.JournalLineRequest(
                    discountIncomeGlCode, BigDecimal.ZERO, discount,
                    currency, BigDecimal.ONE,
                    "Factoring discount income - " + txn.getInvoiceRef(),
                    null, null, null, facility.getSellerCustomerId()));
        }

        if (serviceFee.compareTo(BigDecimal.ZERO) > 0) {
            List<GeneralLedgerService.JournalLineRequest> feeLines = List.of(
                    new GeneralLedgerService.JournalLineRequest(
                            settlementGlCode, serviceFee, BigDecimal.ZERO,
                            currency, BigDecimal.ONE,
                            "Factoring service fee debit - " + txn.getInvoiceRef(),
                            null, null, null, facility.getSellerCustomerId()),
                    new GeneralLedgerService.JournalLineRequest(
                            serviceFeeIncomeGlCode, BigDecimal.ZERO, serviceFee,
                            currency, BigDecimal.ONE,
                            "Factoring service fee income - " + txn.getInvoiceRef(),
                            null, null, null, facility.getSellerCustomerId())
            );

            generalLedgerService.postJournal(
                    "FACTORING_FEE",
                    "Factoring service fee: " + txn.getInvoiceRef(),
                    "TRADE_FINANCE",
                    txn.getInvoiceRef() + ":FEE",
                    LocalDate.now(),
                    currentActorProvider.getCurrentActor(),
                    feeLines
            );
        }

        generalLedgerService.postJournal(
                "FACTORING",
                "Factoring advance funded: " + txn.getInvoiceRef(),
                "TRADE_FINANCE",
                txn.getInvoiceRef(),
                LocalDate.now(),
                currentActorProvider.getCurrentActor(),
                journalLines
        );

        log.info("AUDIT: Invoice funded: invoiceRef={}, advance={}, discount={}, net={}, serviceFee={}, facilityUtilized={}/{}, actor={}",
                txn.getInvoiceRef(), advance, discount, netProceeds, serviceFee,
                facility.getUtilizedAmount(), facility.getFacilityLimit(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public FactoringTransaction recordCollection(Long transactionId, BigDecimal collectedAmount) {
        FactoringTransaction txn = getTransactionById(transactionId);
        if (!"FUNDED".equals(txn.getStatus()) && !"PARTIALLY_COLLECTED".equals(txn.getStatus())) {
            throw new BusinessException("Only FUNDED or PARTIALLY_COLLECTED transactions can record collection; current: " + txn.getStatus(),
                    "INVALID_TXN_STATUS");
        }
        if (collectedAmount == null || collectedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Collection amount must be positive", "INVALID_COLLECTION_AMOUNT");
        }

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

        FactoringTransaction saved = transactionRepository.save(txn);
        log.info("AUDIT: Collection recorded: invoiceRef={}, collected={}, status={}, actor={}",
                txn.getInvoiceRef(), collectedAmount, txn.getStatus(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public FactoringTransaction exerciseRecourse(Long transactionId, BigDecimal recourseAmount) {
        FactoringTransaction txn = getTransactionById(transactionId);
        if (!"FUNDED".equals(txn.getStatus()) && !"PARTIALLY_COLLECTED".equals(txn.getStatus())) {
            throw new BusinessException("Recourse can only be exercised on FUNDED or PARTIALLY_COLLECTED transactions",
                    "INVALID_TXN_STATUS");
        }
        if (recourseAmount == null || recourseAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Recourse amount must be positive", "INVALID_RECOURSE_AMOUNT");
        }
        if (Boolean.TRUE.equals(txn.getRecourseExercised())) {
            throw new BusinessException("Recourse has already been exercised for this transaction", "RECOURSE_ALREADY_EXERCISED");
        }

        txn.setRecourseExercised(true);
        txn.setRecourseAmount(recourseAmount);
        txn.setStatus("RECOURSE");

        // GL posting for recourse entry
        FactoringFacility facility = getFacilityById(txn.getFacilityId());
        String currency = facility.getCurrency() != null ? facility.getCurrency() : "USD";
        String settlementGlCode = cbsProperties.getLedger().getTradeFinanceSettlementGlCode();
        if (settlementGlCode == null || settlementGlCode.isBlank()) {
            settlementGlCode = "2100-TF-001";
        }

        List<GeneralLedgerService.JournalLineRequest> recourseLines = List.of(
                new GeneralLedgerService.JournalLineRequest(
                        recourseReceivableGlCode, recourseAmount, BigDecimal.ZERO,
                        currency, BigDecimal.ONE,
                        "Factoring recourse - " + txn.getInvoiceRef(),
                        null, null, null, facility.getSellerCustomerId()),
                new GeneralLedgerService.JournalLineRequest(
                        factoringReceivableGlCode, BigDecimal.ZERO, recourseAmount,
                        currency, BigDecimal.ONE,
                        "Factoring recourse reversal - " + txn.getInvoiceRef(),
                        null, null, null, facility.getSellerCustomerId())
        );
        generalLedgerService.postJournal("FACTORING_RECOURSE",
                "Factoring recourse: " + txn.getInvoiceRef(),
                "TRADE_FINANCE", txn.getInvoiceRef() + ":RECOURSE",
                LocalDate.now(), currentActorProvider.getCurrentActor(), recourseLines);

        FactoringTransaction saved = transactionRepository.save(txn);
        log.info("AUDIT: Recourse exercised: invoiceRef={}, amount={}, actor={}",
                txn.getInvoiceRef(), recourseAmount, currentActorProvider.getCurrentActor());
        return saved;
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

    public java.util.List<FactoringFacility> getAllFacilities() {
        return facilityRepository.findAll();
    }

    public java.util.List<FactoringTransaction> getAllTransactions() {
        return transactionRepository.findAll();
    }

}
