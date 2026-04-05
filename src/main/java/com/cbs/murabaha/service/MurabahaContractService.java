package com.cbs.murabaha.service;

import com.cbs.account.dto.OpenAccountRequest;
import com.cbs.account.entity.AccountType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.ProductRepository;
import com.cbs.account.service.AccountService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.murabaha.dto.EarlySettlementQuote;
import com.cbs.murabaha.dto.EarlySettlementRequest;
import com.cbs.murabaha.dto.MurabahaContractResponse;
import com.cbs.murabaha.dto.MurabahaPortfolioSummary;
import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.murabaha.repository.MurabahaContractRepository;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.profitdistribution.dto.AssignAssetToPoolRequest;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MurabahaContractService {

    private final MurabahaContractRepository contractRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final IslamicProductTemplateRepository islamicProductTemplateRepository;
    private final AccountService accountService;
    private final AccountRepository accountRepository;
    private final IslamicPostingRuleService postingRuleService;
    private final MurabahaScheduleService scheduleService;
    private final MurabahaProfitRecognitionService profitRecognitionService;
    private final PoolAssetManagementService poolAssetManagementService;

    @Transactional(readOnly = true)
    public MurabahaContractResponse getContract(Long contractId) {
        return MurabahaSupport.toContractResponse(findContract(contractId));
    }

    @Transactional(readOnly = true)
    public MurabahaContractResponse getContractByRef(String contractRef) {
        return MurabahaSupport.toContractResponse(contractRepository.findByContractRef(contractRef)
                .orElseThrow(() -> new ResourceNotFoundException("MurabahaContract", "contractRef", contractRef)));
    }

    @Transactional(readOnly = true)
    public List<MurabahaContractResponse> getCustomerContracts(Long customerId) {
        customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
        return contractRepository.findByCustomerId(customerId).stream()
                .map(MurabahaSupport::toContractResponse)
                .toList();
    }

    public void lockSellingPrice(Long contractId) {
        MurabahaContract contract = findContract(contractId);
        if (!Boolean.TRUE.equals(contract.getSellingPriceLocked())) {
            validateSellingPriceArithmetic(contract);
            contract.setSellingPriceLocked(Boolean.TRUE);
            contract.setSellingPriceLockedAt(Instant.now());
            contractRepository.save(contract);
        }
    }

    public MurabahaContractResponse executeContract(Long contractId, String executedBy) {
        MurabahaContract contract = findContract(contractId);
        if (!Boolean.TRUE.equals(contract.getOwnershipVerified())) {
            throw new BusinessException("Contract cannot be executed without verified ownership",
                    "OWNERSHIP_NOT_VERIFIED");
        }
        if (contract.getStatus() == MurabahaDomainEnums.ContractStatus.ACTIVE
                || contract.getStatus() == MurabahaDomainEnums.ContractStatus.SETTLED
                || contract.getStatus() == MurabahaDomainEnums.ContractStatus.EARLY_SETTLED) {
            throw new BusinessException("Murabaha contract is already active or settled", "INVALID_CONTRACT_STATUS");
        }

        lockSellingPrice(contractId);
        if (contract.getAccountId() == null) {
            contract.setAccountId(openFinancingAccount(contract));
        }

        if (scheduleService.getSchedule(contractId).isEmpty()) {
            scheduleService.generateSchedule(contractId);
        }

        BigDecimal financedCostPortion = MurabahaSupport.money(contract.getCostPrice().subtract(MurabahaSupport.money(contract.getDownPayment())));
        postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("MURABAHA")
                .txnType(IslamicTransactionType.FINANCING_DISBURSEMENT)
                .accountId(contract.getAccountId())
                .amount(contract.getFinancedAmount())
                .principal(financedCostPortion)
                .markup(contract.getMarkupAmount())
                .valueDate(LocalDate.now())
                .reference(contract.getContractRef() + "-EXEC")
                .build());

        log.info("AUDIT: Murabaha contract executed - ref={}, costPrice={}, markup={}, sellingPrice={}, financedAmount={}, actor={}",
                contract.getContractRef(), contract.getCostPrice(), contract.getMarkupAmount(),
                contract.getSellingPrice(), contract.getFinancedAmount(), executedBy);

        if (contract.getInvestmentPoolId() != null && contract.getPoolAssetAssignmentId() == null) {
            var assignment = poolAssetManagementService.assignAssetToPool(
                    contract.getInvestmentPoolId(),
                    AssignAssetToPoolRequest.builder()
                            .poolId(contract.getInvestmentPoolId())
                            .assetType("MURABAHA_FINANCING")
                            .assetReferenceId(contract.getId())
                            .assetReferenceCode(contract.getContractRef())
                            .assetDescription(contract.getAssetDescription())
                            .assignedAmount(financedCostPortion)
                            .currentOutstanding(financedCostPortion)
                            .currencyCode(contract.getCurrencyCode())
                            .contractTypeCode("MURABAHA")
                            .expectedReturnRate(contract.getMarkupRate())
                            .maturityDate(contract.getMaturityDate())
                            .build());
            contract.setPoolAssetAssignmentId(assignment.getId());
        }

        contract.setStatus(MurabahaDomainEnums.ContractStatus.ACTIVE);
        contract.setExecutedAt(Instant.now());
        contract.setExecutedBy(executedBy);
        contract.appendOwnershipEvent(Map.of(
                "event", "MURABAHA_EXECUTED",
                "executedBy", executedBy,
                "timestamp", Instant.now().toString()));
        contractRepository.save(contract);
        return MurabahaSupport.toContractResponse(contract);
    }

    @Transactional(readOnly = true)
    public EarlySettlementQuote calculateEarlySettlement(Long contractId, LocalDate settlementDate) {
        return scheduleService.calculateEarlySettlement(contractId, settlementDate);
    }

    public MurabahaContractResponse processEarlySettlement(Long contractId,
                                                           LocalDate settlementDate,
                                                           BigDecimal ibraAmount,
                                                           Long debitAccountId,
                                                           String externalRef) {
        // Validate Ibra mode
        MurabahaContract contract = findContract(contractId);
        if (contract.getEarlySettlementRebateMethod() == MurabahaDomainEnums.EarlySettlementRebateMethod.IBRA_MANDATORY) {
            // Bank MUST waive all unrecognised profit
            BigDecimal expectedIbra = contract.getUnrecognisedProfit();
            if (ibraAmount.compareTo(expectedIbra) < 0) {
                log.warn("IBRA_MANDATORY mode requires full waiver of unrecognised profit {}. Provided ibra={}", expectedIbra, ibraAmount);
                ibraAmount = expectedIbra; // Force full Ibra
            }
        } else if (contract.getEarlySettlementRebateMethod() == MurabahaDomainEnums.EarlySettlementRebateMethod.NO_REBATE) {
            ibraAmount = BigDecimal.ZERO; // No rebate allowed
        }

        scheduleService.processEarlySettlement(
                contractId,
                EarlySettlementRequest.builder()
                        .settlementDate(settlementDate)
                        .ibraAmount(ibraAmount)
                        .debitAccountId(debitAccountId)
                        .externalRef(externalRef)
                        .build());
        contract = findContract(contractId);
        if (contract.getPoolAssetAssignmentId() != null) {
            try {
                poolAssetManagementService.unassignAssetFromPool(contract.getPoolAssetAssignmentId(), "EARLY_SETTLEMENT");
            } catch (RuntimeException ex) {
                log.warn("Unable to unassign Murabaha asset {} from pool after settlement: {}",
                        contract.getPoolAssetAssignmentId(), ex.getMessage());
            }
        }
        return MurabahaSupport.toContractResponse(contract);
    }

    public void markAsDefaulted(Long contractId, String reason) {
        MurabahaContract contract = findContract(contractId);
        if (contract.getStatus() == MurabahaDomainEnums.ContractStatus.WRITTEN_OFF) {
            throw new BusinessException("Written-off Murabaha contracts cannot be defaulted again",
                    "INVALID_CONTRACT_STATUS");
        }
        contract.setStatus(MurabahaDomainEnums.ContractStatus.DEFAULTED);
        contract.appendOwnershipEvent(Map.of(
                "event", "DEFAULT",
                "reason", reason,
                "timestamp", Instant.now().toString()));
        contractRepository.save(contract);
    }

    public void writeOff(Long contractId, String approvedBy, String reason) {
        MurabahaContract contract = findContract(contractId);
        if (contract.getStatus() != MurabahaDomainEnums.ContractStatus.DEFAULTED
                && contract.getStatus() != MurabahaDomainEnums.ContractStatus.ACTIVE) {
            throw new BusinessException("Murabaha contract must be defaulted before write-off",
                    "INVALID_CONTRACT_STATUS");
        }
        EarlySettlementQuote quote = scheduleService.calculateEarlySettlement(contractId, LocalDate.now());
        postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("MURABAHA")
                .txnType(IslamicTransactionType.CONTRACT_CANCELLATION)
                .accountId(contract.getAccountId())
                .amount(quote.getRemainingBalance())
                .principal(quote.getOutstandingPrincipal())
                .markup(contract.getUnrecognisedProfit())
                .valueDate(LocalDate.now())
                .reference(contract.getContractRef() + "-WOFF")
                .narration(reason)
                .build());

        contract.setStatus(MurabahaDomainEnums.ContractStatus.WRITTEN_OFF);
        contract.setUnrecognisedProfit(MurabahaSupport.ZERO);
        contract.appendOwnershipEvent(Map.of(
                "event", "WRITE_OFF",
                "approvedBy", approvedBy,
                "reason", reason,
                "timestamp", Instant.now().toString()));
        contractRepository.save(contract);
    }

    @Transactional(readOnly = true)
    public MurabahaPortfolioSummary getPortfolioSummary() {
        List<MurabahaContract> contracts = contractRepository.findAll();
        BigDecimal totalOutstanding = contracts.stream()
                .filter(contract -> contract.getStatus() == MurabahaDomainEnums.ContractStatus.ACTIVE
                        || contract.getStatus() == MurabahaDomainEnums.ContractStatus.EXECUTED
                        || contract.getStatus() == MurabahaDomainEnums.ContractStatus.DEFAULTED)
                .map(contract -> {
                    // Calculate actual outstanding from schedule: sum of unpaid principal + unpaid profit
                    var schedule = scheduleService.getSchedule(contract.getId());
                    if (schedule.isEmpty()) {
                        return contract.getFinancedAmount();
                    }
                    return schedule.stream()
                            .filter(inst -> inst.getStatus() != MurabahaDomainEnums.InstallmentStatus.PAID
                                    && inst.getStatus() != MurabahaDomainEnums.InstallmentStatus.WAIVED)
                            .map(inst -> MurabahaSupport.money(inst.getTotalInstallmentAmount()
                                    .subtract(MurabahaSupport.money(inst.getPaidPrincipal()))
                                    .subtract(MurabahaSupport.money(inst.getPaidProfit()))))
                            .reduce(MurabahaSupport.ZERO, BigDecimal::add);
                })
                .reduce(MurabahaSupport.ZERO, BigDecimal::add);
        BigDecimal totalDeferred = contracts.stream()
                .map(MurabahaContract::getUnrecognisedProfit)
                .reduce(MurabahaSupport.ZERO, BigDecimal::add);
        BigDecimal totalRecognised = contracts.stream()
                .map(MurabahaContract::getRecognisedProfit)
                .reduce(MurabahaSupport.ZERO, BigDecimal::add);
        BigDecimal totalProvision = contracts.stream()
                .map(MurabahaContract::getImpairmentProvisionBalance)
                .reduce(MurabahaSupport.ZERO, BigDecimal::add);
        BigDecimal avgMarkup = contracts.isEmpty()
                ? BigDecimal.ZERO
                : contracts.stream()
                .map(MurabahaContract::getMarkupRate)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(contracts.size()), 8, java.math.RoundingMode.HALF_UP);
        long defaulted = contracts.stream().filter(contract -> contract.getStatus() == MurabahaDomainEnums.ContractStatus.DEFAULTED).count();

        return MurabahaPortfolioSummary.builder()
                .totalContracts(contracts.size())
                .totalOutstanding(totalOutstanding)
                .totalDeferredProfit(totalDeferred)
                .totalRecognisedProfit(totalRecognised)
                .totalImpairmentProvision(totalProvision)
                .averageMarkupRate(MurabahaSupport.rate(avgMarkup))
                .nplRatio(contracts.isEmpty() ? BigDecimal.ZERO
                        : BigDecimal.valueOf(defaulted).multiply(MurabahaSupport.HUNDRED)
                        .divide(BigDecimal.valueOf(contracts.size()), 8, java.math.RoundingMode.HALF_UP))
                .byType(contracts.stream().collect(java.util.stream.Collectors.groupingBy(
                        contract -> contract.getMurabahahType().name(),
                        java.util.stream.Collectors.counting())))
                .byStatus(contracts.stream().collect(java.util.stream.Collectors.groupingBy(
                        contract -> contract.getStatus().name(),
                        java.util.stream.Collectors.counting())))
                .build();
    }

    @Transactional(readOnly = true)
    public List<MurabahaContract> getContractsMaturingBetween(LocalDate from, LocalDate to) {
        return contractRepository.findByMaturityDateBetween(from, to);
    }

    @Transactional(readOnly = true)
    public List<MurabahaContract> getDefaultedContracts() {
        return contractRepository.findByStatus(MurabahaDomainEnums.ContractStatus.DEFAULTED);
    }

    public void recogniseProfitForPeriod(Long contractId, LocalDate fromDate, LocalDate toDate) {
        profitRecognitionService.recogniseProfitForPeriod(contractId, fromDate, toDate);
    }

    public void recogniseImpairment(Long contractId, BigDecimal impairmentAmount, String reason) {
        profitRecognitionService.recogniseImpairment(contractId, impairmentAmount, reason);
    }

    public void reverseImpairment(Long contractId, BigDecimal reversalAmount, String reason) {
        profitRecognitionService.reverseImpairment(contractId, reversalAmount, reason);
    }

    private MurabahaContract findContract(Long contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("MurabahaContract", "id", contractId));
    }

    private void validateSellingPriceArithmetic(MurabahaContract contract) {
        if (contract.getCostPrice() == null || contract.getMarkupRate() == null) {
            throw new BusinessException("Murabaha cost price and markup rate must be set before execution",
                    "MISSING_MURABAHA_PRICING");
        }
        BigDecimal expectedMarkup = MurabahaSupport.calculateMarkupAmount(contract.getCostPrice(), contract.getMarkupRate());
        BigDecimal expectedSellingPrice = MurabahaSupport.money(contract.getCostPrice().add(expectedMarkup));
        if (expectedSellingPrice.compareTo(MurabahaSupport.money(contract.getSellingPrice())) != 0) {
            throw new BusinessException("Murabaha selling price must equal cost plus disclosed markup",
                    "SHARIAH-MRB-001");
        }
    }

    private Long openFinancingAccount(MurabahaContract contract) {
        Customer customer = customerRepository.findById(contract.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", contract.getCustomerId()));
        IslamicProductTemplate productTemplate = islamicProductTemplateRepository.findById(contract.getIslamicProductTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductTemplate", "id", contract.getIslamicProductTemplateId()));
        productRepository.findByCode(productTemplate.getProductCode())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "code", productTemplate.getProductCode()));

        var accountResponse = accountService.openAccount(OpenAccountRequest.builder()
                .customerId(customer.getId())
                .productCode(productTemplate.getProductCode())
                .accountType(customer.isCorporate() ? AccountType.CORPORATE : AccountType.INDIVIDUAL)
                .accountName("Murabaha Financing - " + customer.getDisplayName())
                .currencyCode(contract.getCurrencyCode())
                .initialDeposit(BigDecimal.ZERO)
                .branchCode(StringUtils.hasText(customer.getBranchCode()) ? customer.getBranchCode() : "HQ")
                .statementFrequency("MONTHLY")
                .build());
        return accountResponse.getId();
    }
}
