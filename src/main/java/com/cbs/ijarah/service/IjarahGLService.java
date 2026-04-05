package com.cbs.ijarah.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.gl.repository.JournalEntryRepository;
import com.cbs.ijarah.dto.IjarahResponses;
import com.cbs.ijarah.entity.IjarahAsset;
import com.cbs.ijarah.entity.IjarahAssetMaintenanceRecord;
import com.cbs.ijarah.entity.IjarahContract;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import com.cbs.ijarah.repository.IjarahAssetMaintenanceRecordRepository;
import com.cbs.ijarah.repository.IjarahAssetRepository;
import com.cbs.ijarah.repository.IjarahContractRepository;
import com.cbs.ijarah.repository.IjarahRentalInstallmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class IjarahGLService {

    private final IjarahAssetRepository assetRepository;
    private final IjarahContractRepository contractRepository;
    private final IjarahRentalInstallmentRepository installmentRepository;
    private final IjarahAssetMaintenanceRecordRepository maintenanceRecordRepository;
    private final IjarahAssetService assetService;
    private final IslamicPostingRuleService postingRuleService;
    private final JournalEntryRepository journalEntryRepository;

    /** Configurable GL account codes instead of hardcoded values. */
    @Value("${ijarah.gl.customer-account-code:1620-IJR-001}")
    private String customerAccountGlCode;

    @Value("${ijarah.gl.rental-income-code:4100-IJR-001}")
    private String rentalIncomeGlCode;

    @Value("${ijarah.gl.depreciation-expense-code:5200-IJR-001}")
    private String depreciationExpenseGlCode;

    /** Tracks accrual references to prevent double-posting. Uses DB journal lookup as primary guard (cluster-safe),
     *  with bounded in-memory LRU as a fast-path cache to reduce DB queries on the same node. */
    private final Map<String, Boolean> postedAccrualsCache = Collections.synchronizedMap(
            new LinkedHashMap<String, Boolean>(10000, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, Boolean> eldest) {
                    return size() > 10000;
                }
            });

    private boolean isAccrualAlreadyPosted(String accrualRef) {
        if (postedAccrualsCache.containsKey(accrualRef)) return true;
        boolean existsInDb = generalLedgerService.journalExistsByReference(accrualRef);
        if (existsInDb) postedAccrualsCache.put(accrualRef, true);
        return existsInDb;
    }

    private void markAccrualPosted(String accrualRef) {
        postedAccrualsCache.put(accrualRef, true);
    }

    public void postMonthlyDepreciation(Long assetId) {
        assetService.processMonthlyDepreciation(assetId);
    }

    public void postDepreciationBatch(LocalDate asOfMonth) {
        assetService.processDepreciationBatch();
    }

    public void recogniseRentalIncome(Long contractId, LocalDate periodFrom, LocalDate periodTo) {
        IjarahContract contract = getContract(contractId);

        // Double-accrual prevention: check if accrual already posted for this contract and period
        String accrualKey = contract.getContractRef() + "-ACCR-" + periodTo;
        if (postedAccruals.putIfAbsent(accrualKey, Boolean.TRUE) != null) {
            log.warn("Accrual already posted for contract {} period ending {}, skipping", contract.getContractRef(), periodTo);
            return;
        }
        // Also check if a journal entry with this reference already exists
        boolean alreadyPosted = journalEntryRepository.findByPostingDateBetweenOrderByPostingDateDesc(periodFrom, periodTo,
                        org.springframework.data.domain.Pageable.unpaged()).stream()
                .anyMatch(journal -> accrualKey.equals(journal.getSourceRef()));
        if (alreadyPosted) {
            log.warn("Accrual journal already exists for contract {} period ending {}, skipping", contract.getContractRef(), periodTo);
            return;
        }

        BigDecimal accrual = installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId).stream()
                .filter(installment -> !installment.getDueDate().isBefore(periodFrom) && !installment.getDueDate().isAfter(periodTo))
                .filter(installment -> installment.getStatus() != IjarahDomainEnums.RentalInstallmentStatus.PAID)
                .map(installment -> IjarahSupport.money(installment.getNetRentalAmount()))
                .reduce(IjarahSupport.ZERO, BigDecimal::add);
        if (accrual.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("IJARAH")
                .txnType(IslamicTransactionType.RENTAL_INCOME_ACCRUAL)
                .accountId(contract.getAccountId())
                .amount(accrual)
                .rental(accrual)
                .reference(accrualKey)
                .valueDate(periodTo)
                .additionalContext(Map.of("customerAccountGlCode", customerAccountGlCode))
                .build());
    }

    public void recogniseRentalIncomeBatch(LocalDate periodFrom, LocalDate periodTo) {
        contractRepository.findByStatus(IjarahDomainEnums.ContractStatus.ACTIVE)
                .forEach(contract -> recogniseRentalIncome(contract.getId(), periodFrom, periodTo));
        contractRepository.findByStatus(IjarahDomainEnums.ContractStatus.RENTAL_ARREARS)
                .forEach(contract -> recogniseRentalIncome(contract.getId(), periodFrom, periodTo));
    }

    public void postIjarahImpairment(Long assetId, BigDecimal impairmentAmount, String reason) {
        IjarahAsset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahAsset", "id", assetId));
        BigDecimal amount = IjarahSupport.money(impairmentAmount);
        postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("IJARAH")
                .txnType(IslamicTransactionType.IMPAIRMENT_PROVISION)
                .amount(amount)
                .reference(asset.getAssetRef() + "-IMP")
                .valueDate(LocalDate.now())
                .additionalContext(Map.of("impairmentType", "IJARAH_ASSET"))
                .narration(reason)
                .build());
        asset.setImpairmentProvisionBalance(IjarahSupport.money(asset.getImpairmentProvisionBalance().add(amount)));
        asset.setNetBookValue(IjarahSupport.money(asset.getAcquisitionCost()
                .subtract(asset.getAccumulatedDepreciation())
                .subtract(asset.getImpairmentProvisionBalance())));
        assetRepository.save(asset);
    }

    @Transactional(readOnly = true)
    public IjarahResponses.IjarahBalanceSheetView getIjarahBalanceSheetView(LocalDate asOfDate) {
        // Filter assets and contracts to only those that existed as of the given date
        List<IjarahAsset> assets = assetRepository.findAll().stream()
                .filter(asset -> asset.getAcquisitionDate() != null && !asset.getAcquisitionDate().isAfter(asOfDate))
                .filter(asset -> asset.getDisposalDate() == null || !asset.getDisposalDate().isBefore(asOfDate))
                .toList();
        List<IjarahContract> contracts = contractRepository.findAll().stream()
                .filter(contract -> contract.getLeaseStartDate() == null || !contract.getLeaseStartDate().isAfter(asOfDate))
                .filter(contract -> contract.getTerminatedAt() == null || !contract.getTerminatedAt().isBefore(asOfDate))
                .toList();
        BigDecimal gross = assets.stream().map(asset -> IjarahSupport.money(asset.getAcquisitionCost())).reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal depreciation = assets.stream().map(asset -> IjarahSupport.money(asset.getAccumulatedDepreciation())).reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal impairment = assets.stream().map(asset -> IjarahSupport.money(asset.getImpairmentProvisionBalance())).reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal receivable = contracts.stream().map(contract -> IjarahSupport.money(contract.getTotalRentalArrears())).reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal rentalIncome = contracts.stream().map(contract -> IjarahSupport.money(contract.getTotalRentalsReceived())).reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal maintenanceExpense = maintenanceRecordRepository.findAll().stream()
                .filter(record -> record.getResponsibleParty() == IjarahDomainEnums.ResponsibleParty.BANK)
                .filter(record -> record.getMaintenanceDate() != null && !record.getMaintenanceDate().isAfter(asOfDate))
                .map(record -> IjarahSupport.money(record.getCost()))
                .reduce(IjarahSupport.ZERO, BigDecimal::add);
        // Pro-rate insurance expense up to asOfDate based on each asset's acquisition date
        BigDecimal insuranceExpense = assets.stream()
                .filter(asset -> asset.getInsurancePremiumAnnual() != null
                        && asset.getInsurancePremiumAnnual().compareTo(BigDecimal.ZERO) > 0
                        && asset.getAcquisitionDate() != null)
                .map(asset -> {
                    BigDecimal annualPremium = IjarahSupport.money(asset.getInsurancePremiumAnnual());
                    LocalDate startDate = asset.getAcquisitionDate();
                    long daysActive = ChronoUnit.DAYS.between(startDate, asOfDate) + 1;
                    if (daysActive <= 0) return IjarahSupport.ZERO;
                    BigDecimal dailyRate = annualPremium.divide(BigDecimal.valueOf(365), 8, RoundingMode.HALF_UP);
                    return IjarahSupport.money(dailyRate.multiply(BigDecimal.valueOf(daysActive)));
                })
                .reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal netAssets = gross.subtract(depreciation).subtract(impairment);
        BigDecimal netIncome = rentalIncome.subtract(depreciation).subtract(maintenanceExpense).subtract(insuranceExpense);

        return IjarahResponses.IjarahBalanceSheetView.builder()
                .grossIjarahAssets(gross)
                .accumulatedDepreciation(depreciation)
                .impairmentProvision(impairment)
                .netIjarahAssets(netAssets)
                .rentalReceivable(receivable)
                .rentalIncome(rentalIncome)
                .depreciationExpense(depreciation)
                .maintenanceExpense(maintenanceExpense)
                .insuranceExpense(insuranceExpense)
                .netIjarahIncomeContribution(netIncome)
                .build();
    }

    @Transactional(readOnly = true)
    public IjarahResponses.IjarahIncomeReport getIncomeReport(LocalDate fromDate, LocalDate toDate) {
        BigDecimal rentalIncome = installmentRepository.findAll().stream()
                .filter(installment -> installment.getPaidDate() != null)
                .filter(installment -> !installment.getPaidDate().isBefore(fromDate) && !installment.getPaidDate().isAfter(toDate))
                .map(installment -> IjarahSupport.money(installment.getPaidAmount()))
                .reduce(IjarahSupport.ZERO, BigDecimal::add);

        // Sum depreciation from GL journal entries for the period instead of using snapshot monthlyDepreciation
        BigDecimal depreciationExpense = assetRepository.findAll().stream()
                .map(asset -> {
                    String depreciationRefPrefix = asset.getAssetRef() + "-DEPR-";
                    // Sum depreciation journal entries that fall within the reporting period
                    return journalEntryRepository.findByPostingDateBetweenOrderByPostingDateDesc(fromDate, toDate, Pageable.unpaged())
                            .stream()
                            .filter(journal -> journal.getSourceRef() != null && journal.getSourceRef().startsWith(depreciationRefPrefix))
                            .map(journal -> IjarahSupport.money(journal.getTotalDebit()))
                            .reduce(IjarahSupport.ZERO, BigDecimal::add);
                })
                .reduce(IjarahSupport.ZERO, BigDecimal::add);

        BigDecimal maintenanceExpense = maintenanceRecordRepository.findAll().stream()
                .filter(record -> record.getMaintenanceDate() != null)
                .filter(record -> !record.getMaintenanceDate().isBefore(fromDate) && !record.getMaintenanceDate().isAfter(toDate))
                .filter(record -> record.getResponsibleParty() == IjarahDomainEnums.ResponsibleParty.BANK)
                .map(IjarahAssetMaintenanceRecord::getCost)
                .map(IjarahSupport::money)
                .reduce(IjarahSupport.ZERO, BigDecimal::add);

        // Pro-rate insurance premium over the reporting period instead of filtering by expiry date
        long reportingDays = ChronoUnit.DAYS.between(fromDate, toDate) + 1;
        BigDecimal insuranceExpense = assetRepository.findAll().stream()
                .filter(asset -> asset.getInsurancePremiumAnnual() != null
                        && asset.getInsurancePremiumAnnual().compareTo(BigDecimal.ZERO) > 0
                        && asset.getInsuranceExpiryDate() != null)
                .map(asset -> {
                    BigDecimal annualPremium = IjarahSupport.money(asset.getInsurancePremiumAnnual());
                    BigDecimal dailyRate = annualPremium.divide(BigDecimal.valueOf(365), 8, RoundingMode.HALF_UP);
                    return IjarahSupport.money(dailyRate.multiply(BigDecimal.valueOf(reportingDays)));
                })
                .reduce(IjarahSupport.ZERO, BigDecimal::add);

        // Per-contract income filtered to the reporting period (not cumulative)
        Map<String, BigDecimal> byContract = contractRepository.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(
                        IjarahContract::getContractRef,
                        contract -> installmentRepository.findByContractIdOrderByInstallmentNumberAsc(contract.getId()).stream()
                                .filter(installment -> installment.getPaidDate() != null)
                                .filter(installment -> !installment.getPaidDate().isBefore(fromDate)
                                        && !installment.getPaidDate().isAfter(toDate))
                                .map(installment -> IjarahSupport.money(installment.getPaidAmount()))
                                .reduce(IjarahSupport.ZERO, BigDecimal::add),
                        BigDecimal::add,
                        java.util.LinkedHashMap::new));

        return IjarahResponses.IjarahIncomeReport.builder()
                .fromDate(fromDate)
                .toDate(toDate)
                .rentalIncome(rentalIncome)
                .depreciationExpense(depreciationExpense)
                .maintenanceExpense(maintenanceExpense)
                .insuranceExpense(insuranceExpense)
                .netIncome(rentalIncome.subtract(depreciationExpense).subtract(maintenanceExpense).subtract(insuranceExpense))
                .byContract(byContract)
                .build();
    }

    @Transactional(readOnly = true)
    public BigDecimal getNetIjarahAssets(LocalDate asOfDate) {
        IjarahResponses.IjarahBalanceSheetView view = getIjarahBalanceSheetView(asOfDate);
        return view.getNetIjarahAssets();
    }

    public void reverseIjarahImpairment(Long assetId, BigDecimal reversalAmount, String reason) {
        IjarahAsset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahAsset", "id", assetId));
        BigDecimal amount = IjarahSupport.money(reversalAmount);
        BigDecimal currentProvision = IjarahSupport.money(asset.getImpairmentProvisionBalance());
        if (amount.compareTo(currentProvision) > 0) {
            throw new IllegalArgumentException("Reversal amount cannot exceed current impairment provision of " + currentProvision);
        }

        postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("IJARAH")
                .txnType(IslamicTransactionType.IMPAIRMENT_REVERSAL)
                .amount(amount)
                .reference(asset.getAssetRef() + "-IMP-REV")
                .valueDate(LocalDate.now())
                .additionalContext(Map.of("impairmentType", "IJARAH_ASSET_REVERSAL"))
                .narration(reason)
                .build());
        asset.setImpairmentProvisionBalance(IjarahSupport.money(currentProvision.subtract(amount)));
        asset.setNetBookValue(IjarahSupport.money(asset.getAcquisitionCost()
                .subtract(asset.getAccumulatedDepreciation())
                .subtract(asset.getImpairmentProvisionBalance())));
        assetRepository.save(asset);
        log.info("Reversed impairment of {} for asset {} - reason: {}", amount, asset.getAssetRef(), reason);
    }

    private IjarahContract getContract(Long contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahContract", "id", contractId));
    }
}
