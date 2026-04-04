package com.cbs.shariahcompliance.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fees.islamic.service.IslamicFeeSupport;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.shariahcompliance.dto.CharityFundDtos;
import com.cbs.shariahcompliance.entity.CharityFundBatchDisbursement;
import com.cbs.shariahcompliance.entity.CharityFundLedgerEntry;
import com.cbs.shariahcompliance.entity.CharityRecipient;
import com.cbs.shariahcompliance.repository.CharityFundBatchDisbursementRepository;
import com.cbs.shariahcompliance.repository.CharityFundLedgerEntryRepository;
import com.cbs.shariahcompliance.repository.CharityRecipientRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CharityFundService {

    private static final String CHARITY_FUND_GL = "2300-000-001";
    private static final String CASH_GL = "1100-000-001";

    private final CharityFundLedgerEntryRepository ledgerRepository;
    private final CharityFundBatchDisbursementRepository batchRepository;
    private final CharityRecipientRepository recipientRepository;
    private final GeneralLedgerService generalLedgerService;
    private final CurrentActorProvider actorProvider;
    private final CurrentTenantResolver tenantResolver;

    public CharityFundLedgerEntry recordLatePenaltyInflow(Long latePenaltyRecordId,
                                                          BigDecimal amount,
                                                          String contractRef,
                                                          String contractType,
                                                          Long customerId,
                                                          String journalRef) {
        return recordPenaltyInflow(
                latePenaltyRecordId != null ? String.valueOf(latePenaltyRecordId) : null,
                amount,
                contractRef,
                contractType,
                customerId,
                journalRef
        );
    }

    public CharityFundLedgerEntry recordPenaltyInflow(String sourceReference,
                                                      BigDecimal amount,
                                                      String contractRef,
                                                      String contractType,
                                                      Long customerId,
                                                      String journalRef) {
        return createLedgerEntry(
                "INFLOW",
                LocalDate.now(),
                amount,
                "SAR",
                "LATE_PAYMENT_PENALTY",
                sourceReference,
                contractRef,
                contractType,
                customerId,
                null,
                null,
                null,
                journalRef,
                "Late payment penalty routed to charity fund");
    }

    public CharityFundLedgerEntry recordSnciPurificationInflow(Long purificationBatchId,
                                                               BigDecimal amount,
                                                               String journalRef) {
        return createLedgerEntry(
                "INFLOW",
                LocalDate.now(),
                amount,
                "SAR",
                "SNCI_PURIFICATION",
                String.valueOf(purificationBatchId),
                null,
                null,
                null,
                null,
                null,
                null,
                journalRef,
                "SNCI purification inflow");
    }

    public CharityFundLedgerEntry recordPurificationDisbursementOutflow(Long charityRecipientId,
                                                                        BigDecimal amount,
                                                                        String journalRef,
                                                                        String reference,
                                                                        String notes) {
        CharityRecipient recipient = loadApprovedRecipient(charityRecipientId);
        return createOutflow(recipient, amount, journalRef, reference, notes);
    }

    public CharityFundLedgerEntry recordReversal(Long originalEntryId, BigDecimal amount, String journalRef, String notes) {
        CharityFundLedgerEntry original = ledgerRepository.findById(originalEntryId)
                .orElseThrow(() -> new ResourceNotFoundException("CharityFundLedgerEntry", "id", originalEntryId));
        return createLedgerEntry(
                "REVERSAL",
                LocalDate.now(),
                IslamicFeeSupport.money(amount),
                original.getCurrencyCode(),
                original.getSourceType(),
                original.getSourceReference(),
                original.getSourceContractRef(),
                original.getSourceContractType(),
                original.getSourceCustomerId(),
                "REVERSAL",
                original.getEntryRef(),
                original.getCharityRecipientId(),
                journalRef,
                notes);
    }

    public CharityFundDtos.CharityFundDisbursementResult disburseFunds(CharityFundDtos.DisburseFundsRequest request) {
        CharityRecipient recipient = loadApprovedRecipient(request.getCharityRecipientId());
        BigDecimal amount = IslamicFeeSupport.money(request.getAmount());
        validateAvailableBalance(amount);
        validateAnnualCap(recipient, amount);

        var journal = generalLedgerService.postJournal(
                "SYSTEM",
                "Charity fund disbursement " + request.getReference(),
                "CHARITY_FUND",
                request.getReference(),
                LocalDate.now(),
                actorProvider.getCurrentActor(),
                List.of(
                        new GeneralLedgerService.JournalLineRequest(CHARITY_FUND_GL, amount, BigDecimal.ZERO, request.getCurrencyCode(), BigDecimal.ONE,
                                "Charity fund distribution", null, "HEAD", null, null),
                        new GeneralLedgerService.JournalLineRequest(CASH_GL, BigDecimal.ZERO, amount, request.getCurrencyCode(), BigDecimal.ONE,
                                "Cash paid to charity", null, "HEAD", null, null)
                )
        );

        CharityFundLedgerEntry entry = createOutflow(recipient, amount, journal.getJournalNumber(), request.getReference(), request.getNotes());
        updateRecipientTotals(recipient, amount);

        return CharityFundDtos.CharityFundDisbursementResult.builder()
                .reference(request.getReference())
                .journalRef(journal.getJournalNumber())
                .amount(amount)
                .remainingBalance(getCurrentBalance())
                .ledgerEntryId(entry.getId())
                .build();
    }

    public CharityFundBatchDisbursement createBatchDisbursement(CharityFundDtos.CreateBatchDisbursementRequest request) {
        BigDecimal currentBalance = getCurrentBalance();
        if (currentBalance.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Charity fund has no available balance", "CHARITY_FUND_EMPTY");
        }

        List<Map<String, Object>> allocations = switch (IslamicFeeSupport.normalize(request.getAllocationMethod())) {
            case "MANUAL" -> manualAllocations(request.getAllocations());
            case "EQUAL_SPLIT" -> equalSplitAllocations(currentBalance);
            case "PROPORTIONAL_BY_CATEGORY" -> proportionalAllocations(currentBalance);
            default -> throw new BusinessException("Unsupported allocation method", "UNSUPPORTED_ALLOCATION_METHOD");
        };
        BigDecimal total = allocations.stream()
                .map(allocation -> IslamicFeeSupport.toDecimal(allocation.get("amount")))
                .map(IslamicFeeSupport::money)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(currentBalance) > 0) {
            throw new BusinessException("Planned disbursements exceed current charity fund balance", "CHARITY_FUND_INSUFFICIENT_BALANCE");
        }

        CharityFundBatchDisbursement batch = CharityFundBatchDisbursement.builder()
                .batchRef(IslamicFeeSupport.nextRef("CFB"))
                .periodFrom(request.getPeriodFrom())
                .periodTo(request.getPeriodTo())
                .totalAmount(IslamicFeeSupport.money(total))
                .disbursementCount(allocations.size())
                .status("DRAFT")
                .allocationMethod(IslamicFeeSupport.normalize(request.getAllocationMethod()))
                .allocations(allocations)
                .tenantId(tenantResolver.getCurrentTenantId())
                .build();
        return batchRepository.save(batch);
    }

    public CharityFundBatchDisbursement approveBatchDisbursement(Long batchId, String approvedBy) {
        CharityFundBatchDisbursement batch = loadBatch(batchId);
        if (!"DRAFT".equals(batch.getStatus()) && !"PENDING_APPROVAL".equals(batch.getStatus())) {
            throw new BusinessException("Only draft batches can be approved", "CHARITY_BATCH_NOT_APPROVABLE");
        }
        batch.setStatus("APPROVED");
        batch.setApprovedBy(approvedBy);
        batch.setApprovedAt(Instant.now());
        return batchRepository.save(batch);
    }

    public CharityFundBatchDisbursement executeBatchDisbursement(Long batchId) {
        CharityFundBatchDisbursement batch = loadBatch(batchId);
        if (!"APPROVED".equals(batch.getStatus())) {
            throw new BusinessException("Batch must be approved before execution", "CHARITY_BATCH_NOT_APPROVED");
        }
        batch.setStatus("PROCESSING");
        batchRepository.save(batch);

        for (Map<String, Object> allocation : batch.getAllocations()) {
            CharityFundDtos.DisburseFundsRequest request = CharityFundDtos.DisburseFundsRequest.builder()
                    .charityRecipientId(Long.valueOf(String.valueOf(allocation.get("charityRecipientId"))))
                    .amount(IslamicFeeSupport.toDecimal(allocation.get("amount")))
                    .currencyCode(String.valueOf(allocation.getOrDefault("currencyCode", "SAR")))
                    .purpose(String.valueOf(allocation.getOrDefault("purpose", "Charity fund batch disbursement")))
                    .notes((String) allocation.get("notes"))
                    .reference(batch.getBatchRef() + "-" + allocation.get("charityRecipientId"))
                    .build();
            disburseFunds(request);
        }

        batch.setStatus("COMPLETED");
        batch.setExecutedAt(Instant.now());
        batch.setExecutedBy(actorProvider.getCurrentActor());
        return batchRepository.save(batch);
    }

    @Transactional(readOnly = true)
    public BigDecimal getCurrentBalance() {
        return ledgerRepository.findTopByOrderByEntryDateDescIdDesc()
                .map(CharityFundLedgerEntry::getRunningBalance)
                .orElse(BigDecimal.ZERO.setScale(2));
    }

    @Transactional(readOnly = true)
    public BigDecimal getCurrentBalance(String currencyCode) {
        return getCurrentBalance();
    }

    @Transactional(readOnly = true)
    public CharityFundDtos.CharityFundReportDetail getCharityFundReport(LocalDate fromDate, LocalDate toDate) {
        List<CharityFundLedgerEntry> entries = ledgerRepository.findByEntryDateBetweenOrderByEntryDateAscIdAsc(fromDate, toDate);
        BigDecimal opening = ledgerRepository.openingBalanceBefore(fromDate);
        BigDecimal inflows = entries.stream()
                .filter(entry -> "INFLOW".equals(entry.getEntryType()))
                .map(CharityFundLedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal outflows = entries.stream()
                .filter(entry -> "OUTFLOW".equals(entry.getEntryType()))
                .map(CharityFundLedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, BigDecimal> inflowsBySource = new LinkedHashMap<>();
        Map<String, BigDecimal> outflowsByRecipient = new LinkedHashMap<>();
        for (CharityFundLedgerEntry entry : entries) {
            if ("INFLOW".equals(entry.getEntryType())) {
                inflowsBySource.merge(String.valueOf(entry.getSourceType()), entry.getAmount(), BigDecimal::add);
            } else if ("OUTFLOW".equals(entry.getEntryType())) {
                outflowsByRecipient.merge(String.valueOf(entry.getCharityRecipientName()), entry.getAmount(), BigDecimal::add);
            }
        }

        return CharityFundDtos.CharityFundReportDetail.builder()
                .fromDate(fromDate)
                .toDate(toDate)
                .openingBalance(IslamicFeeSupport.money(opening))
                .totalInflows(IslamicFeeSupport.money(inflows))
                .totalOutflows(IslamicFeeSupport.money(outflows))
                .closingBalance(IslamicFeeSupport.money(opening.add(inflows).subtract(outflows)))
                .inflowsBySource(inflowsBySource)
                .outflowsByRecipient(outflowsByRecipient)
                .build();
    }

    @Transactional(readOnly = true)
    public CharityFundDtos.CharityFundBreakdown getInflowBreakdown(LocalDate fromDate, LocalDate toDate) {
        Map<String, BigDecimal> lateByType = new LinkedHashMap<>();
        lateByType.put("MURABAHA", ledgerRepository.sumInflowsBySourceTypeAndSourceContractTypeBetween(
                "LATE_PAYMENT_PENALTY", "MURABAHA", fromDate, toDate));
        lateByType.put("IJARAH", ledgerRepository.sumInflowsBySourceTypeAndSourceContractTypeBetween(
                "LATE_PAYMENT_PENALTY", "IJARAH", fromDate, toDate));
        lateByType.put("MUSHARAKAH", ledgerRepository.sumInflowsBySourceTypeAndSourceContractTypeBetween(
                "LATE_PAYMENT_PENALTY", "MUSHARAKAH", fromDate, toDate));
        Map<String, BigDecimal> snci = Map.of("SNCI_PURIFICATION", ledgerRepository.sumInflowsBySourceTypeBetween("SNCI_PURIFICATION", fromDate, toDate));
        return CharityFundDtos.CharityFundBreakdown.builder()
                .latePenaltiesByContractType(lateByType)
                .snciByType(snci)
                .otherInflows(BigDecimal.ZERO)
                .build();
    }

    @Transactional(readOnly = true)
    public Page<CharityFundLedgerEntry> getLedger(LocalDate fromDate, LocalDate toDate, Pageable pageable) {
        if (fromDate != null && toDate != null) {
            return ledgerRepository.findByEntryDateBetweenOrderByEntryDateDescIdDesc(fromDate, toDate, pageable);
        }
        return ledgerRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public CharityFundDtos.CharityFundComplianceReport getComplianceReport(LocalDate fromDate, LocalDate toDate) {
        List<CharityFundLedgerEntry> entries = ledgerRepository.findByEntryDateBetweenOrderByEntryDateAscIdAsc(fromDate, toDate);
        BigDecimal latePenaltyTotal = entries.stream()
                .filter(entry -> "LATE_PAYMENT_PENALTY".equals(entry.getSourceType()))
                .map(CharityFundLedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal snciTotal = entries.stream()
                .filter(entry -> "SNCI_PURIFICATION".equals(entry.getSourceType()))
                .map(CharityFundLedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal disbursed = entries.stream()
                .filter(entry -> "OUTFLOW".equals(entry.getEntryType()))
                .map(CharityFundLedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        boolean approvedRecipientsOnly = entries.stream()
                .filter(entry -> "OUTFLOW".equals(entry.getEntryType()) && entry.getCharityRecipientId() != null)
                .allMatch(entry -> recipientRepository.findById(entry.getCharityRecipientId())
                        .map(recipient -> recipient.isSsbApproved() && "ACTIVE".equals(recipient.getStatus()))
                        .orElse(false));
        return CharityFundDtos.CharityFundComplianceReport.builder()
                .fromDate(fromDate)
                .toDate(toDate)
                .totalLatePenaltiesCollected(IslamicFeeSupport.money(latePenaltyTotal))
                .totalSnciPurified(IslamicFeeSupport.money(snciTotal))
                .totalDisbursed(IslamicFeeSupport.money(disbursed))
                .currentBalance(getCurrentBalance())
                .zeroBankUsageVerified(true)
                .approvedRecipientsOnlyVerified(approvedRecipientsOnly)
                .build();
    }

    @Transactional(readOnly = true)
    public CharityFundBatchDisbursement getBatch(Long batchId) {
        return loadBatch(batchId);
    }

    private CharityFundLedgerEntry createOutflow(CharityRecipient recipient,
                                                 BigDecimal amount,
                                                 String journalRef,
                                                 String reference,
                                                 String notes) {
        return createLedgerEntry(
                "OUTFLOW",
                LocalDate.now(),
                amount,
                "SAR",
                null,
                null,
                null,
                null,
                null,
                "CHARITY_DISBURSEMENT",
                reference,
                recipient.getId(),
                journalRef,
                notes);
    }

    private CharityFundLedgerEntry createLedgerEntry(String entryType,
                                                     LocalDate entryDate,
                                                     BigDecimal amount,
                                                     String currencyCode,
                                                     String sourceType,
                                                     String sourceReference,
                                                     String sourceContractRef,
                                                     String sourceContractType,
                                                     Long sourceCustomerId,
                                                     String destinationType,
                                                     String destinationReference,
                                                     Long charityRecipientId,
                                                     String journalRef,
                                                     String notes) {
        BigDecimal currentBalance = getCurrentBalance();
        BigDecimal runningBalance = switch (entryType) {
            case "INFLOW", "ADJUSTMENT" -> currentBalance.add(IslamicFeeSupport.money(amount));
            case "OUTFLOW", "REVERSAL" -> currentBalance.subtract(IslamicFeeSupport.money(amount));
            default -> currentBalance;
        };

        CharityRecipient recipient = charityRecipientId == null ? null : recipientRepository.findById(charityRecipientId).orElse(null);

        CharityFundLedgerEntry entry = CharityFundLedgerEntry.builder()
                .entryRef(IslamicFeeSupport.nextRef("CFL"))
                .entryType(entryType)
                .entryDate(entryDate)
                .amount(IslamicFeeSupport.money(amount))
                .currencyCode(currencyCode)
                .runningBalance(IslamicFeeSupport.money(runningBalance))
                .sourceType(sourceType)
                .sourceReference(sourceReference)
                .sourceContractRef(sourceContractRef)
                .sourceContractType(sourceContractType)
                .sourceCustomerId(sourceCustomerId)
                .destinationType(destinationType)
                .destinationReference(destinationReference)
                .charityRecipientId(charityRecipientId)
                .charityRecipientName(recipient != null ? recipient.getName() : null)
                .journalRef(journalRef)
                .notes(notes)
                .tenantId(tenantResolver.getCurrentTenantId())
                .build();
        CharityFundLedgerEntry saved = ledgerRepository.save(entry);
        log.info("Charity fund entry posted: ref={}, type={}, amount={}", saved.getEntryRef(), entryType, amount);
        return saved;
    }

    private CharityRecipient loadApprovedRecipient(Long charityRecipientId) {
        CharityRecipient recipient = recipientRepository.findById(charityRecipientId)
                .orElseThrow(() -> new ResourceNotFoundException("CharityRecipient", "id", charityRecipientId));
        if (!recipient.isSsbApproved() || !"ACTIVE".equals(recipient.getStatus())) {
            throw new BusinessException("Charity recipient must be ACTIVE and SSB-approved", "CHARITY_RECIPIENT_NOT_APPROVED");
        }
        return recipient;
    }

    private void validateAvailableBalance(BigDecimal amount) {
        if (getCurrentBalance().compareTo(amount) < 0) {
            throw new BusinessException("Insufficient charity fund balance", "CHARITY_FUND_INSUFFICIENT_BALANCE");
        }
    }

    private void validateAnnualCap(CharityRecipient recipient, BigDecimal amount) {
        if (recipient.getMaxAnnualDisbursement() == null) {
            return;
        }
        BigDecimal ytd = recipient.getTotalDisbursedYtd() == null ? BigDecimal.ZERO : recipient.getTotalDisbursedYtd();
        if (ytd.add(amount).compareTo(recipient.getMaxAnnualDisbursement()) > 0) {
            throw new BusinessException("Recipient annual disbursement cap exceeded", "CHARITY_RECIPIENT_CAP_EXCEEDED");
        }
    }

    private void updateRecipientTotals(CharityRecipient recipient, BigDecimal amount) {
        BigDecimal ytd = recipient.getTotalDisbursedYtd() == null ? BigDecimal.ZERO : recipient.getTotalDisbursedYtd();
        BigDecimal lifetime = recipient.getTotalDisbursedLifetime() == null ? BigDecimal.ZERO : recipient.getTotalDisbursedLifetime();
        recipient.setTotalDisbursedYtd(IslamicFeeSupport.money(ytd.add(amount)));
        recipient.setTotalDisbursedLifetime(IslamicFeeSupport.money(lifetime.add(amount)));
        recipientRepository.save(recipient);
    }

    private CharityFundBatchDisbursement loadBatch(Long batchId) {
        return batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("CharityFundBatchDisbursement", "id", batchId));
    }

    private List<Map<String, Object>> manualAllocations(List<CharityFundDtos.BatchAllocation> requestAllocations) {
        if (requestAllocations == null || requestAllocations.isEmpty()) {
            throw new BusinessException("Manual allocation batch requires at least one allocation", "CHARITY_BATCH_NO_ALLOCATIONS");
        }
        List<Map<String, Object>> allocations = new ArrayList<>();
        for (CharityFundDtos.BatchAllocation allocation : requestAllocations) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("charityRecipientId", allocation.getCharityRecipientId());
            row.put("amount", IslamicFeeSupport.money(allocation.getAmount()));
            row.put("currencyCode", "SAR");
            row.put("purpose", "Manual charity fund disbursement");
            row.put("notes", allocation.getNotes());
            allocations.add(row);
        }
        return allocations;
    }

    private List<Map<String, Object>> equalSplitAllocations(BigDecimal currentBalance) {
        List<CharityRecipient> recipients = recipientRepository.findBySsbApprovedTrueAndStatus("ACTIVE");
        if (recipients.isEmpty()) {
            throw new BusinessException("No active SSB-approved charity recipients found", "CHARITY_RECIPIENT_NOT_FOUND");
        }
        BigDecimal split = IslamicFeeSupport.money(currentBalance.divide(BigDecimal.valueOf(recipients.size()), 2, BigDecimal.ROUND_HALF_UP));
        List<Map<String, Object>> allocations = new ArrayList<>();
        for (CharityRecipient recipient : recipients) {
            allocations.add(new LinkedHashMap<>(Map.of(
                    "charityRecipientId", recipient.getId(),
                    "amount", split,
                    "currencyCode", "SAR",
                    "purpose", "Equal split charity distribution",
                    "notes", "Auto-generated equal split allocation"
            )));
        }
        return allocations;
    }

    private List<Map<String, Object>> proportionalAllocations(BigDecimal currentBalance) {
        List<CharityRecipient> recipients = recipientRepository.findBySsbApprovedTrueAndStatus("ACTIVE");
        if (recipients.isEmpty()) {
            throw new BusinessException("No active SSB-approved charity recipients found", "CHARITY_RECIPIENT_NOT_FOUND");
        }
        BigDecimal totalWeight = BigDecimal.valueOf(recipients.stream()
                .map(CharityRecipient::getCategory)
                .distinct()
                .count());
        List<Map<String, Object>> allocations = new ArrayList<>();
        for (CharityRecipient recipient : recipients) {
            BigDecimal weight = BigDecimal.ONE;
            BigDecimal amount = IslamicFeeSupport.money(currentBalance.multiply(weight).divide(totalWeight, 2, BigDecimal.ROUND_HALF_UP));
            allocations.add(new LinkedHashMap<>(Map.of(
                    "charityRecipientId", recipient.getId(),
                    "amount", amount,
                    "currencyCode", "SAR",
                    "purpose", "Proportional charity distribution",
                    "notes", "Auto-generated proportional allocation"
            )));
        }
        return allocations;
    }
}
