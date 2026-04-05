package com.cbs.shariahcompliance.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.shariahcompliance.dto.CharityFundReport;
import com.cbs.shariahcompliance.dto.CharityRecipientResponse;
import com.cbs.shariahcompliance.dto.CreateCharityRecipientRequest;
import com.cbs.shariahcompliance.dto.CreatePurificationBatchRequest;
import com.cbs.shariahcompliance.dto.DisbursementConfirmation;
import com.cbs.shariahcompliance.dto.DisbursementPlan;
import com.cbs.shariahcompliance.dto.PurificationBatchResponse;
import com.cbs.shariahcompliance.dto.PurificationReport;
import com.cbs.shariahcompliance.dto.SsbApprovalRequest;
import com.cbs.shariahcompliance.entity.CharityCategory;
import com.cbs.shariahcompliance.entity.CharityRecipient;
import com.cbs.shariahcompliance.entity.DisbursementPaymentStatus;
import com.cbs.shariahcompliance.entity.PurificationBatch;
import com.cbs.shariahcompliance.entity.PurificationBatchStatus;
import com.cbs.shariahcompliance.entity.PurificationDisbursement;
import com.cbs.shariahcompliance.entity.QuarantineStatus;
import com.cbs.shariahcompliance.entity.SnciRecord;
import com.cbs.shariahcompliance.repository.CharityFundLedgerEntryRepository;
import com.cbs.shariahcompliance.repository.CharityRecipientRepository;
import com.cbs.shariahcompliance.repository.PurificationBatchRepository;
import com.cbs.shariahcompliance.repository.PurificationDisbursementRepository;
import com.cbs.shariahcompliance.repository.SnciRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PurificationService {

    private final PurificationBatchRepository batchRepository;
    private final PurificationDisbursementRepository disbursementRepository;
    private final CharityRecipientRepository recipientRepository;
    private final SnciRecordRepository snciRepository;
    private final CharityFundService charityFundService;
    private final CharityFundLedgerEntryRepository charityFundLedgerRepository;
    private final IslamicPostingRuleService postingRuleService;
    private final CurrentActorProvider actorProvider;

    private static final AtomicLong BATCH_SEQ = new AtomicLong(System.currentTimeMillis() % 100000);

    // ── Batch creation ─────────────────────────────────────────────────────────

    public PurificationBatchResponse createBatch(CreatePurificationBatchRequest request) {
        List<QuarantineStatus> eligibleStatuses = List.of(
                QuarantineStatus.QUARANTINED, QuarantineStatus.PENDING_PURIFICATION);

        List<SnciRecord> eligibleRecords = snciRepository.findByQuarantineStatusIn(eligibleStatuses);

        // Filter by period if provided
        if (request.getPeriodFrom() != null) {
            eligibleRecords = eligibleRecords.stream()
                    .filter(r -> r.getDetectionDate() != null && !r.getDetectionDate().isBefore(request.getPeriodFrom()))
                    .toList();
        }
        if (request.getPeriodTo() != null) {
            eligibleRecords = eligibleRecords.stream()
                    .filter(r -> r.getDetectionDate() != null && !r.getDetectionDate().isAfter(request.getPeriodTo()))
                    .toList();
        }

        // Filter by currency if provided
        if (request.getCurrencyCode() != null && !request.getCurrencyCode().isBlank()) {
            eligibleRecords = eligibleRecords.stream()
                    .filter(r -> request.getCurrencyCode().equals(r.getCurrencyCode()))
                    .toList();
        }

        // Filter out records with null or non-positive amounts
        List<SnciRecord> skippedRecords = eligibleRecords.stream()
                .filter(r -> r.getAmount() == null || r.getAmount().compareTo(BigDecimal.ZERO) <= 0)
                .toList();
        if (!skippedRecords.isEmpty()) {
            for (SnciRecord skipped : skippedRecords) {
                log.warn("Skipping SNCI record {} from purification batch — invalid amount: {}",
                        skipped.getSnciRef(), skipped.getAmount());
            }
            eligibleRecords = eligibleRecords.stream()
                    .filter(r -> r.getAmount() != null && r.getAmount().compareTo(BigDecimal.ZERO) > 0)
                    .toList();
        }

        if (eligibleRecords.isEmpty()) {
            throw new BusinessException(
                    "No eligible SNCI records found for purification batch",
                    "PURIFICATION_NO_ELIGIBLE_RECORDS");
        }

        BigDecimal totalAmount = eligibleRecords.stream()
                .map(r -> r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String batchRef = "PUR-" + LocalDate.now().getYear() + "-" + String.format("%05d", BATCH_SEQ.incrementAndGet());

        String currencyCode = request.getCurrencyCode() != null && !request.getCurrencyCode().isBlank()
                ? request.getCurrencyCode()
                : eligibleRecords.get(0).getCurrencyCode();

        PurificationBatch batch = PurificationBatch.builder()
                .batchRef(batchRef)
                .periodFrom(request.getPeriodFrom())
                .periodTo(request.getPeriodTo())
                .totalAmount(totalAmount)
                .currencyCode(currencyCode != null ? currencyCode : "SAR")
                .itemCount(eligibleRecords.size())
                .status(PurificationBatchStatus.DRAFT)
                .build();

        PurificationBatch savedBatch = batchRepository.save(batch);

        // Link SNCI records to this batch and update their status
        for (SnciRecord record : eligibleRecords) {
            record.setPurificationBatchId(savedBatch.getId());
            record.setQuarantineStatus(QuarantineStatus.PENDING_PURIFICATION);
        }
        snciRepository.saveAll(eligibleRecords);

        log.info("Created purification batch {} with {} records totalling {} {}",
                batchRef, eligibleRecords.size(), totalAmount, currencyCode);

        return toBatchResponse(savedBatch);
    }

    // ── Disbursement planning ──────────────────────────────────────────────────

    public void planDisbursements(Long batchId, List<DisbursementPlan> plans) {
        PurificationBatch batch = loadBatch(batchId);

        if (batch.getStatus() != PurificationBatchStatus.DRAFT) {
            throw new BusinessException(
                    "Purification batch " + batch.getBatchRef() + " is not in DRAFT status — current status: " + batch.getStatus(),
                    "PURIFICATION_BATCH_NOT_DRAFT");
        }

        // Validate total of plans equals batch total
        BigDecimal planTotal = plans.stream()
                .map(p -> p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (planTotal.compareTo(batch.getTotalAmount()) != 0) {
            throw new BusinessException(
                    "Disbursement plan total (" + planTotal + ") does not match batch total (" + batch.getTotalAmount() + ")",
                    "PURIFICATION_PLAN_AMOUNT_MISMATCH");
        }

        // Collect SNCI record IDs linked to this batch
        List<SnciRecord> batchSnciRecords = snciRepository.findByQuarantineStatusIn(
                        List.of(QuarantineStatus.PENDING_PURIFICATION))
                .stream()
                .filter(r -> batchId.equals(r.getPurificationBatchId()))
                .toList();
        List<Long> snciRecordIds = batchSnciRecords.stream().map(SnciRecord::getId).toList();

        LocalDate yearStart = LocalDate.of(LocalDate.now().getYear(), 1, 1);
        LocalDate yearEnd = LocalDate.of(LocalDate.now().getYear(), 12, 31);

        // Validate required fields on all plans first
        List<String> planErrors = new java.util.ArrayList<>();
        for (int i = 0; i < plans.size(); i++) {
            DisbursementPlan plan = plans.get(i);
            if (plan.getRecipientId() == null) {
                planErrors.add("Plan[" + i + "]: recipientId is required");
            }
            if (plan.getPurpose() == null || plan.getPurpose().isBlank()) {
                planErrors.add("Plan[" + i + "]: purpose is required");
            }
            if (plan.getAmount() == null || plan.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                planErrors.add("Plan[" + i + "]: amount must be positive");
            }
        }
        if (!planErrors.isEmpty()) {
            throw new BusinessException(
                    "Invalid disbursement plans: " + String.join("; ", planErrors),
                    "PURIFICATION_INVALID_PLANS");
        }

        for (DisbursementPlan plan : plans) {
            CharityRecipient recipient = recipientRepository.findById(plan.getRecipientId())
                    .orElseThrow(() -> new ResourceNotFoundException("CharityRecipient", "id", plan.getRecipientId()));

            if (!"ACTIVE".equals(recipient.getStatus())) {
                throw new BusinessException(
                        "Charity recipient " + recipient.getRecipientCode() + " is not ACTIVE — status: " + recipient.getStatus(),
                        "PURIFICATION_RECIPIENT_NOT_ACTIVE");
            }

            if (!recipient.isSsbApproved()) {
                throw new BusinessException(
                        "Charity recipient " + recipient.getRecipientCode() + " is not SSB-approved",
                        "PURIFICATION_RECIPIENT_NOT_SSB_APPROVED");
            }

            // NOTE: Annual cap is stored without currency. If batch currency differs from the
            // currency in which previous disbursements were made, the cap comparison may be inaccurate.
            // Multi-currency cap enforcement requires a currency-aware cap table (future enhancement).
            if (batch.getCurrencyCode() != null && recipient.getBankName() != null) {
                // Heuristic: log a warning; proper currency check would require recipient disbursement currency field
                log.warn("Annual cap check for recipient {} uses batch currency {} — ensure cap currency alignment",
                        recipient.getRecipientCode(), batch.getCurrencyCode());
            }

            // Check annual cap
            if (recipient.getMaxAnnualDisbursement() != null) {
                BigDecimal alreadyDisbursedThisYear = Optional.ofNullable(
                        disbursementRepository.sumAmountByRecipientIdAndPaymentDateBetween(recipient.getId(), yearStart, yearEnd)
                ).orElse(BigDecimal.ZERO);
                BigDecimal projectedTotal = alreadyDisbursedThisYear.add(plan.getAmount());

                if (projectedTotal.compareTo(recipient.getMaxAnnualDisbursement()) > 0) {
                    throw new BusinessException(
                            "Disbursement to " + recipient.getRecipientCode() + " would exceed annual cap: projected "
                                    + projectedTotal + " vs cap " + recipient.getMaxAnnualDisbursement(),
                            "PURIFICATION_ANNUAL_CAP_EXCEEDED");
                }
            }

            PurificationDisbursement disbursement = PurificationDisbursement.builder()
                    .batchId(batch.getId())
                    .recipientId(recipient.getId())
                    .amount(plan.getAmount())
                    .currencyCode(batch.getCurrencyCode())
                    .purpose(plan.getPurpose())
                    .snciRecordIds(snciRecordIds)
                    .paymentStatus(DisbursementPaymentStatus.PENDING)
                    .build();

            disbursementRepository.save(disbursement);
        }

        log.info("Planned {} disbursements for batch {} totalling {}",
                plans.size(), batch.getBatchRef(), planTotal);
    }

    // ── SSB approval ───────────────────────────────────────────────────────────

    public void submitForSsbApproval(Long batchId) {
        PurificationBatch batch = loadBatch(batchId);

        if (batch.getStatus() != PurificationBatchStatus.DRAFT) {
            throw new BusinessException(
                    "Purification batch " + batch.getBatchRef() + " is not in DRAFT status — cannot submit for SSB approval",
                    "PURIFICATION_BATCH_NOT_DRAFT");
        }

        // Verify disbursements have been planned
        List<PurificationDisbursement> disbursements = disbursementRepository.findByBatchId(batchId);
        if (disbursements.isEmpty()) {
            throw new BusinessException(
                    "Purification batch " + batch.getBatchRef() + " has no disbursement plans — plan disbursements before submitting",
                    "PURIFICATION_NO_DISBURSEMENTS");
        }

        batch.setStatus(PurificationBatchStatus.PENDING_SSB_APPROVAL);
        batchRepository.save(batch);

        log.info("Purification batch {} submitted for SSB approval — {} disbursements, total {}",
                batch.getBatchRef(), disbursements.size(), batch.getTotalAmount());
    }

    public void ssbApproveBatch(Long batchId, SsbApprovalRequest approval) {
        PurificationBatch batch = loadBatch(batchId);

        if (batch.getStatus() != PurificationBatchStatus.PENDING_SSB_APPROVAL) {
            throw new BusinessException(
                    "Purification batch " + batch.getBatchRef() + " is not pending SSB approval — current status: " + batch.getStatus(),
                    "PURIFICATION_BATCH_NOT_PENDING_SSB");
        }

        batch.setSsbApprovalRef(approval.getApprovalRef());
        batch.setSsbApprovedBy(approval.getApprovedBy());
        batch.setSsbApprovedAt(LocalDateTime.now());
        batch.setSsbComments(approval.getComments());
        batch.setStatus(PurificationBatchStatus.SSB_APPROVED);

        batchRepository.save(batch);

        log.info("Purification batch {} SSB-approved by {} — ref: {}",
                batch.getBatchRef(), approval.getApprovedBy(), approval.getApprovalRef());
    }

    // ── Execution ──────────────────────────────────────────────────────────────

    public void executePurification(Long batchId) {
        PurificationBatch batch = loadBatch(batchId);

        if (batch.getStatus() != PurificationBatchStatus.SSB_APPROVED) {
            throw new BusinessException(
                    "Purification batch " + batch.getBatchRef() + " is not SSB-approved — current status: " + batch.getStatus(),
                    "PURIFICATION_BATCH_NOT_APPROVED");
        }

        // Pre-validate all disbursements before making any state changes
        List<PurificationDisbursement> disbursements = disbursementRepository.findByBatchId(batchId);
        List<String> validationErrors = new java.util.ArrayList<>();
        for (PurificationDisbursement disbursement : disbursements) {
            Optional<CharityRecipient> recipientOpt = recipientRepository.findById(disbursement.getRecipientId());
            if (recipientOpt.isEmpty()) {
                validationErrors.add("Recipient id=" + disbursement.getRecipientId() + " not found for disbursement id=" + disbursement.getId());
            } else if (!"ACTIVE".equals(recipientOpt.get().getStatus())) {
                validationErrors.add("Recipient " + recipientOpt.get().getRecipientCode() + " is not ACTIVE (status: "
                        + recipientOpt.get().getStatus() + ") for disbursement id=" + disbursement.getId());
            }
        }
        if (!validationErrors.isEmpty()) {
            throw new BusinessException(
                    "Purification execution validation failed: " + String.join("; ", validationErrors),
                    "PURIFICATION_EXECUTION_VALIDATION_FAILED");
        }

        batch.setStatus(PurificationBatchStatus.PROCESSING);
        batchRepository.save(batch);

        String currentActor = actorProvider.getCurrentActor();
        BigDecimal totalDisbursed = BigDecimal.ZERO;
        charityFundService.recordSnciPurificationInflow(batch.getId(), batch.getTotalAmount(), batch.getBatchRef());

        for (PurificationDisbursement disbursement : disbursements) {
            disbursement.setPaymentStatus(DisbursementPaymentStatus.SENT);
            disbursement.setPaymentDate(LocalDate.now());
            disbursementRepository.save(disbursement);

            // GL posting: DR SNCI Quarantine Account, CR Cash/Bank (disbursement to charity)
            CharityRecipient glRecipient = recipientRepository.findById(disbursement.getRecipientId()).orElse(null);
            log.info("Purification GL: debit SNCI quarantine 2350-000-001 amount={}, credit cash for charity disbursement to {}",
                    disbursement.getAmount(), glRecipient != null ? glRecipient.getName() : "unknown");
            try {
                postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                        .txnType(IslamicTransactionType.CHARITY_DISTRIBUTION)
                        .amount(disbursement.getAmount())
                        .contractTypeCode("SNCI_PURIFICATION")
                        .reference("PUR-" + batch.getBatchRef() + "-" + disbursement.getId())
                        .narration("SNCI purification disbursement to " + (glRecipient != null ? glRecipient.getName() : "unknown"))
                        .build());
            } catch (Exception e) {
                log.error("GL posting failed for purification disbursement {} in batch {}: {}",
                        disbursement.getId(), batch.getBatchRef(), e.getMessage(), e);
                throw new BusinessException(
                        "GL posting failed for purification disbursement: " + e.getMessage(),
                        "PURIFICATION_GL_POSTING_FAILED");
            }

            // Update charity recipient running totals
            CharityRecipient recipient = recipientRepository.findById(disbursement.getRecipientId()).orElse(null);
            if (recipient != null) {
                BigDecimal ytd = recipient.getTotalDisbursedYtd() != null ? recipient.getTotalDisbursedYtd() : BigDecimal.ZERO;
                BigDecimal lifetime = recipient.getTotalDisbursedLifetime() != null ? recipient.getTotalDisbursedLifetime() : BigDecimal.ZERO;
                recipient.setTotalDisbursedYtd(ytd.add(disbursement.getAmount()));
                recipient.setTotalDisbursedLifetime(lifetime.add(disbursement.getAmount()));
                recipientRepository.save(recipient);
            }

            charityFundService.recordPurificationDisbursementOutflow(
                    disbursement.getRecipientId(),
                    disbursement.getAmount(),
                    batch.getBatchRef(),
                    batch.getBatchRef() + "-" + disbursement.getId(),
                    disbursement.getPurpose()
            );

            totalDisbursed = totalDisbursed.add(
                    disbursement.getAmount() != null ? disbursement.getAmount() : BigDecimal.ZERO);
        }

        // Update all linked SNCI records to PURIFIED
        List<SnciRecord> snciRecords = snciRepository.findByQuarantineStatusIn(
                        List.of(QuarantineStatus.PENDING_PURIFICATION))
                .stream()
                .filter(r -> batchId.equals(r.getPurificationBatchId()))
                .toList();

        for (SnciRecord record : snciRecords) {
            record.setQuarantineStatus(QuarantineStatus.PURIFIED);
            record.setPurifiedAt(LocalDateTime.now());
            // Set charity recipient name from the first disbursement recipient (for reporting)
            if (!disbursements.isEmpty()) {
                CharityRecipient firstRecipient = recipientRepository.findById(disbursements.get(0).getRecipientId()).orElse(null);
                if (firstRecipient != null) {
                    record.setCharityRecipient(firstRecipient.getName());
                }
            }
        }
        snciRepository.saveAll(snciRecords);

        // Reconciliation: verify total disbursed matches batch total
        if (totalDisbursed.compareTo(batch.getTotalAmount()) != 0) {
            log.error("Purification reconciliation FAILED: disbursed={} vs batch total={}. Difference={}",
                    totalDisbursed, batch.getTotalAmount(), totalDisbursed.subtract(batch.getTotalAmount()));
            batch.setStatus(PurificationBatchStatus.RECONCILIATION_FAILED);
            batch.setTotalDisbursed(totalDisbursed);
            batchRepository.save(batch);
            throw new BusinessException(
                    "Purification reconciliation failed: disbursed " + totalDisbursed
                            + " does not match batch total " + batch.getTotalAmount(),
                    "PURIFICATION_RECONCILIATION_FAILED");
        }

        // Finalize batch
        batch.setStatus(PurificationBatchStatus.DISBURSED);
        batch.setTotalDisbursed(totalDisbursed);
        batch.setDisbursedAt(LocalDateTime.now());
        batch.setDisbursedBy(currentActor);
        batchRepository.save(batch);

        log.info("Purification batch {} executed — {} disbursements, total {} {}, {} SNCI records purified",
                batch.getBatchRef(), disbursements.size(), totalDisbursed, batch.getCurrencyCode(), snciRecords.size());
        log.info("AUDIT: Purification executed - batchRef={}, totalDisbursed={}, charities={}, actor={}",
                batch.getBatchRef(), totalDisbursed, disbursements.size(), currentActor);
    }

    public void recordDisbursementConfirmation(Long disbursementId, DisbursementConfirmation confirmation) {
        PurificationDisbursement disbursement = disbursementRepository.findById(disbursementId)
                .orElseThrow(() -> new ResourceNotFoundException("PurificationDisbursement", "id", disbursementId));

        if (disbursement.getPaymentStatus() != DisbursementPaymentStatus.SENT) {
            throw new BusinessException(
                    "Disbursement " + disbursementId + " is not in SENT status — current status: " + disbursement.getPaymentStatus(),
                    "DISBURSEMENT_NOT_SENT");
        }

        disbursement.setReceiptRef(confirmation.getReceiptRef());
        disbursement.setReceiptDate(confirmation.getReceiptDate());
        disbursement.setNotes(confirmation.getNotes());
        disbursement.setPaymentStatus(DisbursementPaymentStatus.CONFIRMED);

        disbursementRepository.save(disbursement);

        log.info("Disbursement {} confirmed — receipt ref: {}, receipt date: {}",
                disbursementId, confirmation.getReceiptRef(), confirmation.getReceiptDate());
    }

    // ── Charity management ─────────────────────────────────────────────────────

    public CharityRecipientResponse createRecipient(CreateCharityRecipientRequest request) {
        recipientRepository.findByRecipientCode(request.getRecipientCode()).ifPresent(existing -> {
            throw new BusinessException(
                    "Charity recipient with code " + request.getRecipientCode() + " already exists",
                    "CHARITY_RECIPIENT_DUPLICATE");
        });

        CharityRecipient recipient = CharityRecipient.builder()
                .recipientCode(request.getRecipientCode())
                .name(request.getName())
                .nameAr(request.getNameAr())
                .registrationNumber(request.getRegistrationNumber())
                .country(request.getCountry())
                .category(request.getCategory() != null ? CharityCategory.valueOf(request.getCategory()) : null)
                .bankAccountNumber(request.getBankAccountNumber())
                .bankName(request.getBankName())
                .contactPerson(request.getContactPerson())
                .contactEmail(request.getContactEmail())
                .contactPhone(request.getContactPhone())
                .ssbApproved(false)
                .totalDisbursedYtd(BigDecimal.ZERO)
                .totalDisbursedLifetime(BigDecimal.ZERO)
                .status("ACTIVE")
                .build();

        CharityRecipient saved = recipientRepository.save(recipient);

        log.info("Created charity recipient {} — {}", saved.getRecipientCode(), saved.getName());

        return toRecipientResponse(saved);
    }

    public CharityRecipientResponse updateRecipient(Long recipientId, CreateCharityRecipientRequest request) {
        CharityRecipient recipient = recipientRepository.findById(recipientId)
                .orElseThrow(() -> new ResourceNotFoundException("CharityRecipient", "id", recipientId));

        recipient.setName(request.getName());
        recipient.setNameAr(request.getNameAr());
        recipient.setRegistrationNumber(request.getRegistrationNumber());
        recipient.setCountry(request.getCountry());
        recipient.setCategory(request.getCategory() != null ? CharityCategory.valueOf(request.getCategory()) : recipient.getCategory());
        recipient.setBankAccountNumber(request.getBankAccountNumber());
        recipient.setBankName(request.getBankName());
        recipient.setContactPerson(request.getContactPerson());
        recipient.setContactEmail(request.getContactEmail());
        recipient.setContactPhone(request.getContactPhone());

        CharityRecipient saved = recipientRepository.save(recipient);

        log.info("Updated charity recipient {} — {}", saved.getRecipientCode(), saved.getName());

        return toRecipientResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CharityRecipientResponse> getApprovedRecipients() {
        List<CharityRecipient> recipients = recipientRepository.findBySsbApprovedTrueAndStatus("ACTIVE");
        return recipients.stream().map(this::toRecipientResponse).toList();
    }

    public void ssbApproveRecipient(Long recipientId, String approvedBy, String approvalRef) {
        CharityRecipient recipient = recipientRepository.findById(recipientId)
                .orElseThrow(() -> new ResourceNotFoundException("CharityRecipient", "id", recipientId));

        recipient.setSsbApproved(true);
        recipient.setSsbApprovalDate(LocalDate.now());
        recipient.setSsbApprovalRef(approvalRef);

        recipientRepository.save(recipient);

        log.info("Charity recipient {} SSB-approved by {} — ref: {}",
                recipient.getRecipientCode(), approvedBy, approvalRef);
    }

    // ── Late payment charity tracking ──────────────────────────────────────────

    public void processLatePenaltyDonation(BigDecimal amount, String contractRef, String journalRef) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Late penalty donation amount must be positive", "INVALID_AMOUNT");
        }
        // Record the late penalty inflow in the charity fund ledger
        charityFundService.recordPenaltyInflow(
                contractRef,   // sourceReference
                amount,
                contractRef,
                null,          // contractType not available here
                null,          // customerId not available here
                journalRef
        );
        log.info("Late penalty charity donation recorded and posted to charity fund — amount: {}, contract: {}, journal: {}",
                amount, contractRef, journalRef);
    }

    // ── Reporting ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PurificationReport getPurificationReport(LocalDate fromDate, LocalDate toDate) {
        List<SnciRecord> purifiedRecords = snciRepository.findByQuarantineStatus(QuarantineStatus.PURIFIED);

        // Filter by period based on purifiedAt
        List<SnciRecord> inPeriod = purifiedRecords.stream()
                .filter(r -> r.getPurifiedAt() != null)
                .filter(r -> !r.getPurifiedAt().toLocalDate().isBefore(fromDate))
                .filter(r -> !r.getPurifiedAt().toLocalDate().isAfter(toDate))
                .toList();

        BigDecimal totalPurified = inPeriod.stream()
                .map(r -> r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, BigDecimal> byType = new HashMap<>();
        for (SnciRecord r : inPeriod) {
            String typeName = r.getNonComplianceType().name();
            byType.merge(typeName, r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO, BigDecimal::add);
        }

        Map<String, BigDecimal> byCharity = new HashMap<>();
        for (SnciRecord r : inPeriod) {
            String charity = r.getCharityRecipient() != null ? r.getCharityRecipient() : "UNASSIGNED";
            byCharity.merge(charity, r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO, BigDecimal::add);
        }

        BigDecimal outstandingBalance = Optional.ofNullable(snciRepository.sumTotalUnpurified()).orElse(BigDecimal.ZERO);

        return PurificationReport.builder()
                .totalPurified(totalPurified)
                .byType(byType)
                .byCharity(byCharity)
                .outstandingBalance(outstandingBalance)
                .periodFrom(fromDate)
                .periodTo(toDate)
                .build();
    }

    @Transactional(readOnly = true)
    public CharityFundReport getCharityFundReport() {
        BigDecimal quarantinedAmount = Optional.ofNullable(
                snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.QUARANTINED)
        ).orElse(BigDecimal.ZERO);
        BigDecimal pendingAmount = Optional.ofNullable(
                snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.PENDING_PURIFICATION)
        ).orElse(BigDecimal.ZERO);
        BigDecimal purifiedAmount = Optional.ofNullable(
                snciRepository.sumAmountByQuarantineStatus(QuarantineStatus.PURIFIED)
        ).orElse(BigDecimal.ZERO);
        BigDecimal totalFromSnci = quarantinedAmount.add(pendingAmount).add(purifiedAmount);

        // totalInFund is totalFromSnci (all SNCI amounts across all statuses) plus late penalties.
        // Note: totalUnpurified (QUARANTINED + PENDING_PURIFICATION) is already included in totalFromSnci,
        // so we do NOT add it again to avoid double-counting.
        BigDecimal totalFromLatePenaltiesForBalance = Optional.ofNullable(
                charityFundLedgerRepository.sumNetInflowsBySourceTypeBetween(
                        "LATE_PAYMENT_PENALTY",
                        LocalDate.of(2000, 1, 1),
                        LocalDate.now())
        ).orElse(BigDecimal.ZERO);
        BigDecimal totalInFund = totalFromSnci.add(totalFromLatePenaltiesForBalance);

        // Total disbursed across all recipients
        List<CharityRecipient> allRecipients = recipientRepository.findByStatus("ACTIVE");
        BigDecimal totalDisbursed = allRecipients.stream()
                .map(r -> r.getTotalDisbursedLifetime() != null ? r.getTotalDisbursedLifetime() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal currentBalance = totalInFund.subtract(totalDisbursed);

        // Query the charity fund ledger for total late penalty inflows (all-time)
        BigDecimal totalFromLatePenalties = Optional.ofNullable(
                charityFundLedgerRepository.sumNetInflowsBySourceTypeBetween(
                        "LATE_PAYMENT_PENALTY",
                        LocalDate.of(2000, 1, 1),
                        LocalDate.now())
        ).orElse(BigDecimal.ZERO);

        return CharityFundReport.builder()
                .totalInFund(totalInFund)
                .totalFromLatePenalties(totalFromLatePenalties)
                .totalFromSnci(totalFromSnci)
                .totalDisbursed(totalDisbursed)
                .currentBalance(currentBalance)
                .build();
    }

    @Transactional(readOnly = true)
    public PurificationBatchResponse getBatch(Long batchId) {
        PurificationBatch batch = loadBatch(batchId);
        return toBatchResponse(batch);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private PurificationBatch loadBatch(Long batchId) {
        return batchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("PurificationBatch", "id", batchId));
    }

    private PurificationBatchResponse toBatchResponse(PurificationBatch b) {
        return PurificationBatchResponse.builder()
                .id(b.getId())
                .batchRef(b.getBatchRef())
                .periodFrom(b.getPeriodFrom())
                .periodTo(b.getPeriodTo())
                .totalAmount(b.getTotalAmount())
                .currencyCode(b.getCurrencyCode())
                .itemCount(b.getItemCount())
                .status(b.getStatus())
                .ssbApprovalRef(b.getSsbApprovalRef())
                .ssbApprovedBy(b.getSsbApprovedBy())
                .ssbApprovedAt(b.getSsbApprovedAt())
                .ssbComments(b.getSsbComments())
                .disbursedAt(b.getDisbursedAt())
                .disbursedBy(b.getDisbursedBy())
                .totalDisbursed(b.getTotalDisbursed())
                .tenantId(b.getTenantId())
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .createdBy(b.getCreatedBy())
                .updatedBy(b.getUpdatedBy())
                .version(b.getVersion())
                .build();
    }

    private CharityRecipientResponse toRecipientResponse(CharityRecipient r) {
        return CharityRecipientResponse.builder()
                .id(r.getId())
                .recipientCode(r.getRecipientCode())
                .name(r.getName())
                .nameAr(r.getNameAr())
                .registrationNumber(r.getRegistrationNumber())
                .country(r.getCountry())
                .category(r.getCategory())
                .bankAccountNumber(r.getBankAccountNumber())
                .bankName(r.getBankName())
                .bankSwiftCode(r.getBankSwiftCode())
                .contactPerson(r.getContactPerson())
                .contactEmail(r.getContactEmail())
                .contactPhone(r.getContactPhone())
                .ssbApproved(r.isSsbApproved())
                .ssbApprovalDate(r.getSsbApprovalDate())
                .ssbApprovalRef(r.getSsbApprovalRef())
                .maxAnnualDisbursement(r.getMaxAnnualDisbursement())
                .totalDisbursedYtd(r.getTotalDisbursedYtd())
                .totalDisbursedLifetime(r.getTotalDisbursedLifetime())
                .status(r.getStatus())
                .tenantId(r.getTenantId())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .createdBy(r.getCreatedBy())
                .updatedBy(r.getUpdatedBy())
                .version(r.getVersion())
                .build();
    }
}
