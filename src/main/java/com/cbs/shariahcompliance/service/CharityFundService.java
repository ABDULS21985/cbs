package com.cbs.shariahcompliance.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fees.islamic.service.IslamicFeeSupport;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.shariahcompliance.dto.CharityFundDtos;
import com.cbs.shariahcompliance.entity.CharityCategory;
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
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CharityFundService {

    private static final String CHARITY_FUND_GL = "2300-000-001";
    private static final String CASH_GL = "1100-000-001";
    private static final Set<String> ALLOWED_OUTFLOW_DESTINATIONS = Set.of("CHARITY_DISBURSEMENT", "REGULATORY_TRANSFER");

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
        return recordLatePenaltyInflow(latePenaltyRecordId, amount, contractRef, contractType, customerId, journalRef, "SAR");
    }

    public CharityFundLedgerEntry recordLatePenaltyInflow(Long latePenaltyRecordId,
                                                          BigDecimal amount,
                                                          String contractRef,
                                                          String contractType,
                                                          Long customerId,
                                                          String journalRef,
                                                          String currencyCode) {
        return recordPenaltyInflow(
                latePenaltyRecordId != null ? String.valueOf(latePenaltyRecordId) : null,
                amount,
                contractRef,
                contractType,
                customerId,
                journalRef,
                currencyCode
        );
    }

    public CharityFundLedgerEntry recordPenaltyInflow(String sourceReference,
                                                      BigDecimal amount,
                                                      String contractRef,
                                                      String contractType,
                                                      Long customerId,
                                                      String journalRef) {
        return recordPenaltyInflow(sourceReference, amount, contractRef, contractType, customerId, journalRef, "SAR");
    }

    public CharityFundLedgerEntry recordPenaltyInflow(String sourceReference,
                                                      BigDecimal amount,
                                                      String contractRef,
                                                      String contractType,
                                                      Long customerId,
                                                      String journalRef,
                                                      String currencyCode) {
        return createLedgerEntry(
                "INFLOW",
                LocalDate.now(),
                amount,
                resolveCurrency(currencyCode),
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
        return recordSnciPurificationInflow(purificationBatchId, amount, journalRef, "SAR");
    }

    public CharityFundLedgerEntry recordSnciPurificationInflow(Long purificationBatchId,
                                                               BigDecimal amount,
                                                               String journalRef,
                                                               String currencyCode) {
        return createLedgerEntry(
                "INFLOW",
                LocalDate.now(),
                amount,
                resolveCurrency(currencyCode),
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
        return createOutflow(recipient, amount, "SAR", journalRef, reference, notes);
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
        String currencyCode = resolveCurrency(request.getCurrencyCode());
        validateAvailableBalance(amount, currencyCode);
        validateAnnualCap(recipient, amount);

        var journal = generalLedgerService.postJournal(
                "SYSTEM",
                "Charity fund disbursement " + request.getReference(),
                "CHARITY_FUND",
                request.getReference(),
                LocalDate.now(),
                actorProvider.getCurrentActor(),
                List.of(
                        new GeneralLedgerService.JournalLineRequest(CHARITY_FUND_GL, amount, BigDecimal.ZERO, currencyCode, BigDecimal.ONE,
                                "Charity fund distribution", null, "HEAD", null, null),
                        new GeneralLedgerService.JournalLineRequest(CASH_GL, BigDecimal.ZERO, amount, currencyCode, BigDecimal.ONE,
                                "Cash paid to charity", null, "HEAD", null, null)
                )
        );

        CharityFundLedgerEntry entry = createOutflow(recipient, amount, currencyCode, journal.getJournalNumber(), request.getReference(), request.getNotes());
        updateRecipientTotals(recipient, amount);

        return CharityFundDtos.CharityFundDisbursementResult.builder()
                .reference(request.getReference())
                .journalRef(journal.getJournalNumber())
                .amount(amount)
                .remainingBalance(getCurrentBalance(currencyCode))
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

        List<CharityFundDtos.DisburseFundsRequest> requests = batch.getAllocations().stream()
                .map(allocation -> CharityFundDtos.DisburseFundsRequest.builder()
                        .charityRecipientId(Long.valueOf(String.valueOf(allocation.get("charityRecipientId"))))
                        .amount(IslamicFeeSupport.toDecimal(allocation.get("amount")))
                        .currencyCode(String.valueOf(allocation.getOrDefault("currencyCode", "SAR")))
                        .purpose(String.valueOf(allocation.getOrDefault("purpose", "Charity fund batch disbursement")))
                        .notes((String) allocation.get("notes"))
                        .reference(batch.getBatchRef() + "-" + allocation.get("charityRecipientId"))
                        .build())
                .toList();

        validateBatchExecutionRequests(requests);

        batch.setStatus("PROCESSING");
        batchRepository.save(batch);

        for (CharityFundDtos.DisburseFundsRequest request : requests) {
            disburseFunds(request);
        }

        batch.setStatus("COMPLETED");
        batch.setExecutedAt(Instant.now());
        batch.setExecutedBy(actorProvider.getCurrentActor());
        return batchRepository.save(batch);
    }

    @Transactional(readOnly = true)
    public BigDecimal getCurrentBalance() {
        return IslamicFeeSupport.money(ledgerRepository.currentNetBalance());
    }

    @Transactional(readOnly = true)
    public BigDecimal getCurrentBalance(String currencyCode) {
        return IslamicFeeSupport.money(ledgerRepository.currentNetBalanceByCurrency(resolveCurrency(currencyCode)));
    }

    @Transactional(readOnly = true)
    public CharityFundDtos.CharityFundReportDetail getCharityFundReport(LocalDate fromDate, LocalDate toDate) {
        List<CharityFundLedgerEntry> entries = ledgerRepository.findByEntryDateBetweenOrderByEntryDateAscIdAsc(fromDate, toDate);
        BigDecimal opening = ledgerRepository.openingBalanceBefore(fromDate);
        BigDecimal inflows = BigDecimal.ZERO;
        BigDecimal outflows = BigDecimal.ZERO;

        Map<String, BigDecimal> inflowsBySource = new LinkedHashMap<>();
        Map<String, BigDecimal> outflowsByRecipient = new LinkedHashMap<>();
        for (CharityFundLedgerEntry entry : entries) {
            if ("INFLOW".equals(entry.getEntryType())) {
                inflows = inflows.add(entry.getAmount());
                inflowsBySource.merge(String.valueOf(entry.getSourceType()), entry.getAmount(), BigDecimal::add);
            } else if ("REVERSAL".equals(entry.getEntryType()) && entry.getSourceType() != null) {
                inflows = inflows.subtract(entry.getAmount());
                inflowsBySource.merge(entry.getSourceType(), entry.getAmount().negate(), BigDecimal::add);
            } else if ("OUTFLOW".equals(entry.getEntryType())) {
                outflows = outflows.add(entry.getAmount());
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
        lateByType.put("MURABAHA", IslamicFeeSupport.money(ledgerRepository.sumNetInflowsBySourceTypeAndSourceContractTypeBetween(
                "LATE_PAYMENT_PENALTY", "MURABAHA", fromDate, toDate)));
        lateByType.put("IJARAH", IslamicFeeSupport.money(ledgerRepository.sumNetInflowsBySourceTypeAndSourceContractTypeBetween(
                "LATE_PAYMENT_PENALTY", "IJARAH", fromDate, toDate)));
        lateByType.put("MUSHARAKAH", IslamicFeeSupport.money(ledgerRepository.sumNetInflowsBySourceTypeAndSourceContractTypeBetween(
                "LATE_PAYMENT_PENALTY", "MUSHARAKAH", fromDate, toDate)));
        Map<String, BigDecimal> snci = Map.of("SNCI_PURIFICATION",
                IslamicFeeSupport.money(ledgerRepository.sumNetInflowsBySourceTypeBetween("SNCI_PURIFICATION", fromDate, toDate)));
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
                .map(entry -> signedSourceAmount(entry, "LATE_PAYMENT_PENALTY"))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal snciTotal = entries.stream()
                .filter(entry -> "SNCI_PURIFICATION".equals(entry.getSourceType()))
                .map(entry -> signedSourceAmount(entry, "SNCI_PURIFICATION"))
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
        boolean zeroBankUsageVerified = entries.stream()
                .filter(entry -> "OUTFLOW".equals(entry.getEntryType()))
                .allMatch(entry -> ALLOWED_OUTFLOW_DESTINATIONS.contains(entry.getDestinationType())
                        && ("REGULATORY_TRANSFER".equals(entry.getDestinationType()) || entry.getCharityRecipientId() != null));
        return CharityFundDtos.CharityFundComplianceReport.builder()
                .fromDate(fromDate)
                .toDate(toDate)
                .totalLatePenaltiesCollected(IslamicFeeSupport.money(latePenaltyTotal))
                .totalSnciPurified(IslamicFeeSupport.money(snciTotal))
                .totalDisbursed(IslamicFeeSupport.money(disbursed))
                .currentBalance(getCurrentBalance())
                .zeroBankUsageVerified(zeroBankUsageVerified)
                .approvedRecipientsOnlyVerified(approvedRecipientsOnly)
                .build();
    }

    @Transactional(readOnly = true)
    public CharityFundBatchDisbursement getBatch(Long batchId) {
        return loadBatch(batchId);
    }

    private CharityFundLedgerEntry createOutflow(CharityRecipient recipient,
                                                 BigDecimal amount,
                                                 String currencyCode,
                                                 String journalRef,
                                                 String reference,
                                                 String notes) {
        return createLedgerEntry(
                "OUTFLOW",
                LocalDate.now(),
                amount,
                resolveCurrency(currencyCode),
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
        String resolvedCurrency = resolveCurrency(currencyCode);
        BigDecimal currentBalance = ledgerRepository.findFirstByCurrencyCodeOrderByEntryDateDescIdDesc(resolvedCurrency)
                .map(CharityFundLedgerEntry::getRunningBalance)
                .map(IslamicFeeSupport::money)
                .orElse(BigDecimal.ZERO);
        BigDecimal runningBalance = switch (entryType) {
            case "INFLOW", "ADJUSTMENT" -> currentBalance.add(IslamicFeeSupport.money(amount));
            case "OUTFLOW", "REVERSAL" -> {
                BigDecimal afterOutflow = currentBalance.subtract(IslamicFeeSupport.money(amount));
                if (afterOutflow.compareTo(BigDecimal.ZERO) < 0) {
                    throw new BusinessException(
                            "Charity fund balance insufficient: current=" + currentBalance + ", outflow=" + amount,
                            "CHARITY_FUND_INSUFFICIENT_BALANCE");
                }
                yield afterOutflow;
            }
            default -> currentBalance;
        };

        CharityRecipient recipient = charityRecipientId == null ? null : recipientRepository.findById(charityRecipientId).orElse(null);

        CharityFundLedgerEntry entry = CharityFundLedgerEntry.builder()
                .entryRef(IslamicFeeSupport.nextRef("CFL"))
                .entryType(entryType)
                .entryDate(entryDate)
                .amount(IslamicFeeSupport.money(amount))
                .currencyCode(resolvedCurrency)
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

    private void validateAvailableBalance(BigDecimal amount, String currencyCode) {
        if (getCurrentBalance(currencyCode).compareTo(amount) < 0) {
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

    private void validateBatchExecutionRequests(List<CharityFundDtos.DisburseFundsRequest> requests) {
        Map<String, BigDecimal> totalsByCurrency = new LinkedHashMap<>();
        for (CharityFundDtos.DisburseFundsRequest request : requests) {
            CharityRecipient recipient = loadApprovedRecipient(request.getCharityRecipientId());
            BigDecimal amount = IslamicFeeSupport.money(request.getAmount());
            validateAnnualCap(recipient, amount);
            String currencyCode = resolveCurrency(request.getCurrencyCode());
            totalsByCurrency.merge(currencyCode, amount, BigDecimal::add);
        }
        for (Map.Entry<String, BigDecimal> entry : totalsByCurrency.entrySet()) {
            if (getCurrentBalance(entry.getKey()).compareTo(entry.getValue()) < 0) {
                throw new BusinessException("Insufficient charity fund balance for currency " + entry.getKey(),
                        "CHARITY_FUND_INSUFFICIENT_BALANCE");
            }
        }
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
        recipients = recipients.stream()
                .sorted(Comparator.comparing(CharityRecipient::getId))
                .toList();
        List<BigDecimal> splits = splitAmount(currentBalance, recipients.size());
        List<Map<String, Object>> allocations = new ArrayList<>();
        for (int i = 0; i < recipients.size(); i++) {
            CharityRecipient recipient = recipients.get(i);
            allocations.add(new LinkedHashMap<>(Map.of(
                    "charityRecipientId", recipient.getId(),
                    "amount", splits.get(i),
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
        int totalRecipients = recipients.size();
        Map<CharityCategory, List<CharityRecipient>> byCategory = recipients.stream()
                .collect(Collectors.groupingBy(recipient -> recipient.getCategory() != null ? recipient.getCategory() : CharityCategory.OTHER,
                        () -> new EnumMap<>(CharityCategory.class),
                        Collectors.toList()));

        // Allocate proportionally by category weight (recipient count per category / total recipients)
        List<CharityCategory> categories = byCategory.keySet().stream().sorted().toList();
        List<Map<String, Object>> allocations = new ArrayList<>();
        BigDecimal allocated = BigDecimal.ZERO;

        for (int i = 0; i < categories.size(); i++) {
            CharityCategory category = categories.get(i);
            List<CharityRecipient> categoryRecipients = byCategory.get(category).stream()
                    .sorted(Comparator.comparing(CharityRecipient::getId))
                    .toList();

            // Category share weighted by its recipient count relative to total
            BigDecimal categoryShare;
            if (i == categories.size() - 1) {
                // Last category gets remainder to avoid rounding issues
                categoryShare = currentBalance.subtract(allocated);
            } else {
                categoryShare = currentBalance
                        .multiply(BigDecimal.valueOf(categoryRecipients.size()))
                        .divide(BigDecimal.valueOf(totalRecipients), 2, RoundingMode.DOWN);
            }

            List<BigDecimal> recipientSplits = splitAmount(categoryShare, categoryRecipients.size());
            for (int j = 0; j < categoryRecipients.size(); j++) {
                CharityRecipient recipient = categoryRecipients.get(j);
                BigDecimal recipientAmount = recipientSplits.get(j);
                allocations.add(new LinkedHashMap<>(Map.of(
                        "charityRecipientId", recipient.getId(),
                        "amount", recipientAmount,
                        "currencyCode", "SAR",
                        "purpose", "Proportional charity distribution (" + category.name() + ")",
                        "notes", "Auto-generated proportional allocation weighted by category"
                )));
                allocated = allocated.add(recipientAmount);
            }
        }
        return allocations;
    }

    private List<BigDecimal> splitAmount(BigDecimal totalAmount, int count) {
        if (count <= 0) {
            return List.of();
        }
        BigDecimal total = IslamicFeeSupport.money(totalAmount);
        BigDecimal base = total.divide(BigDecimal.valueOf(count), 2, RoundingMode.DOWN);
        BigDecimal remainder = total.subtract(base.multiply(BigDecimal.valueOf(count)));
        List<BigDecimal> splits = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            BigDecimal amount = base;
            if (remainder.compareTo(BigDecimal.ZERO) > 0) {
                amount = amount.add(new BigDecimal("0.01"));
                remainder = remainder.subtract(new BigDecimal("0.01"));
            }
            splits.add(IslamicFeeSupport.money(amount));
        }
        return splits;
    }

    private BigDecimal signedSourceAmount(CharityFundLedgerEntry entry, String sourceType) {
        if (!sourceType.equals(entry.getSourceType())) {
            return BigDecimal.ZERO;
        }
        return switch (entry.getEntryType()) {
            case "INFLOW" -> entry.getAmount();
            case "REVERSAL" -> entry.getAmount().negate();
            default -> BigDecimal.ZERO;
        };
    }

    private String resolveCurrency(String currencyCode) {
        return currencyCode == null || currencyCode.isBlank() ? "SAR" : currencyCode.trim().toUpperCase();
    }
}
