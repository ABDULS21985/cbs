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
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class IjarahGLService {

    private final IjarahAssetRepository assetRepository;
    private final IjarahContractRepository contractRepository;
    private final IjarahRentalInstallmentRepository installmentRepository;
    private final IjarahAssetMaintenanceRecordRepository maintenanceRecordRepository;
    private final IjarahAssetService assetService;
    private final IslamicPostingRuleService postingRuleService;

    public void postMonthlyDepreciation(Long assetId) {
        assetService.processMonthlyDepreciation(assetId);
    }

    public void postDepreciationBatch(LocalDate asOfMonth) {
        assetService.processDepreciationBatch();
    }

    public void recogniseRentalIncome(Long contractId, LocalDate periodFrom, LocalDate periodTo) {
        IjarahContract contract = getContract(contractId);
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
                .reference(contract.getContractRef() + "-ACCR-" + periodTo)
                .valueDate(periodTo)
                .additionalContext(Map.of("customerAccountGlCode", "1620-IJR-001"))
                .build());
    }

    public void recogniseRentalIncomeBatch(LocalDate periodFrom, LocalDate periodTo) {
        contractRepository.findByStatus(IjarahDomainEnums.ContractStatus.ACTIVE)
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
        List<IjarahAsset> assets = assetRepository.findAll();
        List<IjarahContract> contracts = contractRepository.findAll();
        BigDecimal gross = assets.stream().map(asset -> IjarahSupport.money(asset.getAcquisitionCost())).reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal depreciation = assets.stream().map(asset -> IjarahSupport.money(asset.getAccumulatedDepreciation())).reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal impairment = assets.stream().map(asset -> IjarahSupport.money(asset.getImpairmentProvisionBalance())).reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal receivable = contracts.stream().map(contract -> IjarahSupport.money(contract.getTotalRentalArrears())).reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal rentalIncome = contracts.stream().map(contract -> IjarahSupport.money(contract.getTotalRentalsReceived())).reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal maintenanceExpense = maintenanceRecordRepository.findAll().stream()
                .filter(record -> record.getResponsibleParty() == IjarahDomainEnums.ResponsibleParty.BANK)
                .map(record -> IjarahSupport.money(record.getCost()))
                .reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal insuranceExpense = assets.stream().map(asset -> IjarahSupport.money(asset.getInsurancePremiumAnnual())).reduce(IjarahSupport.ZERO, BigDecimal::add);
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
        BigDecimal depreciationExpense = assetRepository.findAll().stream()
                .filter(asset -> asset.getLastDepreciationDate() != null)
                .filter(asset -> !asset.getLastDepreciationDate().isBefore(fromDate) && !asset.getLastDepreciationDate().isAfter(toDate))
                .map(asset -> IjarahSupport.money(asset.getMonthlyDepreciation()))
                .reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal maintenanceExpense = maintenanceRecordRepository.findAll().stream()
                .filter(record -> record.getMaintenanceDate() != null)
                .filter(record -> !record.getMaintenanceDate().isBefore(fromDate) && !record.getMaintenanceDate().isAfter(toDate))
                .filter(record -> record.getResponsibleParty() == IjarahDomainEnums.ResponsibleParty.BANK)
                .map(IjarahAssetMaintenanceRecord::getCost)
                .map(IjarahSupport::money)
                .reduce(IjarahSupport.ZERO, BigDecimal::add);
        BigDecimal insuranceExpense = assetRepository.findAll().stream()
                .filter(asset -> asset.getInsuranceExpiryDate() != null)
                .filter(asset -> !asset.getInsuranceExpiryDate().isBefore(fromDate) && !asset.getInsuranceExpiryDate().isAfter(toDate))
                .map(asset -> IjarahSupport.money(asset.getInsurancePremiumAnnual()))
                .reduce(IjarahSupport.ZERO, BigDecimal::add);

        return IjarahResponses.IjarahIncomeReport.builder()
                .fromDate(fromDate)
                .toDate(toDate)
                .rentalIncome(rentalIncome)
                .depreciationExpense(depreciationExpense)
                .maintenanceExpense(maintenanceExpense)
                .insuranceExpense(insuranceExpense)
                .netIncome(rentalIncome.subtract(depreciationExpense).subtract(maintenanceExpense).subtract(insuranceExpense))
                .byContract(contractRepository.findAll().stream().collect(java.util.stream.Collectors.toMap(
                        IjarahContract::getContractRef,
                        contract -> IjarahSupport.money(contract.getTotalRentalsReceived()),
                        BigDecimal::add,
                        java.util.LinkedHashMap::new)))
                .build();
    }

    @Transactional(readOnly = true)
    public BigDecimal getNetIjarahAssets(LocalDate asOfDate) {
        IjarahResponses.IjarahBalanceSheetView view = getIjarahBalanceSheetView(asOfDate);
        return view.getNetIjarahAssets();
    }

    private IjarahContract getContract(Long contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("IjarahContract", "id", contractId));
    }
}
