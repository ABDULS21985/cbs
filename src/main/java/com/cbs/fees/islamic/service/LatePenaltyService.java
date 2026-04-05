package com.cbs.fees.islamic.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.fees.islamic.dto.IslamicFeeRequests;
import com.cbs.fees.islamic.dto.IslamicFeeResponses;
import com.cbs.fees.islamic.entity.IslamicFeeConfiguration;
import com.cbs.fees.islamic.entity.LatePenaltyRecord;
import com.cbs.fees.islamic.repository.LatePenaltyRecordRepository;
import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.entity.IjarahRentalInstallment;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.ijarah.repository.IjarahRentalInstallmentRepository;
import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.murabaha.entity.MurabahaInstallment;
import com.cbs.murabaha.repository.MurabahaContractRepository;
import com.cbs.murabaha.repository.MurabahaInstallmentRepository;
import com.cbs.musharakah.entity.MusharakahBuyoutInstallment;
import com.cbs.musharakah.entity.MusharakahContract;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.entity.MusharakahRentalInstallment;
import com.cbs.musharakah.repository.MusharakahBuyoutInstallmentRepository;
import com.cbs.musharakah.repository.MusharakahContractRepository;
import com.cbs.musharakah.repository.MusharakahRentalInstallmentRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LatePenaltyService {

    private static final String STATUS_CHARGED = "CHARGED";
    private static final String STATUS_REVERSED = "REVERSED";
    private static final String STATUS_BLOCKED = "BLOCKED";
    private static final String BLOCKED_COMPOUNDING = "COMPOUNDING_PROHIBITED";

    private final IslamicFeeService islamicFeeService;
    private final LatePenaltyRecordRepository latePenaltyRecordRepository;
    private final MurabahaContractRepository murabahaContractRepository;
    private final MurabahaInstallmentRepository murabahaInstallmentRepository;
    private final IjarahContractRepository ijarahContractRepository;
    private final IjarahRentalInstallmentRepository ijarahRentalInstallmentRepository;
    private final MusharakahContractRepository musharakahContractRepository;
    private final MusharakahRentalInstallmentRepository musharakahRentalInstallmentRepository;
    private final MusharakahBuyoutInstallmentRepository musharakahBuyoutInstallmentRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;
    private final com.cbs.gl.islamic.service.IslamicGLMetadataService islamicGLMetadataService;
    private final CurrentActorProvider actorProvider;
    private final CurrentTenantResolver tenantResolver;

    public IslamicFeeResponses.LatePenaltyResult processLatePenalty(IslamicFeeResponses.LatePenaltyRequest request) {
        ContractContext contractContext = resolveContractContext(request.getContractTypeCode(), request.getContractId());
        if (request.getDaysOverdue() <= contractContext.gracePeriodDays()) {
            return IslamicFeeResponses.LatePenaltyResult.builder()
                    .penaltyCharged(false)
                    .reason("Grace period not yet expired")
                    .charityRouted(true)
                    .build();
        }

        IslamicFeeConfiguration feeConfiguration = islamicFeeService.findApplicableLatePenaltyFee(
                request.getContractTypeCode(),
                contractContext.productCode()
        );
        LatePenaltyRecord outstandingPenalty = findOutstandingPenalty(request.getInstallmentId()).orElse(null);
        if (outstandingPenalty != null) {
            latePenaltyRecordRepository.save(LatePenaltyRecord.builder()
                    .contractId(request.getContractId())
                    .contractRef(request.getContractRef())
                    .contractTypeCode(request.getContractTypeCode())
                    .customerId(contractContext.customerId())
                    .installmentId(request.getInstallmentId())
                    .penaltyDate(request.getPenaltyDate())
                    .overdueAmount(IslamicFeeSupport.money(request.getOverdueAmount()))
                    .daysOverdue(request.getDaysOverdue())
                    .penaltyAmount(BigDecimal.ZERO.setScale(2))
                    .outstandingAmount(BigDecimal.ZERO.setScale(2))
                    .feeConfigId(feeConfiguration.getId())
                    .calculationMethod("Blocked due to outstanding late penalty on installment")
                    .status(STATUS_BLOCKED)
                    .blockedReason(BLOCKED_COMPOUNDING)
                    .tenantId(tenantResolver.getCurrentTenantId())
                    .build());
            return IslamicFeeResponses.LatePenaltyResult.builder()
                    .penaltyCharged(false)
                    .reason("Existing unpaid penalty - compounding prohibited")
                    .charityRouted(true)
                    .totalPenaltiesOnContract(IslamicFeeSupport.money(latePenaltyRecordRepository.sumChargedByContractId(request.getContractId())))
                    .build();
        }
        BigDecimal currentYearTotal = IslamicFeeSupport.money(latePenaltyRecordRepository.sumChargedByContractIdBetween(
                request.getContractId(),
                IslamicFeeSupport.yearStart(request.getPenaltyDate()),
                request.getPenaltyDate().withDayOfYear(request.getPenaltyDate().lengthOfYear())
        ));
        if (feeConfiguration.getAnnualPenaltyCapAmount() != null
                && currentYearTotal.compareTo(feeConfiguration.getAnnualPenaltyCapAmount()) >= 0) {
            return IslamicFeeResponses.LatePenaltyResult.builder()
                    .penaltyCharged(false)
                    .reason("Annual penalty cap reached")
                    .charityRouted(true)
                    .totalPenaltiesOnContract(IslamicFeeSupport.money(latePenaltyRecordRepository.sumChargedByContractId(request.getContractId())))
                    .build();
        }

        IslamicFeeResponses.FeeCalculationResult calculation = islamicFeeService.calculateFee(
                feeConfiguration.getId(),
                IslamicFeeResponses.FeeCalculationContext.builder()
                        .transactionAmount(request.getOverdueAmount())
                        .financingAmount(contractContext.financingAmount())
                        .daysOverdue(request.getDaysOverdue())
                        .currencyCode(contractContext.currencyCode())
                        .build()
        );
        if (feeConfiguration.getAnnualPenaltyCapAmount() != null
                && currentYearTotal.add(calculation.getCalculatedAmount()).compareTo(feeConfiguration.getAnnualPenaltyCapAmount()) > 0) {
            return IslamicFeeResponses.LatePenaltyResult.builder()
                    .penaltyCharged(false)
                    .reason("Annual penalty cap reached")
                    .charityRouted(true)
                    .totalPenaltiesOnContract(IslamicFeeSupport.money(latePenaltyRecordRepository.sumChargedByContractId(request.getContractId())))
                    .build();
        }

        IslamicFeeResponses.FeeChargeResult chargeResult = islamicFeeService.chargeFee(
                IslamicFeeRequests.ChargeFeeRequest.builder()
                        .feeCode(feeConfiguration.getFeeCode())
                        .accountId(contractContext.accountId())
                        .transactionAmount(request.getOverdueAmount())
                        .financingAmount(contractContext.financingAmount())
                        .contractId(request.getContractId())
                        .contractRef(request.getContractRef())
                        .contractTypeCode(request.getContractTypeCode())
                        .installmentId(request.getInstallmentId())
                        .transactionType("LATE_PAYMENT")
                        .triggerRef(request.getContractRef() + "-LATE-" + request.getInstallmentId())
                        .currencyCode(contractContext.currencyCode())
                        .customerId(contractContext.customerId())
                        .narration("Late payment penalty routed to charity")
                        .build()
        );
        if (chargeResult.getChargedAmount() == null || chargeResult.getChargedAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return IslamicFeeResponses.LatePenaltyResult.builder()
                    .penaltyCharged(false)
                    .reason(chargeResult.getMessage())
                    .charityRouted(true)
                    .totalPenaltiesOnContract(IslamicFeeSupport.money(latePenaltyRecordRepository.sumChargedByContractId(request.getContractId())))
                    .build();
        }

        LatePenaltyRecord record = latePenaltyRecordRepository.save(LatePenaltyRecord.builder()
                .contractId(request.getContractId())
                .contractRef(request.getContractRef())
                .contractTypeCode(request.getContractTypeCode())
                .customerId(contractContext.customerId())
                .installmentId(request.getInstallmentId())
                .penaltyDate(request.getPenaltyDate())
                .overdueAmount(request.getOverdueAmount())
                .daysOverdue(request.getDaysOverdue())
                .penaltyAmount(chargeResult.getChargedAmount())
                .outstandingAmount(chargeResult.getChargedAmount())
                .feeConfigId(feeConfiguration.getId())
                .calculationMethod(calculation.getCalculationBreakdown())
                .journalRef(chargeResult.getJournalRef())
                .feeChargeLogId(chargeResult.getFeeChargeLogId())
                .charityFundEntryId(chargeResult.getCharityFundEntryId())
                .status(STATUS_CHARGED)
                .tenantId(tenantResolver.getCurrentTenantId())
                .build());

        updateInstallmentPenaltyState(request.getContractTypeCode(), request.getContractId(), request.getInstallmentId(),
                chargeResult.getChargedAmount(), chargeResult.getJournalRef());
        updateContractTotals(request.getContractTypeCode(), request.getContractId(), chargeResult.getChargedAmount());

        return IslamicFeeResponses.LatePenaltyResult.builder()
                .penaltyCharged(true)
                .penaltyAmount(chargeResult.getChargedAmount())
                .reason("Penalty charged and routed to charity")
                .journalRef(chargeResult.getJournalRef())
                .charityRouted(true)
                .charityFundEntryId(chargeResult.getCharityFundEntryId())
                .totalPenaltiesOnContract(IslamicFeeSupport.money(latePenaltyRecordRepository.sumChargedByContractId(request.getContractId())))
                .latePenaltyRecordId(record.getId())
                .build();
    }

    public IslamicFeeResponses.LatePenaltyResult processLatePenalty(Long contractId,
                                                                    Long installmentId,
                                                                    BigDecimal overdueAmount,
                                                                    int daysOverdue) {
        ContractIdentity identity = inferContractIdentity(contractId, installmentId);
        return processLatePenalty(IslamicFeeResponses.LatePenaltyRequest.builder()
                .contractId(contractId)
                .contractRef(identity.contractRef())
                .contractTypeCode(identity.contractTypeCode())
                .installmentId(installmentId)
                .overdueAmount(overdueAmount)
                .daysOverdue(daysOverdue)
                .penaltyDate(LocalDate.now())
                .build());
    }

    public List<IslamicFeeResponses.LatePenaltyResult> processAllOverduePenalties(LocalDate asOfDate) {
        log.info("AUDIT: Starting batch late penalty processing for date {}", asOfDate);
        List<IslamicFeeResponses.LatePenaltyResult> results = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        murabahaInstallmentRepository.findByStatusInAndDueDateBefore(
                        EnumSet.of(MurabahaDomainEnums.InstallmentStatus.SCHEDULED,
                                MurabahaDomainEnums.InstallmentStatus.DUE,
                                MurabahaDomainEnums.InstallmentStatus.PARTIAL),
                        asOfDate)
                .forEach(installment -> {
                    MurabahaContract contract = murabahaContractRepository.findById(installment.getContractId()).orElse(null);
                    if (contract == null) {
                        return;
                    }
                    int daysOverdue = (int) ChronoUnit.DAYS.between(installment.getDueDate(), asOfDate);
                    if (daysOverdue <= (contract.getGracePeriodDays() == null ? 0 : contract.getGracePeriodDays())
                            || IslamicFeeSupport.money(installment.getLatePenaltyAmount()).compareTo(BigDecimal.ZERO) > 0) {
                        return;
                    }
                    BigDecimal overdue = IslamicFeeSupport.money(installment.getTotalInstallmentAmount()
                            .subtract(IslamicFeeSupport.nvl(installment.getPaidPrincipal()))
                            .subtract(IslamicFeeSupport.nvl(installment.getPaidProfit())));
                    results.add(processLatePenalty(IslamicFeeResponses.LatePenaltyRequest.builder()
                            .contractId(contract.getId())
                            .contractRef(contract.getContractRef())
                            .contractTypeCode("MURABAHA")
                            .installmentId(installment.getId())
                            .overdueAmount(overdue)
                            .daysOverdue(daysOverdue)
                            .penaltyDate(asOfDate)
                            .build()));
                });

        ijarahRentalInstallmentRepository.findByStatusInAndDueDateBefore(
                        List.of(IjarahDomainEnums.RentalInstallmentStatus.SCHEDULED,
                                IjarahDomainEnums.RentalInstallmentStatus.DUE,
                                IjarahDomainEnums.RentalInstallmentStatus.PARTIAL),
                        asOfDate)
                .forEach(installment -> {
                    IjarahContract contract = ijarahContractRepository.findById(installment.getContractId()).orElse(null);
                    if (contract == null) {
                        return;
                    }
                    int daysOverdue = (int) ChronoUnit.DAYS.between(installment.getDueDate(), asOfDate);
                    if (daysOverdue <= (contract.getGracePeriodDays() == null ? 0 : contract.getGracePeriodDays())
                            || IslamicFeeSupport.money(installment.getLatePenaltyAmount()).compareTo(BigDecimal.ZERO) > 0) {
                        return;
                    }
                    BigDecimal overdue = IslamicFeeSupport.money(installment.getRentalAmount().subtract(IslamicFeeSupport.nvl(installment.getPaidAmount())));
                    results.add(processLatePenalty(IslamicFeeResponses.LatePenaltyRequest.builder()
                            .contractId(contract.getId())
                            .contractRef(contract.getContractRef())
                            .contractTypeCode("IJARAH")
                            .installmentId(installment.getId())
                            .overdueAmount(overdue)
                            .daysOverdue(daysOverdue)
                            .penaltyDate(asOfDate)
                            .build()));
                });

        musharakahRentalInstallmentRepository.findByStatusInAndDueDateBefore(
                        List.of(MusharakahDomainEnums.InstallmentStatus.SCHEDULED,
                                MusharakahDomainEnums.InstallmentStatus.DUE,
                                MusharakahDomainEnums.InstallmentStatus.PARTIAL),
                        asOfDate)
                .forEach(installment -> {
                    MusharakahContract contract = musharakahContractRepository.findById(installment.getContractId()).orElse(null);
                    if (contract == null) {
                        return;
                    }
                    int daysOverdue = (int) ChronoUnit.DAYS.between(installment.getDueDate(), asOfDate);
                    if (daysOverdue <= (contract.getGracePeriodDays() == null ? 0 : contract.getGracePeriodDays())
                            || IslamicFeeSupport.money(installment.getLatePenaltyAmount()).compareTo(BigDecimal.ZERO) > 0) {
                        return;
                    }
                    BigDecimal overdue = IslamicFeeSupport.money(installment.getRentalAmount().subtract(IslamicFeeSupport.nvl(installment.getPaidAmount())));
                    results.add(processLatePenalty(IslamicFeeResponses.LatePenaltyRequest.builder()
                            .contractId(contract.getId())
                            .contractRef(contract.getContractRef())
                            .contractTypeCode("MUSHARAKAH")
                            .installmentId(installment.getId())
                            .overdueAmount(overdue)
                            .daysOverdue(daysOverdue)
                            .penaltyDate(asOfDate)
                            .build()));
                });

        musharakahBuyoutInstallmentRepository.findByStatusInAndDueDateBefore(
                        List.of(MusharakahDomainEnums.InstallmentStatus.SCHEDULED,
                                MusharakahDomainEnums.InstallmentStatus.DUE,
                                MusharakahDomainEnums.InstallmentStatus.PARTIAL),
                        asOfDate)
                .forEach(installment -> {
                    MusharakahContract contract = musharakahContractRepository.findById(installment.getContractId()).orElse(null);
                    if (contract == null) {
                        return;
                    }
                    int daysOverdue = (int) ChronoUnit.DAYS.between(installment.getDueDate(), asOfDate);
                    if (daysOverdue <= (contract.getGracePeriodDays() == null ? 0 : contract.getGracePeriodDays())
                            || IslamicFeeSupport.money(installment.getLatePenaltyAmount()).compareTo(BigDecimal.ZERO) > 0) {
                        return;
                    }
                    BigDecimal overdue = IslamicFeeSupport.money(installment.getTotalBuyoutAmount().subtract(IslamicFeeSupport.nvl(installment.getPaidAmount())));
                    results.add(processLatePenalty(IslamicFeeResponses.LatePenaltyRequest.builder()
                            .contractId(contract.getId())
                            .contractRef(contract.getContractRef())
                            .contractTypeCode("MUSHARAKAH")
                            .installmentId(installment.getId())
                            .overdueAmount(overdue)
                            .daysOverdue(daysOverdue)
                            .penaltyDate(asOfDate)
                            .build()));
                });

        // Audit summary
        long charged = results.stream().filter(IslamicFeeResponses.LatePenaltyResult::isPenaltyCharged).count();
        BigDecimal totalCharged = results.stream()
                .filter(IslamicFeeResponses.LatePenaltyResult::isPenaltyCharged)
                .map(r -> r.getPenaltyAmount() != null ? r.getPenaltyAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long skipped = results.stream().filter(r -> !r.isPenaltyCharged()).count();
        log.info("AUDIT: Batch late penalty complete - date={}, charged={}, skipped={}, totalChargedAmount={}, errors={}",
                asOfDate, charged, skipped, totalCharged, errors.size());
        if (!errors.isEmpty()) {
            log.error("AUDIT: Batch late penalty had {} errors: {}", errors.size(), errors);
        }

        return results;
    }

    public void reverseLatePenalty(Long penaltyId, String reason, String authorisedBy) {
        LatePenaltyRecord record = latePenaltyRecordRepository.findById(penaltyId)
                .orElseThrow(() -> new ResourceNotFoundException("LatePenaltyRecord", "id", penaltyId));
        if (!STATUS_CHARGED.equals(record.getStatus())) {
            throw new BusinessException("Only charged penalties can be reversed", "LATE_PENALTY_NOT_REVERSIBLE");
        }
        ContractContext context = resolveContractContext(record.getContractTypeCode(), record.getContractId());
        Account account = accountRepository.findById(context.accountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", context.accountId()));
        var txn = accountPostingService.postCreditAgainstGl(
                account,
                TransactionType.ADJUSTMENT,
                record.getPenaltyAmount(),
                "Late penalty reversal",
                TransactionChannel.SYSTEM,
                record.getContractRef() + "-LATE-REV",
                List.of(accountPostingService.balanceLeg(
                        islamicGLMetadataService.resolveAccountByCategory(
                                com.cbs.gl.entity.IslamicAccountCategory.CHARITY_FUND, account.getCurrencyCode()),
                        AccountPostingService.EntrySide.DEBIT,
                        record.getPenaltyAmount(),
                        account.getCurrencyCode(),
                        BigDecimal.ONE,
                        "Late penalty charity reversal",
                        account.getId(),
                        context.customerId()
                )),
                "ISLAMIC_FEE_ENGINE",
                record.getContractRef() + "-LATE-REV"
        );
        record.setStatus(STATUS_REVERSED);
        record.setOutstandingAmount(BigDecimal.ZERO.setScale(2));
        record.setSettledAt(IslamicFeeSupport.instantNow());
        record.setReversedAt(IslamicFeeSupport.instantNow());
        record.setReversalReason(reason);
        record.setReversalJournalRef(txn.getJournal() != null ? txn.getJournal().getJournalNumber() : null);
        latePenaltyRecordRepository.save(record);
        updateInstallmentPenaltyState(record.getContractTypeCode(), record.getContractId(), record.getInstallmentId(),
                record.getPenaltyAmount().negate(), record.getReversalJournalRef());
        updateContractTotals(record.getContractTypeCode(), record.getContractId(), record.getPenaltyAmount().negate());
    }

    public void applyWaiverToFeeCharge(Long feeChargeLogId, BigDecimal waivedAmount, String waiverRef) {
        if (feeChargeLogId == null || waivedAmount == null || waivedAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        latePenaltyRecordRepository.findFirstByFeeChargeLogId(feeChargeLogId).ifPresent(record -> {
            BigDecimal originalPenalty = IslamicFeeSupport.money(record.getPenaltyAmount());
            BigDecimal originalOutstanding = IslamicFeeSupport.money(record.getOutstandingAmount());
            BigDecimal effectiveWaiver = IslamicFeeSupport.money(waivedAmount.min(originalPenalty));
            BigDecimal outstandingReduction = effectiveWaiver.min(originalOutstanding);

            record.setPenaltyAmount(IslamicFeeSupport.money(originalPenalty.subtract(effectiveWaiver)));
            record.setOutstandingAmount(IslamicFeeSupport.money(originalOutstanding.subtract(outstandingReduction)));
            record.setCalculationMethod(appendWaiverNote(record.getCalculationMethod(), effectiveWaiver, waiverRef));

            if (record.getPenaltyAmount().compareTo(BigDecimal.ZERO) == 0) {
                record.setStatus("WAIVED");
                record.setSettledAt(IslamicFeeSupport.instantNow());
            } else {
                record.setStatus(STATUS_CHARGED);
                if (record.getOutstandingAmount().compareTo(BigDecimal.ZERO) == 0) {
                    record.setSettledAt(IslamicFeeSupport.instantNow());
                }
            }
            record.setBlockedReason(null);
            latePenaltyRecordRepository.save(record);

            updateInstallmentPenaltyState(record.getContractTypeCode(), record.getContractId(), record.getInstallmentId(),
                    outstandingReduction.negate(), waiverRef);
            updateContractTotals(record.getContractTypeCode(), record.getContractId(), effectiveWaiver.negate());
        });
    }

    @Transactional(readOnly = true)
    public List<LatePenaltyRecord> getPenaltiesByContract(Long contractId) {
        return latePenaltyRecordRepository.findByContractIdOrderByPenaltyDateDesc(contractId);
    }

    @Transactional(readOnly = true)
    public List<LatePenaltyRecord> getPenaltiesByCustomer(Long customerId) {
        return latePenaltyRecordRepository.findByCustomerIdOrderByPenaltyDateDesc(customerId);
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalPenaltiesCharged(LocalDate from, LocalDate to) {
        return IslamicFeeSupport.money(latePenaltyRecordRepository.sumChargedBetween(from, to));
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalPenaltiesCharged(Long contractId) {
        return IslamicFeeSupport.money(latePenaltyRecordRepository.sumChargedByContractId(contractId));
    }

    public BigDecimal settlePenalty(Long contractId,
                                    String contractTypeCode,
                                    Long installmentId,
                                    BigDecimal amountSettled,
                                    LocalDate settlementDate,
                                    String settlementRef) {
        BigDecimal remaining = IslamicFeeSupport.money(amountSettled);
        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2);
        }
        BigDecimal totalSettled = BigDecimal.ZERO.setScale(2);
        List<LatePenaltyRecord> outstandingRecords = latePenaltyRecordRepository.findByInstallmentIdOrderByPenaltyDateDesc(installmentId).stream()
                .filter(record -> STATUS_CHARGED.equals(record.getStatus()))
                .filter(record -> IslamicFeeSupport.money(record.getOutstandingAmount()).compareTo(BigDecimal.ZERO) > 0)
                .sorted(Comparator.comparing(LatePenaltyRecord::getPenaltyDate).thenComparing(LatePenaltyRecord::getId))
                .toList();
        for (LatePenaltyRecord record : outstandingRecords) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }
            BigDecimal outstanding = IslamicFeeSupport.money(record.getOutstandingAmount());
            BigDecimal settled = remaining.min(outstanding);
            record.setOutstandingAmount(IslamicFeeSupport.money(outstanding.subtract(settled)));
            if (record.getOutstandingAmount().compareTo(BigDecimal.ZERO) == 0) {
                record.setSettledAt(settlementDate != null
                        ? settlementDate.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant()
                        : IslamicFeeSupport.instantNow());
            }
            record.setCalculationMethod(appendSettlementNote(record.getCalculationMethod(), settled, settlementRef));
            latePenaltyRecordRepository.save(record);
            remaining = IslamicFeeSupport.money(remaining.subtract(settled));
            totalSettled = IslamicFeeSupport.money(totalSettled.add(settled));
        }
        return totalSettled;
    }

    @Transactional(readOnly = true)
    public IslamicFeeResponses.LatePenaltySummary getLatePenaltySummary() {
        LocalDate today = LocalDate.now();
        List<LatePenaltyRecord> charged = latePenaltyRecordRepository.findAll().stream()
                .filter(record -> STATUS_CHARGED.equals(record.getStatus()))
                .toList();
        BigDecimal total = charged.stream().map(LatePenaltyRecord::getPenaltyAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, BigDecimal> byType = new LinkedHashMap<>();
        charged.forEach(record -> byType.merge(record.getContractTypeCode(), record.getPenaltyAmount(), BigDecimal::add));
        BigDecimal average = charged.isEmpty()
                ? BigDecimal.ZERO
                : total.divide(BigDecimal.valueOf(charged.size()), 2, BigDecimal.ROUND_HALF_UP);
        return IslamicFeeResponses.LatePenaltySummary.builder()
                .totalChargedToday(getTotalPenaltiesCharged(today, today))
                .totalChargedMonthToDate(getTotalPenaltiesCharged(IslamicFeeSupport.monthStart(today), today))
                .totalChargedYearToDate(getTotalPenaltiesCharged(IslamicFeeSupport.yearStart(today), today))
                .averagePenaltyPerInstallment(IslamicFeeSupport.money(average))
                .compoundingAttemptsBlockedCount(latePenaltyRecordRepository.countByStatusAndBlockedReason(STATUS_BLOCKED, BLOCKED_COMPOUNDING))
                .byContractType(byType)
                .build();
    }

    private ContractContext resolveContractContext(String contractTypeCode, Long contractId) {
        return switch (IslamicFeeSupport.normalize(contractTypeCode)) {
            case "MURABAHA" -> {
                MurabahaContract contract = murabahaContractRepository.findById(contractId)
                        .orElseThrow(() -> new ResourceNotFoundException("MurabahaContract", "id", contractId));
                yield new ContractContext(contract.getContractRef(), contract.getProductCode(), contract.getCustomerId(),
                        contract.getAccountId(), contract.getCurrencyCode(), contract.getFinancedAmount(),
                        contract.getGracePeriodDays() == null ? 0 : contract.getGracePeriodDays());
            }
            case "IJARAH" -> {
                IjarahContract contract = ijarahContractRepository.findById(contractId)
                        .orElseThrow(() -> new ResourceNotFoundException("IjarahContract", "id", contractId));
                yield new ContractContext(contract.getContractRef(), contract.getProductCode(), contract.getCustomerId(),
                        contract.getAccountId(), contract.getCurrencyCode(), contract.getAssetAcquisitionCost(),
                        contract.getGracePeriodDays() == null ? 0 : contract.getGracePeriodDays());
            }
            case "MUSHARAKAH" -> {
                MusharakahContract contract = musharakahContractRepository.findById(contractId)
                        .orElseThrow(() -> new ResourceNotFoundException("MusharakahContract", "id", contractId));
                yield new ContractContext(contract.getContractRef(), contract.getProductCode(), contract.getCustomerId(),
                        contract.getAccountId(), contract.getCurrencyCode(), contract.getTotalCapital(),
                        contract.getGracePeriodDays() == null ? 0 : contract.getGracePeriodDays());
            }
            default -> throw new BusinessException("Unsupported contract type for late penalty: " + contractTypeCode,
                    "UNSUPPORTED_CONTRACT_TYPE");
        };
    }

    private void updateInstallmentPenaltyState(String contractTypeCode,
                                               Long contractId,
                                               Long installmentId,
                                               BigDecimal delta,
                                               String journalRef) {
        switch (IslamicFeeSupport.normalize(contractTypeCode)) {
            case "MURABAHA" -> {
                MurabahaInstallment installment = murabahaInstallmentRepository.findById(installmentId)
                        .orElseThrow(() -> new ResourceNotFoundException("MurabahaInstallment", "id", installmentId));
                installment.setLatePenaltyAmount(IslamicFeeSupport.money(IslamicFeeSupport.nvl(installment.getLatePenaltyAmount()).add(delta)));
                installment.setLatePenaltyCharityJournalRef(journalRef);
                murabahaInstallmentRepository.save(installment);
            }
            case "IJARAH" -> {
                IjarahRentalInstallment installment = ijarahRentalInstallmentRepository.findById(installmentId)
                        .orElseThrow(() -> new ResourceNotFoundException("IjarahRentalInstallment", "id", installmentId));
                installment.setLatePenaltyAmount(IslamicFeeSupport.money(IslamicFeeSupport.nvl(installment.getLatePenaltyAmount()).add(delta)));
                installment.setLatePenaltyCharityJournalRef(journalRef);
                ijarahRentalInstallmentRepository.save(installment);
            }
            case "MUSHARAKAH" -> {
                musharakahRentalInstallmentRepository.findById(installmentId).ifPresent(installment -> {
                    installment.setLatePenaltyAmount(IslamicFeeSupport.money(IslamicFeeSupport.nvl(installment.getLatePenaltyAmount()).add(delta)));
                    installment.setLatePenaltyCharityJournalRef(journalRef);
                    musharakahRentalInstallmentRepository.save(installment);
                });
                musharakahBuyoutInstallmentRepository.findById(installmentId).ifPresent(installment -> {
                    installment.setLatePenaltyAmount(IslamicFeeSupport.money(IslamicFeeSupport.nvl(installment.getLatePenaltyAmount()).add(delta)));
                    installment.setLatePenaltyCharityJournalRef(journalRef);
                    musharakahBuyoutInstallmentRepository.save(installment);
                });
            }
            default -> {
            }
        }
    }

    private void updateContractTotals(String contractTypeCode, Long contractId, BigDecimal delta) {
        switch (IslamicFeeSupport.normalize(contractTypeCode)) {
            case "MURABAHA" -> murabahaContractRepository.findById(contractId).ifPresent(contract -> {
                contract.setTotalLatePenaltiesCharged(IslamicFeeSupport.money(IslamicFeeSupport.nvl(contract.getTotalLatePenaltiesCharged()).add(delta)));
                contract.setTotalCharityDonations(IslamicFeeSupport.money(IslamicFeeSupport.nvl(contract.getTotalCharityDonations()).add(delta)));
                murabahaContractRepository.save(contract);
            });
            case "IJARAH" -> ijarahContractRepository.findById(contractId).ifPresent(contract -> {
                contract.setTotalLatePenalties(IslamicFeeSupport.money(IslamicFeeSupport.nvl(contract.getTotalLatePenalties()).add(delta)));
                contract.setTotalCharityFromLatePenalties(IslamicFeeSupport.money(IslamicFeeSupport.nvl(contract.getTotalCharityFromLatePenalties()).add(delta)));
                ijarahContractRepository.save(contract);
            });
            case "MUSHARAKAH" -> musharakahContractRepository.findById(contractId).ifPresent(contract -> {
                contract.setTotalLatePenalties(IslamicFeeSupport.money(IslamicFeeSupport.nvl(contract.getTotalLatePenalties()).add(delta)));
                contract.setTotalCharityDonations(IslamicFeeSupport.money(IslamicFeeSupport.nvl(contract.getTotalCharityDonations()).add(delta)));
                musharakahContractRepository.save(contract);
            });
            default -> {
            }
        }
    }

    private record ContractContext(String contractRef,
                                   String productCode,
                                   Long customerId,
                                   Long accountId,
                                   String currencyCode,
                                   BigDecimal financingAmount,
                                   int gracePeriodDays) {
    }

    private ContractIdentity inferContractIdentity(Long contractId, Long installmentId) {
        if (murabahaContractRepository.findById(contractId).isPresent()
                && murabahaInstallmentRepository.findById(installmentId).map(MurabahaInstallment::getContractId).filter(contractId::equals).isPresent()) {
            MurabahaContract contract = murabahaContractRepository.findById(contractId).orElseThrow();
            return new ContractIdentity("MURABAHA", contract.getContractRef());
        }
        if (ijarahContractRepository.findById(contractId).isPresent()
                && ijarahRentalInstallmentRepository.findById(installmentId).map(IjarahRentalInstallment::getContractId).filter(contractId::equals).isPresent()) {
            IjarahContract contract = ijarahContractRepository.findById(contractId).orElseThrow();
            return new ContractIdentity("IJARAH", contract.getContractRef());
        }
        if (musharakahContractRepository.findById(contractId).isPresent()) {
            boolean rentalMatch = musharakahRentalInstallmentRepository.findById(installmentId)
                    .map(MusharakahRentalInstallment::getContractId)
                    .filter(contractId::equals)
                    .isPresent();
            boolean buyoutMatch = musharakahBuyoutInstallmentRepository.findById(installmentId)
                    .map(MusharakahBuyoutInstallment::getContractId)
                    .filter(contractId::equals)
                    .isPresent();
            if (rentalMatch || buyoutMatch) {
                MusharakahContract contract = musharakahContractRepository.findById(contractId).orElseThrow();
                return new ContractIdentity("MUSHARAKAH", contract.getContractRef());
            }
        }
        throw new BusinessException("Unable to infer contract type for late penalty processing", "LATE_PENALTY_CONTRACT_INFERENCE_FAILED");
    }

    private java.util.Optional<LatePenaltyRecord> findOutstandingPenalty(Long installmentId) {
        return latePenaltyRecordRepository.findFirstByInstallmentIdAndStatusAndOutstandingAmountGreaterThanOrderByPenaltyDateDesc(
                installmentId,
                STATUS_CHARGED,
                BigDecimal.ZERO.setScale(2));
    }

    private String appendSettlementNote(String existingNote, BigDecimal settledAmount, String settlementRef) {
        String note = "Settled " + IslamicFeeSupport.money(settledAmount)
                + (settlementRef != null && !settlementRef.isBlank() ? " via " + settlementRef : "");
        if (existingNote == null || existingNote.isBlank()) {
            return note;
        }
        return existingNote + " | " + note;
    }

    private String appendWaiverNote(String existingNote, BigDecimal waivedAmount, String waiverRef) {
        String note = "Waived " + IslamicFeeSupport.money(waivedAmount)
                + (waiverRef != null && !waiverRef.isBlank() ? " via " + waiverRef : "");
        if (existingNote == null || existingNote.isBlank()) {
            return note;
        }
        return existingNote + " | " + note;
    }

    private record ContractIdentity(String contractTypeCode, String contractRef) {
    }
}
