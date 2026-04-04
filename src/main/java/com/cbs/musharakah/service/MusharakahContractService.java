package com.cbs.musharakah.service;

import com.cbs.account.dto.OpenAccountRequest;
import com.cbs.account.entity.AccountType;
import com.cbs.account.repository.ProductRepository;
import com.cbs.account.service.AccountService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.musharakah.dto.MusharakahRequests;
import com.cbs.musharakah.dto.MusharakahResponses;
import com.cbs.musharakah.entity.MusharakahContract;
import com.cbs.musharakah.entity.MusharakahDomainEnums;
import com.cbs.musharakah.repository.MusharakahContractRepository;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.profitdistribution.dto.AssignAssetToPoolRequest;
import com.cbs.profitdistribution.service.PoolAssetManagementService;
import com.cbs.shariahcompliance.dto.ShariahScreeningRequest;
import com.cbs.shariahcompliance.service.ShariahScreeningService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MusharakahContractService {

    private final MusharakahContractRepository contractRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final IslamicProductTemplateRepository islamicProductTemplateRepository;
    private final AccountService accountService;
    private final MusharakahUnitService unitService;
    private final MusharakahRentalService rentalService;
    private final MusharakahBuyoutService buyoutService;
    private final IslamicPostingRuleService postingRuleService;
    private final PoolAssetManagementService poolAssetManagementService;
    private final ShariahScreeningService shariahScreeningService;

    @Transactional(readOnly = true)
    public MusharakahResponses.MusharakahContractResponse getContract(Long contractId) {
        return MusharakahSupport.toContractResponse(findContract(contractId));
    }

    @Transactional(readOnly = true)
    public MusharakahResponses.MusharakahContractResponse getContractByRef(String ref) {
        return MusharakahSupport.toContractResponse(contractRepository.findByContractRef(ref)
                .orElseThrow(() -> new ResourceNotFoundException("MusharakahContract", "contractRef", ref)));
    }

    @Transactional(readOnly = true)
    public List<MusharakahResponses.MusharakahContractResponse> getCustomerContracts(Long customerId) {
        customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));
        return contractRepository.findByCustomerId(customerId).stream()
                .map(MusharakahSupport::toContractResponse)
                .toList();
    }

    public MusharakahResponses.MusharakahContractResponse initiateAssetProcurement(Long contractId) {
        MusharakahContract contract = findContract(contractId);
        postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("MUSHARAKAH")
                .txnType(IslamicTransactionType.FINANCING_DISBURSEMENT)
                .accountId(contract.getAccountId())
                .amount(MusharakahSupport.money(contract.getBankCapitalContribution()))
                .reference(contract.getContractRef() + "-CONT")
                .narration("Musharakah bank capital contribution")
                .build());
        contract.setStatus(MusharakahDomainEnums.ContractStatus.ASSET_PROCUREMENT);
        return MusharakahSupport.toContractResponse(contractRepository.save(contract));
    }

    public MusharakahResponses.MusharakahContractResponse registerJointOwnership(Long contractId,
                                                                                 MusharakahRequests.JointOwnershipDetails details) {
        MusharakahContract contract = findContract(contractId);
        if (details.getBankOwnershipPercentage().add(details.getCustomerOwnershipPercentage())
                .compareTo(new BigDecimal("100.0000")) != 0) {
            throw new BusinessException("Joint ownership percentages must sum to 100.00", "INVALID_OWNERSHIP_RATIO");
        }
        if (details.getBankOwnershipPercentage().compareTo(contract.getBankOwnershipPercentage()) != 0
                || details.getCustomerOwnershipPercentage().compareTo(contract.getCustomerOwnershipPercentage()) != 0) {
            throw new BusinessException("Registered ownership percentages must match Musharakah capital contributions", "OWNERSHIP_CAPITAL_MISMATCH");
        }
        contract.setAssetTitleDeedRef(details.getTitleDeedRef());
        contract.setStatus(MusharakahDomainEnums.ContractStatus.JOINT_OWNERSHIP_REGISTERED);
        return MusharakahSupport.toContractResponse(contractRepository.save(contract));
    }

    public MusharakahResponses.MusharakahContractResponse executeContract(Long contractId, String executedBy) {
        MusharakahContract contract = findContract(contractId);
        if (contract.getStatus() != MusharakahDomainEnums.ContractStatus.JOINT_OWNERSHIP_REGISTERED) {
            throw new BusinessException("Joint ownership must be registered before Musharakah execution", "JOINT_OWNERSHIP_REQUIRED");
        }
        IslamicProductTemplate product = islamicProductTemplateRepository.findById(contract.getIslamicProductTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("IslamicProductTemplate", "id", contract.getIslamicProductTemplateId()));
        if (Boolean.TRUE.equals(product.getFatwaRequired()) && product.getActiveFatwaId() == null) {
            throw new BusinessException("Musharakah product requires an active fatwa before execution", "PRODUCT_FATWA_REQUIRED");
        }

        var screening = shariahScreeningService.screenPreExecution(ShariahScreeningRequest.builder()
                .transactionRef(contract.getContractRef() + "-EXEC")
                .transactionType("MUSHARAKAH_EXECUTION")
                .amount(contract.getBankCapitalContribution())
                .currencyCode(contract.getCurrencyCode())
                .contractRef(contract.getContractRef())
                .contractTypeCode("MUSHARAKAH")
                .customerId(contract.getCustomerId())
                .additionalContext(new LinkedHashMap<>() {{
                    put("jointOwnershipRegistered", StringUtils.hasText(contract.getAssetTitleDeedRef()));
                    put("lossSharingMethod", contract.getLossSharingMethod().name());
                    put("bankOwnershipPercentage", contract.getBankOwnershipPercentage());
                    put("customerOwnershipPercentage", contract.getCustomerOwnershipPercentage());
                    put("rentalOnlyOnBankShare", true);
                }})
                .build());
        shariahScreeningService.ensureAllowed(screening);

        if (contract.getAccountId() == null) {
            contract.setAccountId(openFinancingAccount(contract));
        }
        unitService.initialiseUnits(contractId);
        if (buyoutService.getSchedule(contractId).isEmpty()) {
            buyoutService.generateBuyoutSchedule(contractId);
        }
        if (rentalService.getSchedule(contractId).isEmpty()) {
            rentalService.generateRentalSchedule(contractId);
        }
        if (contract.getInvestmentPoolId() != null && contract.getPoolAssetAssignmentId() == null) {
            var assignment = poolAssetManagementService.assignAssetToPool(
                    contract.getInvestmentPoolId(),
                    AssignAssetToPoolRequest.builder()
                            .poolId(contract.getInvestmentPoolId())
                            .assetType("MUSHARAKAH_INVESTMENT")
                            .assetReferenceId(contract.getId())
                            .assetReferenceCode(contract.getContractRef())
                            .assetDescription(contract.getAssetDescription())
                            .assignedAmount(contract.getBankCapitalContribution())
                            .currentOutstanding(contract.getBankCapitalContribution())
                            .currencyCode(contract.getCurrencyCode())
                            .contractTypeCode("MUSHARAKAH")
                            .maturityDate(contract.getMaturityDate())
                            .build());
            contract.setPoolAssetAssignmentId(assignment.getId());
        }

        contract.setExecutedAt(Instant.now());
        contract.setExecutedBy(executedBy);
        contract.setStatus(MusharakahDomainEnums.ContractStatus.ACTIVE);
        contract.setLastScreeningRef(screening.getScreeningRef());
        return MusharakahSupport.toContractResponse(contractRepository.save(contract));
    }

    @Transactional(readOnly = true)
    public MusharakahResponses.OwnershipState getCurrentOwnership(Long contractId) {
        return unitService.getCurrentOwnership(contractId);
    }

    @Transactional(readOnly = true)
    public MusharakahResponses.EarlyBuyoutQuote calculateEarlyBuyout(Long contractId, LocalDate buyoutDate) {
        MusharakahContract contract = findContract(contractId);
        MusharakahResponses.OwnershipState ownership = unitService.getCurrentOwnership(contractId);
        BigDecimal pricePerUnit = switch (contract.getEarlyBuyoutPricingMethod()) {
            case REMAINING_AT_FAIR_VALUE -> ownership.getCurrentUnitValue();
            case NEGOTIATED -> ownership.getCurrentUnitValue();
            case REMAINING_UNITS_AT_FIXED -> contract.getUnitValue();
        };
        BigDecimal buyoutAmount = MusharakahSupport.money(ownership.getBankUnits().multiply(pricePerUnit));
        BigDecimal rentalArrears = rentalService.getRentalSummary(contractId).getTotalOutstanding();
        return MusharakahResponses.EarlyBuyoutQuote.builder()
                .contractId(contractId)
                .quoteDate(buyoutDate)
                .remainingBankUnits(ownership.getBankUnits())
                .pricePerUnit(pricePerUnit)
                .buyoutAmount(buyoutAmount)
                .rentalArrears(rentalArrears)
                .totalAmount(MusharakahSupport.money(buyoutAmount.add(rentalArrears)))
                .pricingMethod(contract.getEarlyBuyoutPricingMethod().name())
                .build();
    }

    public MusharakahResponses.MusharakahContractResponse processEarlyBuyout(Long contractId, BigDecimal buyoutAmount) {
        MusharakahResponses.EarlyBuyoutQuote quote = calculateEarlyBuyout(contractId, LocalDate.now());
        if (MusharakahSupport.money(buyoutAmount).compareTo(quote.getTotalAmount()) < 0) {
            throw new BusinessException("Early buyout amount is below the quoted settlement amount", "INSUFFICIENT_EARLY_BUYOUT");
        }
        MusharakahContract contract = findContract(contractId);
        unitService.transferUnits(contractId, quote.getRemainingBankUnits(), LocalDate.now(), quote.getBuyoutAmount(), "EARLY-BUYOUT");
        contract.setEarlyBuyoutDate(LocalDate.now());
        contract.setEarlyBuyoutAmount(quote.getTotalAmount());
        contract.setStatus(MusharakahDomainEnums.ContractStatus.FULLY_BOUGHT_OUT);
        contract.setFullyBoughtOutAt(LocalDate.now());
        contractRepository.save(contract);
        dissolvePartnership(contractId, "EARLY_BUYOUT");
        return MusharakahSupport.toContractResponse(findContract(contractId));
    }

    public MusharakahResponses.MusharakahContractResponse processFullBuyout(Long contractId) {
        MusharakahContract contract = findContract(contractId);
        if (!unitService.isFullyBoughtOut(contractId)) {
            throw new BusinessException("Musharakah still has remaining bank units", "BANK_UNITS_REMAIN");
        }
        contract.setStatus(MusharakahDomainEnums.ContractStatus.FULLY_BOUGHT_OUT);
        contract.setFullyBoughtOutAt(LocalDate.now());
        contractRepository.save(contract);
        dissolvePartnership(contractId, "SCHEDULED_FULL_BUYOUT");
        return MusharakahSupport.toContractResponse(findContract(contractId));
    }

    public void dissolvePartnership(Long contractId, String reason) {
        MusharakahContract contract = findContract(contractId);
        contract.setDissolvedAt(LocalDate.now());
        contract.setStatus(MusharakahDomainEnums.ContractStatus.CLOSED);
        contractRepository.save(contract);
        if (contract.getPoolAssetAssignmentId() != null) {
            poolAssetManagementService.unassignAssetFromPool(contract.getPoolAssetAssignmentId(), reason);
        }
    }

    public MusharakahResponses.MusharakahContractResponse reviewRental(Long contractId,
                                                                       MusharakahRequests.RentalReviewRequest request) {
        rentalService.applyRentalReview(contractId, request.getNewRate(), request.getEffectiveDate());
        return MusharakahSupport.toContractResponse(findContract(contractId));
    }

    @Transactional(readOnly = true)
    public MusharakahResponses.MusharakahPortfolioSummary getPortfolioSummary() {
        List<MusharakahContract> contracts = contractRepository.findAll();
        return MusharakahResponses.MusharakahPortfolioSummary.builder()
                .totalContracts(contracts.size())
                .totalBankCapital(contracts.stream().map(MusharakahContract::getBankCapitalContribution).map(MusharakahSupport::money).reduce(MusharakahSupport.ZERO, BigDecimal::add))
                .totalRentalExpected(contracts.stream().map(MusharakahContract::getTotalRentalExpected).map(MusharakahSupport::money).reduce(MusharakahSupport.ZERO, BigDecimal::add))
                .totalRentalReceived(contracts.stream().map(MusharakahContract::getTotalRentalReceived).map(MusharakahSupport::money).reduce(MusharakahSupport.ZERO, BigDecimal::add))
                .totalBuyoutExpected(contracts.stream().map(MusharakahContract::getTotalBuyoutPaymentsExpected).map(MusharakahSupport::money).reduce(MusharakahSupport.ZERO, BigDecimal::add))
                .totalBuyoutReceived(contracts.stream().map(MusharakahContract::getTotalBuyoutPaymentsReceived).map(MusharakahSupport::money).reduce(MusharakahSupport.ZERO, BigDecimal::add))
                .byType(contracts.stream().collect(java.util.stream.Collectors.groupingBy(c -> c.getMusharakahType().name(), java.util.stream.Collectors.counting())))
                .byStatus(contracts.stream().collect(java.util.stream.Collectors.groupingBy(c -> c.getStatus().name(), java.util.stream.Collectors.counting())))
                .build();
    }

    @Transactional(readOnly = true)
    public List<MusharakahContract> getContractsMaturing(LocalDate from, LocalDate to) {
        return contractRepository.findByMaturityDateBetween(from, to);
    }

    @Transactional(readOnly = true)
    public List<MusharakahContract> getContractsInArrears() {
        List<MusharakahContract> contracts = contractRepository.findByStatus(MusharakahDomainEnums.ContractStatus.RENTAL_ARREARS);
        contracts.addAll(contractRepository.findByStatus(MusharakahDomainEnums.ContractStatus.BUYOUT_ARREARS));
        return contracts;
    }

    private MusharakahContract findContract(Long contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("MusharakahContract", "id", contractId));
    }

    private Long openFinancingAccount(MusharakahContract contract) {
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
                .accountName("Musharakah Financing - " + customer.getDisplayName())
                .currencyCode(contract.getCurrencyCode())
                .initialDeposit(BigDecimal.ZERO)
                .branchCode(StringUtils.hasText(customer.getBranchCode()) ? customer.getBranchCode() : "HQ")
                .statementFrequency("MONTHLY")
                .build());
        return accountResponse.getId();
    }
}
