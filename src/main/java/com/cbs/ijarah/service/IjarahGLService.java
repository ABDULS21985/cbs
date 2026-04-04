package com.cbs.ijarah.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.repository.GlBalanceRepository;
import com.cbs.gl.repository.JournalEntryRepository;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.ijarah.dto.IjarahResponses;
import com.cbs.ijarah.entity.IjarahAsset;
import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.entity.IjarahRentalInstallment;
import com.cbs.ijarah.entity.IjarahTransferMechanism;
import com.cbs.ijarah.repository.IjarahAssetRepository;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.ijarah.repository.IjarahRentalInstallmentRepository;
import com.cbs.ijarah.repository.IjarahTransferMechanismRepository;
import com.cbs.profitdistribution.dto.RecordPoolExpenseRequest;
import com.cbs.profitdistribution.dto.RecordPoolIncomeRequest;
import com.cbs.profitdistribution.entity.ExpenseAllocationMethod;
import com.cbs.profitdistribution.entity.ExpenseType;
import com.cbs.profitdistribution.entity.IncomeType;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IjarahGLService {

    private static final String CASH_GL = "1100-000-001";
    private static final String ASSET_GROSS_GL = "1400-IJR-001";
    private static final String ACCUMULATED_DEPR_GL = "1400-IJR-002";
    private static final String RENTAL_INCOME_GL = "5100-IJR-001";
    private static final String RENTAL_RECEIVABLE_GL = "1620-IJR-001";
    private static final String DEPRECIATION_EXPENSE_GL = "6200-IJR-001";
    private static final String MAINTENANCE_EXPENSE_GL = "6210-IJR-001";
    private static final String INSURANCE_EXPENSE_GL = "6220-IJR-001";
    private static final String IMPAIRMENT_EXPENSE_GL = "6230-IJR-001";
    private static final String IMPAIRMENT_PROVISION_GL = "1700-IJR-001";
    private static final String GAIN_DISPOSAL_GL = "5150-IJR-001";
    private static final String LOSS_DISPOSAL_GL = "6250-IJR-001";
    private static final String LOSS_TOTAL_GL = "6260-IJR-001";
    private static final String INSURANCE_RECEIVABLE_GL = "1650-IJR-001";

    private final IjarahContractRepository contractRepository;
    private final IjarahAssetRepository assetRepository;
    private final IjarahRentalInstallmentRepository installmentRepository;
    private final IjarahTransferMechanismRepository transferRepository;
    private final IslamicPostingRuleService postingRuleService;
    private final GeneralLedgerService generalLedgerService;
    private final GlBalanceRepository glBalanceRepository;
    private final JournalEntryRepository journalEntryRepository;
    private final PoolAssetManagementService poolAssetManagementService;
    private final CurrentActorProvider actorProvider;

    public void recogniseIjarahAsset(Long contractId) {
        IjarahContract contract = findContract(contractId);
        postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("IJARAH")
                .txnType(IslamicTransactionType.ASSET_ACQUISITION)
                .accountId(contract.getAccountId())
                .amount(IjarahSupport.money(contract.getAssetAcquisitionCost()))
                .principal(IjarahSupport.money(contract.getAssetAcquisitionCost()))
                .valueDate(LocalDate.now())
                .reference(contract.getContractRef() + "-ACQ")
                .build());
    }

    public JournalEntry postMonthlyDepreciation(Long assetId) {
        IjarahAsset asset = findAsset(assetId);
        if (asset.getStatus() == IjarahDomainEnums.AssetStatus.TOTAL_LOSS
                || asset.getStatus() == IjarahDomainEnums.AssetStatus.DISPOSED
                || asset.getStatus() == IjarahDomainEnums.AssetStatus.TRANSFERRED_TO_CUSTOMER) {
            throw new BusinessException("Depreciation is not allowed on disposed or lost Ijarah assets",
                    "INVALID_ASSET_STATUS");
        }
        BigDecimal remainingDepreciable = IjarahSupport.money(asset.getNetBookValue().subtract(IjarahSupport.money(asset.getResidualValue())));
        if (remainingDepreciable.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        BigDecimal depreciation = IjarahSupport.money(asset.getMonthlyDepreciation()).min(remainingDepreciable);
        JournalEntry journal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("IJARAH")
                .txnType(IslamicTransactionType.ASSET_DEPRECIATION)
                .amount(depreciation)
                .depreciation(depreciation)
                .reference(asset.getAssetRef() + "-DEPR-" + LocalDate.now())
                .valueDate(LocalDate.now())
                .build());
        asset.setAccumulatedDepreciation(IjarahSupport.money(asset.getAccumulatedDepreciation().add(depreciation)));
        asset.setNetBookValue(IjarahSupport.money(asset.getAcquisitionCost().subtract(asset.getAccumulatedDepreciation())));
        asset.setLastDepreciationDate(LocalDate.now());
        assetRepository.save(asset);

        contractRepository.findById(asset.getIjarahContractId()).ifPresent(contract -> recordPoolExpense(
                contract,
                ExpenseType.DEPRECIATION,
                depreciation,
                journal.getJournalNumber(),
                "Ijarah asset depreciation"));
        return journal;
    }

    public void postDepreciationBatch(LocalDate asOfMonth) {
        for (IjarahAsset asset : assetRepository.findAll()) {
            if ((asset.getStatus() == IjarahDomainEnums.AssetStatus.LEASED
                    || asset.getStatus() == IjarahDomainEnums.AssetStatus.OWNED_UNLEASED)
                    && (asset.getLastDepreciationDate() == null
                    || asset.getLastDepreciationDate().getYear() != asOfMonth.getYear()
                    || asset.getLastDepreciationDate().getMonthValue() != asOfMonth.getMonthValue())) {
                postMonthlyDepreciation(asset.getId());
            }
        }
    }

    public void recogniseRentalIncome(Long contractId, LocalDate periodFrom, LocalDate periodTo) {
        IjarahContract contract = findContract(contractId);
        List<IjarahRentalInstallment> installments = installmentRepository
                .findByContractIdAndDueDateBetweenOrderByInstallmentNumberAsc(contractId, periodFrom, periodTo);
        for (IjarahRentalInstallment installment : installments) {
            if (installment.getJournalRef() != null || installment.getStatus() == IjarahDomainEnums.InstallmentStatus.PAID) {
                continue;
            }
            JournalEntry journal = generalLedgerService.postJournal(
                    "SYSTEM",
                    "Ijarah rental accrual " + contract.getContractRef(),
                    "IJARAH_GL",
                    installment.getTransactionRef() != null ? installment.getTransactionRef() : contract.getContractRef() + "-ACCR-" + installment.getInstallmentNumber(),
                    periodTo,
                    actorProvider.getCurrentActor(),
                    List.of(
                            new GeneralLedgerService.JournalLineRequest(RENTAL_RECEIVABLE_GL, installment.getNetRentalAmount(), BigDecimal.ZERO,
                                    contract.getCurrencyCode(), BigDecimal.ONE, "Ijarah rental receivable", null, "HEAD", contract.getAccountId(), contract.getCustomerId()),
                            new GeneralLedgerService.JournalLineRequest(RENTAL_INCOME_GL, BigDecimal.ZERO, installment.getNetRentalAmount(),
                                    contract.getCurrencyCode(), BigDecimal.ONE, "Ijarah rental income", null, "HEAD", contract.getAccountId(), contract.getCustomerId())
                    )
            );
            installment.setJournalRef(journal.getJournalNumber());
            installmentRepository.save(installment);
        }
    }

    public void recogniseRentalIncomeBatch(LocalDate periodFrom, LocalDate periodTo) {
        contractRepository.findByStatus(IjarahDomainEnums.ContractStatus.ACTIVE)
                .forEach(contract -> recogniseRentalIncome(contract.getId(), periodFrom, periodTo));
    }

    public JournalEntry postRentalReceipt(Long contractId, BigDecimal amount, String transactionRef, boolean againstReceivable) {
        IjarahContract contract = findContract(contractId);
        JournalEntry journal;
        if (againstReceivable) {
            journal = generalLedgerService.postJournal(
                    "SYSTEM",
                    "Ijarah rental receipt " + contract.getContractRef(),
                    "IJARAH_GL",
                    transactionRef,
                    LocalDate.now(),
                    actorProvider.getCurrentActor(),
                    List.of(
                            new GeneralLedgerService.JournalLineRequest(CASH_GL, amount, BigDecimal.ZERO,
                                    contract.getCurrencyCode(), BigDecimal.ONE, "Ijarah rental receipt", null, "HEAD", contract.getAccountId(), contract.getCustomerId()),
                            new GeneralLedgerService.JournalLineRequest(RENTAL_RECEIVABLE_GL, BigDecimal.ZERO, amount,
                                    contract.getCurrencyCode(), BigDecimal.ONE, "Ijarah receivable settlement", null, "HEAD", contract.getAccountId(), contract.getCustomerId())
                    )
            );
        } else {
            journal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                    .contractTypeCode("IJARAH")
                    .txnType(IslamicTransactionType.RENTAL_PAYMENT)
                    .accountId(contract.getAccountId())
                    .amount(amount)
                    .rental(amount)
                    .reference(transactionRef)
                    .valueDate(LocalDate.now())
                    .additionalContext(java.util.Map.of("customerAccountGlCode", CASH_GL))
                    .build());
        }
        recordPoolIncome(contract, amount, journal.getJournalNumber(), transactionRef);
        return journal;
    }

    public JournalEntry postLatePenaltyToCharity(IjarahContract contract, BigDecimal amount, String reference) {
        return generalLedgerService.postJournal(
                "SYSTEM",
                "Ijarah late penalty to charity " + contract.getContractRef(),
                "IJARAH_GL",
                reference,
                LocalDate.now(),
                actorProvider.getCurrentActor(),
                List.of(
                        new GeneralLedgerService.JournalLineRequest(CASH_GL, amount, BigDecimal.ZERO,
                                contract.getCurrencyCode(), BigDecimal.ONE, "Late penalty cash receipt", null, "HEAD", contract.getAccountId(), contract.getCustomerId()),
                        new GeneralLedgerService.JournalLineRequest("2300-000-001", BigDecimal.ZERO, amount,
                                contract.getCurrencyCode(), BigDecimal.ONE, "Late penalty routed to charity", null, "HEAD", contract.getAccountId(), contract.getCustomerId())
                )
        );
    }

    public JournalEntry postMaintenanceExpense(Long assetId, BigDecimal amount, String description) {
        IjarahAsset asset = findAsset(assetId);
        JournalEntry journal = generalLedgerService.postJournal(
                "SYSTEM",
                description,
                "IJARAH_GL",
                asset.getAssetRef() + "-MAINT-" + System.currentTimeMillis(),
                LocalDate.now(),
                actorProvider.getCurrentActor(),
                List.of(
                        new GeneralLedgerService.JournalLineRequest(MAINTENANCE_EXPENSE_GL, amount, BigDecimal.ZERO,
                                asset.getCurrencyCode(), BigDecimal.ONE, description, null, "HEAD", null, asset.getLeasedToCustomerId()),
                        new GeneralLedgerService.JournalLineRequest(CASH_GL, BigDecimal.ZERO, amount,
                                asset.getCurrencyCode(), BigDecimal.ONE, description, null, "HEAD", null, asset.getLeasedToCustomerId())
                )
        );
        contractRepository.findById(asset.getIjarahContractId()).ifPresent(contract -> recordPoolExpense(
                contract,
                ExpenseType.MAINTENANCE,
                amount,
                journal.getJournalNumber(),
                description));
        return journal;
    }

    public JournalEntry postInsuranceExpense(Long assetId, BigDecimal premiumAmount) {
        IjarahAsset asset = findAsset(assetId);
        JournalEntry journal = generalLedgerService.postJournal(
                "SYSTEM",
                "Ijarah insurance expense",
                "IJARAH_GL",
                asset.getAssetRef() + "-INS-" + System.currentTimeMillis(),
                LocalDate.now(),
                actorProvider.getCurrentActor(),
                List.of(
                        new GeneralLedgerService.JournalLineRequest(INSURANCE_EXPENSE_GL, premiumAmount, BigDecimal.ZERO,
                                asset.getCurrencyCode(), BigDecimal.ONE, "Ijarah insurance expense", null, "HEAD", null, asset.getLeasedToCustomerId()),
                        new GeneralLedgerService.JournalLineRequest(CASH_GL, BigDecimal.ZERO, premiumAmount,
                                asset.getCurrencyCode(), BigDecimal.ONE, "Ijarah insurance payment", null, "HEAD", null, asset.getLeasedToCustomerId())
                )
        );
        contractRepository.findById(asset.getIjarahContractId()).ifPresent(contract -> recordPoolExpense(
                contract,
                ExpenseType.TAKAFUL_PREMIUM,
                premiumAmount,
                journal.getJournalNumber(),
                "Ijarah insurance expense"));
        return journal;
    }

    public JournalEntry postAssetTotalLoss(Long contractId, BigDecimal insuranceRecovery) {
        IjarahContract contract = findContract(contractId);
        IjarahAsset asset = findAssetByContract(contractId);
        BigDecimal recovery = IjarahSupport.money(insuranceRecovery);
        BigDecimal accumulated = IjarahSupport.money(asset.getAccumulatedDepreciation());
        BigDecimal gross = IjarahSupport.money(asset.getAcquisitionCost());
        BigDecimal netBookValue = IjarahSupport.money(asset.getNetBookValue());

        List<GeneralLedgerService.JournalLineRequest> lines = new ArrayList<>();
        if (accumulated.compareTo(BigDecimal.ZERO) > 0) {
            lines.add(new GeneralLedgerService.JournalLineRequest(ACCUMULATED_DEPR_GL, accumulated, BigDecimal.ZERO,
                    contract.getCurrencyCode(), BigDecimal.ONE, "Ijarah accumulated depreciation release", null, "HEAD", contract.getAccountId(), contract.getCustomerId()));
        }
        lines.add(new GeneralLedgerService.JournalLineRequest(LOSS_TOTAL_GL, netBookValue, BigDecimal.ZERO,
                contract.getCurrencyCode(), BigDecimal.ONE, "Ijarah asset total loss", null, "HEAD", contract.getAccountId(), contract.getCustomerId()));
        lines.add(new GeneralLedgerService.JournalLineRequest(ASSET_GROSS_GL, BigDecimal.ZERO, gross,
                contract.getCurrencyCode(), BigDecimal.ONE, "Ijarah asset write-off", null, "HEAD", contract.getAccountId(), contract.getCustomerId()));
        if (recovery.compareTo(BigDecimal.ZERO) > 0) {
            lines.add(new GeneralLedgerService.JournalLineRequest(INSURANCE_RECEIVABLE_GL, recovery, BigDecimal.ZERO,
                    contract.getCurrencyCode(), BigDecimal.ONE, "Insurance recovery receivable", null, "HEAD", contract.getAccountId(), contract.getCustomerId()));
            lines.add(new GeneralLedgerService.JournalLineRequest(LOSS_TOTAL_GL, BigDecimal.ZERO, recovery,
                    contract.getCurrencyCode(), BigDecimal.ONE, "Insurance recovery offsets Ijarah loss", null, "HEAD", contract.getAccountId(), contract.getCustomerId()));
        }
        return generalLedgerService.postJournal(
                "SYSTEM",
                "Ijarah asset total loss " + contract.getContractRef(),
                "IJARAH_GL",
                contract.getContractRef() + "-LOSS",
                LocalDate.now(),
                actorProvider.getCurrentActor(),
                lines);
    }

    public JournalEntry postImbTransfer(Long transferMechanismId) {
        IjarahTransferMechanism transfer = transferRepository.findById(transferMechanismId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahTransferMechanism", "id", transferMechanismId));
        IjarahContract contract = findContract(transfer.getIjarahContractId());
        IjarahAsset asset = findAssetByContract(contract.getId());
        BigDecimal accumulated = IjarahSupport.money(asset.getAccumulatedDepreciation());
        BigDecimal gross = IjarahSupport.money(asset.getAcquisitionCost());
        BigDecimal nbv = IjarahSupport.money(asset.getNetBookValue());
        BigDecimal consideration = switch (transfer.getTransferType()) {
            case GIFT_HIBAH -> BigDecimal.ZERO.setScale(2, java.math.RoundingMode.HALF_UP);
            case SALE_AT_NOMINAL -> IjarahSupport.money(transfer.getNominalSalePrice());
            case SALE_AT_FAIR_VALUE -> IjarahSupport.money(transfer.getActualFairValue());
            case GRADUAL_TRANSFER -> throw new BusinessException("Use unit transfer processing for gradual IMB transfers",
                    "GRADUAL_TRANSFER_REQUIRES_UNIT_PROCESSING");
        };

        List<GeneralLedgerService.JournalLineRequest> lines = new ArrayList<>();
        if (consideration.compareTo(BigDecimal.ZERO) > 0) {
            lines.add(new GeneralLedgerService.JournalLineRequest(CASH_GL, consideration, BigDecimal.ZERO,
                    contract.getCurrencyCode(), BigDecimal.ONE, "IMB transfer consideration", null, "HEAD", contract.getAccountId(), contract.getCustomerId()));
        }
        if (accumulated.compareTo(BigDecimal.ZERO) > 0) {
            lines.add(new GeneralLedgerService.JournalLineRequest(ACCUMULATED_DEPR_GL, accumulated, BigDecimal.ZERO,
                    contract.getCurrencyCode(), BigDecimal.ONE, "Ijarah accumulated depreciation release", null, "HEAD", contract.getAccountId(), contract.getCustomerId()));
        }
        BigDecimal difference = IjarahSupport.money(consideration.subtract(nbv));
        if (difference.compareTo(BigDecimal.ZERO) > 0) {
            lines.add(new GeneralLedgerService.JournalLineRequest(GAIN_DISPOSAL_GL, BigDecimal.ZERO, difference,
                    contract.getCurrencyCode(), BigDecimal.ONE, "Gain on Ijarah transfer", null, "HEAD", contract.getAccountId(), contract.getCustomerId()));
        } else if (difference.compareTo(BigDecimal.ZERO) < 0) {
            lines.add(new GeneralLedgerService.JournalLineRequest(LOSS_DISPOSAL_GL, difference.abs(), BigDecimal.ZERO,
                    contract.getCurrencyCode(), BigDecimal.ONE, "Loss on Ijarah transfer", null, "HEAD", contract.getAccountId(), contract.getCustomerId()));
        }
        lines.add(new GeneralLedgerService.JournalLineRequest(ASSET_GROSS_GL, BigDecimal.ZERO, gross,
                contract.getCurrencyCode(), BigDecimal.ONE, "Ijarah asset derecognition", null, "HEAD", contract.getAccountId(), contract.getCustomerId()));

        JournalEntry journal = generalLedgerService.postJournal(
                "SYSTEM",
                "IMB transfer " + contract.getContractRef(),
                "IJARAH_GL",
                transfer.getTransferRef(),
                LocalDate.now(),
                actorProvider.getCurrentActor(),
                lines);
        transfer.setTransferJournalRef(journal.getJournalNumber());
        transfer.setAssetNetBookValueAtTransfer(nbv);
        transfer.setGainLossOnTransfer(difference);
        transferRepository.save(transfer);
        return journal;
    }

    public JournalEntry postGradualUnitTransfer(Long transferMechanismId, BigDecimal unitPrice, BigDecimal unitPercentage,
                                                String reference) {
        IjarahTransferMechanism transfer = transferRepository.findById(transferMechanismId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahTransferMechanism", "id", transferMechanismId));
        IjarahContract contract = findContract(transfer.getIjarahContractId());
        IjarahAsset asset = findAssetByContract(contract.getId());
        BigDecimal ratio = unitPercentage.divide(IjarahSupport.HUNDRED, 8, java.math.RoundingMode.HALF_UP);
        BigDecimal proportionalGross = IjarahSupport.money(asset.getAcquisitionCost().multiply(ratio));
        BigDecimal proportionalAccum = IjarahSupport.money(asset.getAccumulatedDepreciation().multiply(ratio));
        BigDecimal proportionalNbv = IjarahSupport.money(asset.getNetBookValue().multiply(ratio));
        BigDecimal difference = IjarahSupport.money(unitPrice.subtract(proportionalNbv));

        List<GeneralLedgerService.JournalLineRequest> lines = new ArrayList<>();
        lines.add(new GeneralLedgerService.JournalLineRequest(CASH_GL, unitPrice, BigDecimal.ZERO,
                contract.getCurrencyCode(), BigDecimal.ONE, "IMB unit transfer proceeds", null, "HEAD", contract.getAccountId(), contract.getCustomerId()));
        if (proportionalAccum.compareTo(BigDecimal.ZERO) > 0) {
            lines.add(new GeneralLedgerService.JournalLineRequest(ACCUMULATED_DEPR_GL, proportionalAccum, BigDecimal.ZERO,
                    contract.getCurrencyCode(), BigDecimal.ONE, "IMB unit depreciation release", null, "HEAD", contract.getAccountId(), contract.getCustomerId()));
        }
        if (difference.compareTo(BigDecimal.ZERO) > 0) {
            lines.add(new GeneralLedgerService.JournalLineRequest(GAIN_DISPOSAL_GL, BigDecimal.ZERO, difference,
                    contract.getCurrencyCode(), BigDecimal.ONE, "Gain on IMB unit transfer", null, "HEAD", contract.getAccountId(), contract.getCustomerId()));
        } else if (difference.compareTo(BigDecimal.ZERO) < 0) {
            lines.add(new GeneralLedgerService.JournalLineRequest(LOSS_DISPOSAL_GL, difference.abs(), BigDecimal.ZERO,
                    contract.getCurrencyCode(), BigDecimal.ONE, "Loss on IMB unit transfer", null, "HEAD", contract.getAccountId(), contract.getCustomerId()));
        }
        lines.add(new GeneralLedgerService.JournalLineRequest(ASSET_GROSS_GL, BigDecimal.ZERO, proportionalGross,
                contract.getCurrencyCode(), BigDecimal.ONE, "IMB unit asset derecognition", null, "HEAD", contract.getAccountId(), contract.getCustomerId()));
        return generalLedgerService.postJournal(
                "SYSTEM",
                "IMB gradual unit transfer " + contract.getContractRef(),
                "IJARAH_GL",
                reference,
                LocalDate.now(),
                actorProvider.getCurrentActor(),
                lines);
    }

    public JournalEntry postIjarahImpairment(Long assetId, BigDecimal impairmentAmount, String reason) {
        IjarahAsset asset = findAsset(assetId);
        return generalLedgerService.postJournal(
                "SYSTEM",
                reason,
                "IJARAH_GL",
                asset.getAssetRef() + "-IMPAIR-" + System.currentTimeMillis(),
                LocalDate.now(),
                actorProvider.getCurrentActor(),
                List.of(
                        new GeneralLedgerService.JournalLineRequest(IMPAIRMENT_EXPENSE_GL, impairmentAmount, BigDecimal.ZERO,
                                asset.getCurrencyCode(), BigDecimal.ONE, reason, null, "HEAD", null, asset.getLeasedToCustomerId()),
                        new GeneralLedgerService.JournalLineRequest(IMPAIRMENT_PROVISION_GL, BigDecimal.ZERO, impairmentAmount,
                                asset.getCurrencyCode(), BigDecimal.ONE, reason, null, "HEAD", null, asset.getLeasedToCustomerId())
                )
        );
    }

    @Transactional(readOnly = true)
    public IjarahResponses.IjarahBalanceSheetView getIjarahBalanceSheetView(LocalDate asOfDate) {
        BigDecimal gross = balance(ASSET_GROSS_GL, asOfDate);
        BigDecimal accum = balance(ACCUMULATED_DEPR_GL, asOfDate);
        BigDecimal impair = balance(IMPAIRMENT_PROVISION_GL, asOfDate);
        BigDecimal receivable = balance(RENTAL_RECEIVABLE_GL, asOfDate);
        BigDecimal rentalIncome = balance(RENTAL_INCOME_GL, asOfDate);
        BigDecimal depreciation = balance(DEPRECIATION_EXPENSE_GL, asOfDate);
        BigDecimal maintenance = balance(MAINTENANCE_EXPENSE_GL, asOfDate);
        BigDecimal insurance = balance(INSURANCE_EXPENSE_GL, asOfDate);
        BigDecimal netAssets = gross.subtract(accum).subtract(impair);
        BigDecimal netIncome = rentalIncome.subtract(depreciation).subtract(maintenance).subtract(insurance);

        return IjarahResponses.IjarahBalanceSheetView.builder()
                .grossIjarahAssets(gross)
                .accumulatedDepreciation(accum)
                .impairmentProvision(impair)
                .netIjarahAssets(netAssets)
                .rentalReceivable(receivable)
                .rentalIncome(rentalIncome)
                .depreciationExpense(depreciation)
                .maintenanceExpense(maintenance)
                .insuranceExpense(insurance)
                .netIjarahIncomeContribution(netIncome)
                .build();
    }

    @Transactional(readOnly = true)
    public IjarahResponses.IjarahIncomeReport getIncomeReport(LocalDate fromDate, LocalDate toDate) {
        IjarahResponses.IjarahBalanceSheetView toView = getIjarahBalanceSheetView(toDate);
        LocalDate beforeFrom = fromDate.minusDays(1);
        IjarahResponses.IjarahBalanceSheetView fromView = getIjarahBalanceSheetView(beforeFrom);
        BigDecimal rental = toView.getRentalIncome().subtract(fromView.getRentalIncome());
        BigDecimal depreciation = toView.getDepreciationExpense().subtract(fromView.getDepreciationExpense());
        BigDecimal maintenance = toView.getMaintenanceExpense().subtract(fromView.getMaintenanceExpense());
        BigDecimal insurance = toView.getInsuranceExpense().subtract(fromView.getInsuranceExpense());
        return IjarahResponses.IjarahIncomeReport.builder()
                .fromDate(fromDate)
                .toDate(toDate)
                .rentalIncome(rental)
                .depreciationExpense(depreciation)
                .maintenanceExpense(maintenance)
                .insuranceExpense(insurance)
                .netIncome(rental.subtract(depreciation).subtract(maintenance).subtract(insurance))
                .build();
    }

    @Transactional(readOnly = true)
    public BigDecimal getNetIjarahAssets(LocalDate asOfDate) {
        return getIjarahBalanceSheetView(asOfDate).getNetIjarahAssets();
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalRentalIncome(LocalDate fromDate, LocalDate toDate) {
        return getIncomeReport(fromDate, toDate).getRentalIncome();
    }

    private BigDecimal balance(String glCode, LocalDate asOfDate) {
        return glBalanceRepository.findByGlCodeAndBalanceDate(glCode, asOfDate).stream()
                .map(balance -> balance.getClosingBalance() == null ? BigDecimal.ZERO : balance.getClosingBalance())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void recordPoolIncome(IjarahContract contract, BigDecimal amount, String journalRef, String reference) {
        if (contract.getInvestmentPoolId() == null) {
            return;
        }
        poolAssetManagementService.recordIncome(contract.getInvestmentPoolId(), RecordPoolIncomeRequest.builder()
                .poolId(contract.getInvestmentPoolId())
                .assetAssignmentId(contract.getPoolAssetAssignmentId())
                .incomeType(IncomeType.IJARAH_RENTAL.name())
                .amount(amount)
                .currencyCode(contract.getCurrencyCode())
                .incomeDate(LocalDate.now())
                .periodFrom(LocalDate.now())
                .periodTo(LocalDate.now())
                .journalRef(journalRef)
                .assetReferenceCode(reference)
                .contractTypeCode("IJARAH")
                .notes("Ijarah rental income")
                .build());
    }

    private void recordPoolExpense(IjarahContract contract, ExpenseType expenseType, BigDecimal amount,
                                   String journalRef, String description) {
        if (contract.getInvestmentPoolId() == null) {
            return;
        }
        poolAssetManagementService.recordExpense(contract.getInvestmentPoolId(), RecordPoolExpenseRequest.builder()
                .poolId(contract.getInvestmentPoolId())
                .expenseType(expenseType.name())
                .amount(amount)
                .currencyCode(contract.getCurrencyCode())
                .expenseDate(LocalDate.now())
                .periodFrom(LocalDate.now())
                .periodTo(LocalDate.now())
                .journalRef(journalRef)
                .description(description)
                .allocationMethod(ExpenseAllocationMethod.DIRECT.name())
                .allocationBasis("CONTRACT_SPECIFIC")
                .build());
    }

    private IjarahContract findContract(Long contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahContract", "id", contractId));
    }

    private IjarahAsset findAsset(Long assetId) {
        return assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahAsset", "id", assetId));
    }

    private IjarahAsset findAssetByContract(Long contractId) {
        return assetRepository.findByIjarahContractId(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahAsset", "ijarahContractId", contractId));
    }
}
