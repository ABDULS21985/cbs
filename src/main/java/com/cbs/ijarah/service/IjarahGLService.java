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
                if (postedAccrualsCache.containsKey(accrualRef)) {
                        return true;
                }
                boolean existsInDb = journalEntryRepository.existsBySourceRef(accrualRef);
                if (existsInDb) {
                        postedAccrualsCache.put(accrualRef, true);
                }
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
                if (isAccrualAlreadyPosted(accrualKey)) {
            log.warn("Accrual already posted for contract {} period ending {}, skipping", contract.getContractRef(), periodTo);
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
        markAccrualPosted(accrualKey);
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
        // Use date-filtered repository queries instead of loading all records
        List<IjarahAsset> assets = assetRepository.findActiveAssetsAsOfDate(asOfDate);
        List<IjarahContract> contracts = contractRepository.findActiveContractsAsOfDate(asOfDate);
        BigDecimal gross = assets.stream().map(asset -> IjarahSupport.money(asset.getAcquisitionCost())).reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal depreciation = assets.stream().map(asset -> IjarahSupport.money(asset.getAccumulatedDepreciation())).reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal impairment = assets.stream().map(asset -> IjarahSupport.money(asset.getImpairmentProvisionBalance())).reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal receivable = contracts.stream().map(contract -> IjarahSupport.money(contract.getTotalRentalArrears())).reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal rentalIncome = contracts.stream().map(contract -> IjarahSupport.money(contract.getTotalRentalsReceived())).reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal maintenanceExpense = maintenanceRecordRepository
                .findByResponsiblePartyAndMaintenanceDateLessThanEqual(IjarahDomainEnums.ResponsibleParty.BANK, asOfDate)
                .stream()
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
        // Use date-filtered queries instead of loading all installments into memory
        BigDecimal rentalIncome = installmentRepository.findByPaidDateBetween(fromDate, toDate).stream()
                .map(installment -> IjarahSupport.money(installment.getPaidAmount()))
                .reduce(IjarahSupport.ZERO, BigDecimal::add);

        // Sum depreciation from GL journal entries for the period using a single query with DEPR prefix filter
        BigDecimal depreciationExpense = journalEntryRepository.findByPostingDateBetweenOrderByPostingDateDesc(fromDate, toDate, Pageable.unpaged())
                .stream()
                .filter(journal -> journal.getSourceRef() != null && journal.getSourceRef().contains("-DEPR-"))
                .map(journal -> IjarahSupport.money(journal.getTotalDebit()))
                .reduce(IjarahSupport.ZERO, BigDecimal::add);

        // Use date-filtered query for maintenance records
        BigDecimal maintenanceExpense = maintenanceRecordRepository
                .findByResponsiblePartyAndMaintenanceDateBetween(IjarahDomainEnums.ResponsibleParty.BANK, fromDate, toDate)
                .stream()
                .map(IjarahAssetMaintenanceRecord::getCost)
                .map(IjarahSupport::money)
                .reduce(IjarahSupport.ZERO, BigDecimal::add);

        // Pro-rate insurance premium over the reporting period - query only insured assets
        long reportingDays = ChronoUnit.DAYS.between(fromDate, toDate) + 1;
        BigDecimal insuranceExpense = assetRepository.findAssetsWithActiveInsurance().stream()
                .map(asset -> {
                    BigDecimal annualPremium = IjarahSupport.money(asset.getInsurancePremiumAnnual());
                    BigDecimal dailyRate = annualPremium.divide(BigDecimal.valueOf(365), 8, RoundingMode.HALF_UP);
                    return IjarahSupport.money(dailyRate.multiply(BigDecimal.valueOf(reportingDays)));
                })
                .reduce(IjarahSupport.ZERO, BigDecimal::add);

        // Per-contract income filtered to the reporting period - only query contracts that had payments in this period
        List<IjarahContract> contractsWithPayments = contractRepository.findContractsWithPaymentsInPeriod(fromDate, toDate);
        Map<String, BigDecimal> byContract = new java.util.LinkedHashMap<>();
        for (IjarahContract contract : contractsWithPayments) {
            BigDecimal contractIncome = installmentRepository.findByContractIdAndPaidDateBetween(contract.getId(), fromDate, toDate)
                    .stream()
                    .map(installment -> IjarahSupport.money(installment.getPaidAmount()))
                    .reduce(IjarahSupport.ZERO, BigDecimal::add);
            byContract.merge(contract.getContractRef(), contractIncome, BigDecimal::add);
        }

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
