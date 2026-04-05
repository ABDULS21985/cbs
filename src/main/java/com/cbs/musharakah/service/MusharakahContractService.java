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
import com.cbs.musharakah.entity.MusharakahBuyoutInstallment;
import com.cbs.musharakah.entity.MusharakahRentalInstallment;
import com.cbs.musharakah.repository.MusharakahBuyoutInstallmentRepository;
import com.cbs.musharakah.repository.MusharakahContractRepository;
import com.cbs.musharakah.repository.MusharakahRentalInstallmentRepository;
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

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class MusharakahContractService {

    private final MusharakahContractRepository contractRepository;
    private final MusharakahRentalInstallmentRepository rentalInstallmentRepository;
    private final MusharakahBuyoutInstallmentRepository buyoutInstallmentRepository;
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
        if (contract.getStatus() != MusharakahDomainEnums.ContractStatus.DRAFT
                && contract.getStatus() != MusharakahDomainEnums.ContractStatus.PENDING_EXECUTION) {
            throw new BusinessException(
                    "Asset procurement can only be initiated for contracts in DRAFT or PENDING_EXECUTION status, current status: " + contract.getStatus(),
                    "INVALID_CONTRACT_STATUS");
        }
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
        if (contract.getStatus() != MusharakahDomainEnums.ContractStatus.ASSET_PROCUREMENT) {
            throw new BusinessException(
                    "Joint ownership can only be registered for contracts in ASSET_PROCUREMENT status, current status: " + contract.getStatus(),
                    "INVALID_CONTRACT_STATUS");
        }
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
        if (StringUtils.hasText(contract.getCreatedBy()) && contract.getCreatedBy().equalsIgnoreCase(executedBy)) {
            throw new BusinessException("Executor must be different from the contract creator (four-eyes principle)", "FOUR_EYES_REQUIRED");
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
        MusharakahContract contract = findContract(contractId);

        // Shariah screening before early buyout
        var screening = shariahScreeningService.screenPreExecution(ShariahScreeningRequest.builder()
                .transactionRef(contract.getContractRef() + "-EARLY-BUYOUT")
                .transactionType("MUSHARAKAH_EARLY_BUYOUT")
                .amount(MusharakahSupport.money(buyoutAmount))
                .currencyCode(contract.getCurrencyCode())
                .contractRef(contract.getContractRef())
                .contractTypeCode("MUSHARAKAH")
                .customerId(contract.getCustomerId())
                .additionalContext(new LinkedHashMap<>() {{
                    put("earlyBuyoutAllowed", contract.getEarlyBuyoutAllowed());
                    put("earlyBuyoutPricingMethod", contract.getEarlyBuyoutPricingMethod().name());
                }})
                .build());
        shariahScreeningService.ensureAllowed(screening);

        MusharakahResponses.EarlyBuyoutQuote quote = calculateEarlyBuyout(contractId, LocalDate.now());
        if (MusharakahSupport.money(buyoutAmount).compareTo(quote.getTotalAmount()) < 0) {
            throw new BusinessException("Early buyout amount is below the quoted settlement amount", "INSUFFICIENT_EARLY_BUYOUT");
        }
        unitService.transferUnits(contractId, quote.getRemainingBankUnits(), LocalDate.now(), quote.getBuyoutAmount(), "EARLY-BUYOUT");

        // Actually settle rental arrears through the rental payment service
        if (quote.getRentalArrears() != null && quote.getRentalArrears().compareTo(BigDecimal.ZERO) > 0) {
            rentalService.processRentalPayment(contractId, MusharakahRequests.ProcessRentalPaymentRequest.builder()
                    .paymentAmount(quote.getRentalArrears())
                    .paymentDate(LocalDate.now())
                    .externalRef(contract.getContractRef() + "-EARLY-BUYOUT-ARREARS")
                    .narration("Musharakah early buyout - rental arrears settlement")
                    .build());
        }

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

        // Cancel remaining rental installments
        List<MusharakahRentalInstallment> rentals = rentalInstallmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
        for (MusharakahRentalInstallment rental : rentals) {
            if (rental.getStatus() != MusharakahDomainEnums.InstallmentStatus.PAID
                    && rental.getStatus() != MusharakahDomainEnums.InstallmentStatus.WAIVED
                    && rental.getStatus() != MusharakahDomainEnums.InstallmentStatus.CANCELLED) {
                rental.setStatus(MusharakahDomainEnums.InstallmentStatus.CANCELLED);
            }
        }
        rentalInstallmentRepository.saveAll(rentals);

        // Cancel remaining buyout installments
        List<MusharakahBuyoutInstallment> buyouts = buyoutInstallmentRepository.findByContractIdOrderByInstallmentNumberAsc(contractId);
        for (MusharakahBuyoutInstallment buyout : buyouts) {
            if (buyout.getStatus() != MusharakahDomainEnums.InstallmentStatus.PAID
                    && buyout.getStatus() != MusharakahDomainEnums.InstallmentStatus.WAIVED
                    && buyout.getStatus() != MusharakahDomainEnums.InstallmentStatus.CANCELLED) {
                buyout.setStatus(MusharakahDomainEnums.InstallmentStatus.CANCELLED);
            }
        }
        buyoutInstallmentRepository.saveAll(buyouts);

        // Post final settlement GL entry
        postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("MUSHARAKAH")
                .txnType(IslamicTransactionType.EARLY_SETTLEMENT)
                .accountId(contract.getAccountId())
                .amount(MusharakahSupport.money(contract.getBankCapitalContribution()))
                .reference(contract.getContractRef() + "-DISSOLVE")
                .narration("Musharakah partnership dissolution - " + reason)
                .build());

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
        int totalContracts = 0;
        BigDecimal totalBankCapital = MusharakahSupport.ZERO;
        BigDecimal totalRentalExpected = MusharakahSupport.ZERO;
        BigDecimal totalRentalReceived = MusharakahSupport.ZERO;
        BigDecimal totalBuyoutExpected = MusharakahSupport.ZERO;
        BigDecimal totalBuyoutReceived = MusharakahSupport.ZERO;
        Map<String, Long> byType = new HashMap<>();
        Map<String, Long> byStatus = new HashMap<>();

        Pageable pageable = PageRequest.of(0, 500);
        Page<MusharakahContract> page;
        do {
            page = contractRepository.findAll(pageable);
            for (MusharakahContract contract : page.getContent()) {
                totalContracts++;
                totalBankCapital = totalBankCapital.add(MusharakahSupport.money(contract.getBankCapitalContribution()));
                totalRentalExpected = totalRentalExpected.add(MusharakahSupport.money(contract.getTotalRentalExpected()));
                totalRentalReceived = totalRentalReceived.add(MusharakahSupport.money(contract.getTotalRentalReceived()));
                totalBuyoutExpected = totalBuyoutExpected.add(MusharakahSupport.money(contract.getTotalBuyoutPaymentsExpected()));
                totalBuyoutReceived = totalBuyoutReceived.add(MusharakahSupport.money(contract.getTotalBuyoutPaymentsReceived()));
                byType.merge(contract.getMusharakahType().name(), 1L, Long::sum);
                byStatus.merge(contract.getStatus().name(), 1L, Long::sum);
            }
            pageable = page.nextPageable();
        } while (page.hasNext());

        return MusharakahResponses.MusharakahPortfolioSummary.builder()
                .totalContracts(totalContracts)
                .totalBankCapital(totalBankCapital)
                .totalRentalExpected(totalRentalExpected)
                .totalRentalReceived(totalRentalReceived)
                .totalBuyoutExpected(totalBuyoutExpected)
                .totalBuyoutReceived(totalBuyoutReceived)
                .byType(byType)
                .byStatus(byStatus)
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
