package com.cbs.murabaha.service;

import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.murabaha.dto.ComplianceValidationResult;
import com.cbs.murabaha.dto.ExecuteCustomerSaleRequest;
import com.cbs.murabaha.dto.ExecutePurchaseRequest;
import com.cbs.murabaha.dto.OwnershipEvidenceRequest;
import com.cbs.murabaha.dto.PurchaseConfirmationRequest;
import com.cbs.murabaha.entity.CommodityMurabahaTrade;
import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.murabaha.repository.CommodityMurabahaTradeRepository;
import com.cbs.murabaha.repository.MurabahaContractRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.beans.factory.annotation.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CommodityMurabahaService {

    private static final AtomicLong TRADE_SEQUENCE = new AtomicLong(System.currentTimeMillis() % 100000);

    private final CommodityMurabahaTradeRepository tradeRepository;
    private final MurabahaContractRepository contractRepository;
    private final IslamicPostingRuleService postingRuleService;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;

    @Value("${murabaha.commodity.strict-same-day-buy-sell:true}")
    private boolean strictSameDayBuySell;

    public CommodityMurabahaTrade initiateTrade(Long contractId) {
        MurabahaContract contract = getCommodityContract(contractId);
        tradeRepository.findByContractId(contractId).ifPresent(existing -> {
            throw new BusinessException("Commodity Murabaha trade already exists for this contract",
                    "TRADE_ALREADY_EXISTS");
        });

        if (contract.getCommodityType() == null || contract.getCommodityType().isBlank()) {
            throw new BusinessException("Commodity type must be specified on the contract", "COMMODITY_TYPE_MISSING");
        }
        if (contract.getCommodityQuantity() == null || contract.getCommodityQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Commodity quantity must be specified and positive on the contract", "COMMODITY_QUANTITY_MISSING");
        }

        CommodityMurabahaTrade trade = CommodityMurabahaTrade.builder()
                .contractId(contractId)
                .tradeRef(MurabahaSupport.nextReference("CMT", TRADE_SEQUENCE))
                .commodityType(contract.getCommodityType())
                .commodityGrade("STANDARD")
                .quantity(contract.getCommodityQuantity())
                .unit(contract.getCommodityUnit() != null ? contract.getCommodityUnit() : "UNIT")
                .marketReference("LME")
                .purchaseStatus(MurabahaDomainEnums.CommodityPurchaseStatus.PENDING)
                .saleToCustStatus(MurabahaDomainEnums.CommoditySaleStatus.PENDING)
                .customerSaleStatus(MurabahaDomainEnums.CommoditySaleStatus.PENDING)
                .overallStatus(MurabahaDomainEnums.CommodityTradeStatus.INITIATED)
                .ownershipRiskBornByBank(false)
                .purchaseAndSaleBrokersDifferent(false)
                .ownershipTransferSequenceValid(false)
                .minimumOwnershipPeriodMet(false)
                .shariahComplianceVerified(false)
                .tenantId(contract.getTenantId())
                .build();
        contract.setStatus(MurabahaDomainEnums.ContractStatus.PENDING_OWNERSHIP);
        contractRepository.save(contract);
        return tradeRepository.save(trade);
    }

    public CommodityMurabahaTrade executePurchase(Long tradeId, ExecutePurchaseRequest request) {
        CommodityMurabahaTrade trade = getTrade(tradeId);
        if (trade.getOverallStatus() != MurabahaDomainEnums.CommodityTradeStatus.INITIATED) {
            throw new BusinessException("Purchase can only be executed on INITIATED trades. Current: " + trade.getOverallStatus(), "INVALID_TRADE_STATE");
        }
        MurabahaContract contract = getCommodityContract(trade.getContractId());

        if (request.getQuantity() == null || request.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Commodity quantity must be positive", "INVALID_COMMODITY_QUANTITY");
        }

        trade.setPurchaseBrokerName(request.getPurchaseBrokerName());
        trade.setPurchaseBrokerId(request.getPurchaseBrokerId());
        trade.setPurchaseOrderRef(request.getPurchaseOrderRef());
        trade.setPurchaseDate(request.getPurchaseDate());
        trade.setPurchasePrice(MurabahaSupport.money(request.getPurchasePrice()));
        trade.setPurchasePricePerUnit(MurabahaSupport.money(
                request.getPurchasePrice().divide(request.getQuantity(), 8, java.math.RoundingMode.HALF_UP)));
        trade.setPurchaseCurrency(request.getPurchaseCurrency() != null ? request.getPurchaseCurrency() : contract.getCurrencyCode());
        trade.setCommodityGrade(request.getCommodityGrade() != null ? request.getCommodityGrade() : trade.getCommodityGrade());
        trade.setMarketReference(request.getMarketReference() != null ? request.getMarketReference() : trade.getMarketReference());
        trade.setQuantity(request.getQuantity());
        trade.setUnit(request.getUnit());
        trade.setPurchaseStatus(MurabahaDomainEnums.CommodityPurchaseStatus.ORDERED);
        trade.setOverallStatus(MurabahaDomainEnums.CommodityTradeStatus.PURCHASE_IN_PROGRESS);

        var journal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("MURABAHA")
                .txnType(IslamicTransactionType.ASSET_ACQUISITION)
                .amount(trade.getPurchasePrice())
                .valueDate(request.getPurchaseDate())
                .reference(trade.getTradeRef() + "-PURCH")
                .additionalContext(Map.of("currencyCode", contract.getCurrencyCode()))
                .build());
        trade.setPurchaseJournalRef(journal.getJournalNumber());
        return tradeRepository.save(trade);
    }

    public CommodityMurabahaTrade confirmPurchase(Long tradeId, PurchaseConfirmationRequest confirmation) {
        CommodityMurabahaTrade trade = getTrade(tradeId);
        if (trade.getOverallStatus() != MurabahaDomainEnums.CommodityTradeStatus.PURCHASE_IN_PROGRESS) {
            throw new BusinessException("Purchase confirmation requires trade in PURCHASE_IN_PROGRESS status. Current: "
                    + trade.getOverallStatus(), "INVALID_TRADE_STATE");
        }
        trade.setPurchaseConfirmationRef(confirmation.getConfirmationRef());
        trade.setPurchaseConfirmationDate(confirmation.getConfirmationDate());
        trade.setPurchaseSettlementDate(confirmation.getSettlementDate());
        trade.setPurchaseStatus(MurabahaDomainEnums.CommodityPurchaseStatus.CONFIRMED);
        trade.setOverallStatus(MurabahaDomainEnums.CommodityTradeStatus.PURCHASE_IN_PROGRESS);
        return tradeRepository.save(trade);
    }

    public CommodityMurabahaTrade recordOwnership(Long tradeId, OwnershipEvidenceRequest evidence) {
        CommodityMurabahaTrade trade = getTrade(tradeId);
        if (trade.getPurchaseStatus() != MurabahaDomainEnums.CommodityPurchaseStatus.CONFIRMED
                && trade.getPurchaseStatus() != MurabahaDomainEnums.CommodityPurchaseStatus.SETTLED) {
            throw new BusinessException("Purchase must be confirmed before recording ownership", "PURCHASE_NOT_CONFIRMED");
        }
        if (trade.getPurchaseDate() == null) {
            throw new BusinessException("Commodity purchase must be recorded before ownership evidence",
                    "PURCHASE_NOT_RECORDED");
        }
        if (evidence.getOwnershipDate().isBefore(trade.getPurchaseDate())) {
            throw new BusinessException("Ownership date must be after purchase date",
                    "INVALID_OWNERSHIP_SEQUENCE");
        }
        if (trade.getSaleToCustDate() != null && !evidence.getOwnershipDate().isBefore(trade.getSaleToCustDate())) {
            throw new BusinessException("Bank ownership must be recorded before sale to customer",
                    "INVALID_OWNERSHIP_SEQUENCE");
        }

        long ownershipDays = Math.max(0, ChronoUnit.DAYS.between(trade.getPurchaseDate(), evidence.getOwnershipDate()));
        trade.setBankOwnershipEvidenceType(evidence.getEvidenceType());
        trade.setBankOwnershipEvidenceRef(evidence.getEvidenceRef());
        trade.setBankOwnershipDate(evidence.getOwnershipDate());
        trade.setBankOwnershipDuration(ownershipDays + " day(s)");
        trade.setOwnershipRiskBornByBank(Boolean.TRUE);
        trade.setOwnershipTransferSequenceValid(Boolean.TRUE);
        trade.setMinimumOwnershipPeriodMet(ownershipDays >= 1);
        trade.setOverallStatus(MurabahaDomainEnums.CommodityTradeStatus.BANK_OWNS_COMMODITY);
        if (trade.getPurchaseDate() != null && trade.getBankOwnershipDate() != null
                && trade.getBankOwnershipDate().equals(trade.getPurchaseDate())) {
            if (strictSameDayBuySell) {
                throw new BusinessException("Same-day buy-sell is not permitted under strict Shariah interpretation. "
                        + "Minimum holding period of 1 day required.", "SHARIAH_SAME_DAY_BUY_SELL");
            }
            log.warn("SHARIAH_WARNING: Commodity ownership recorded same day as purchase for trade {}. Minimum holding period not met.", trade.getTradeRef());
        }
        return tradeRepository.save(trade);
    }

    public CommodityMurabahaTrade verifyOwnership(Long tradeId, String verifiedBy) {
        CommodityMurabahaTrade trade = getTrade(tradeId);
        if (trade.getBankOwnershipEvidenceType() == null || trade.getBankOwnershipDate() == null) {
            throw new BusinessException("Ownership evidence must be recorded before verification",
                    "OWNERSHIP_EVIDENCE_MISSING");
        }

        trade.setOwnershipVerifiedBy(verifiedBy);
        trade.setOwnershipVerifiedAt(Instant.now());
        trade.setComplianceVerifiedBy(verifiedBy);
        trade.setComplianceVerifiedAt(Instant.now());
        trade.setShariahComplianceVerified(Boolean.TRUE.equals(trade.getOwnershipTransferSequenceValid())
                && Boolean.TRUE.equals(trade.getOwnershipRiskBornByBank()));
        trade.setOverallStatus(MurabahaDomainEnums.CommodityTradeStatus.BANK_OWNS_COMMODITY);
        tradeRepository.save(trade);

        MurabahaContract contract = getCommodityContract(trade.getContractId());
        contract.setOwnershipVerified(Boolean.TRUE);
        contract.setOwnershipVerifiedBy(verifiedBy);
        contract.setOwnershipVerifiedAt(Instant.now());
        contract.setStatus(MurabahaDomainEnums.ContractStatus.OWNERSHIP_VERIFIED);
        contract.appendOwnershipEvent(Map.of(
                "event", "BANK_OWNERSHIP_VERIFIED",
                "verifiedBy", verifiedBy,
                "timestamp", Instant.now().toString()));
        contractRepository.save(contract);
        return trade;
    }

    public CommodityMurabahaTrade executeMurabahaSale(Long tradeId, LocalDate saleDate) {
        CommodityMurabahaTrade trade = getTrade(tradeId);
        MurabahaContract contract = getCommodityContract(trade.getContractId());
        if (trade.getOverallStatus() != MurabahaDomainEnums.CommodityTradeStatus.BANK_OWNS_COMMODITY) {
            throw new BusinessException("Bank must own commodity before Murabaha sale. Current status: " + trade.getOverallStatus(), "OWNERSHIP_NOT_ESTABLISHED");
        }
        if (!Boolean.TRUE.equals(trade.getShariahComplianceVerified())) {
            throw new BusinessException("Shariah compliance must be verified before Murabaha sale", "COMPLIANCE_NOT_VERIFIED");
        }
        if (!Boolean.TRUE.equals(contract.getOwnershipVerified())) {
            throw new BusinessException("Bank must own commodity before selling it to the customer",
                    "OWNERSHIP_NOT_VERIFIED");
        }
        trade.setSaleToCustDate(saleDate);
        trade.setSaleToCustPrice(contract.getSellingPrice());
        trade.setSaleToCustStatus(MurabahaDomainEnums.CommoditySaleStatus.COMPLETED);
        trade.setSaleToCustConfirmationRef(contract.getContractRef() + "-SALE");
        trade.setOwnershipTransferSequenceValid(Boolean.TRUE);
        trade.setOverallStatus(MurabahaDomainEnums.CommodityTradeStatus.MURABAHA_SALE_EXECUTED);

        // Post receivable establishment GL entry
        postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("MURABAHA")
                .txnType(IslamicTransactionType.FINANCING_DISBURSEMENT)
                .accountId(contract.getAccountId())
                .amount(contract.getSellingPrice())
                .principal(MurabahaSupport.money(contract.getCostPrice().subtract(MurabahaSupport.money(contract.getDownPayment()))))
                .markup(contract.getMarkupAmount())
                .valueDate(saleDate)
                .reference(trade.getTradeRef() + "-SALE")
                .additionalContext(Map.of("currencyCode", contract.getCurrencyCode()))
                .build());

        tradeRepository.save(trade);

        contract.setSellingPriceLocked(Boolean.TRUE);
        contract.setSellingPriceLockedAt(Instant.now());
        contract.setStatus(MurabahaDomainEnums.ContractStatus.PENDING_EXECUTION);
        contract.appendOwnershipEvent(Map.of(
                "event", "BANK_SOLD_TO_CUSTOMER",
                "saleDate", saleDate.toString(),
                "timestamp", Instant.now().toString()));
        contractRepository.save(contract);
        return trade;
    }

    public CommodityMurabahaTrade executeCustomerSale(Long tradeId, ExecuteCustomerSaleRequest request) {
        CommodityMurabahaTrade trade = getTrade(tradeId);
        if (trade.getOverallStatus() != MurabahaDomainEnums.CommodityTradeStatus.MURABAHA_SALE_EXECUTED) {
            throw new BusinessException("Murabaha sale must be executed before customer can sell commodity", "MURABAHA_SALE_NOT_EXECUTED");
        }
        if (trade.getPurchaseBrokerId() != null && request.getCustomerSaleBrokerId() != null
                && trade.getPurchaseBrokerId().equals(request.getCustomerSaleBrokerId())) {
            throw new BusinessException("Purchase and sale brokers must be different entities for Shariah compliance",
                    "BROKER_CONFLICT");
        }
        if (trade.getPurchaseBrokerName() != null
                && trade.getPurchaseBrokerName().equalsIgnoreCase(request.getCustomerSaleBrokerName())) {
            throw new BusinessException("Purchase and sale brokers must be different entities for Shariah compliance",
                    "BROKER_CONFLICT");
        }

        var creditedAccount = accountRepository.findByIdWithProduct(request.getCreditedAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", request.getCreditedAccountId()));
        var txn = accountPostingService.postCreditAgainstGl(
                creditedAccount,
                TransactionType.CREDIT,
                MurabahaSupport.money(request.getCustomerSalePrice()),
                "Commodity Murabaha customer sale proceeds",
                TransactionChannel.SYSTEM,
                trade.getTradeRef() + "-CUSTSALE",
                "1800-CMT-002",
                "MURABAHA",
                trade.getTradeRef());

        trade.setCustomerSaleBrokerName(request.getCustomerSaleBrokerName());
        trade.setCustomerSaleBrokerId(request.getCustomerSaleBrokerId());
        trade.setCustomerSaleOrderRef(request.getCustomerSaleOrderRef());
        trade.setCustomerSaleDate(request.getCustomerSaleDate());
        trade.setCustomerSalePrice(MurabahaSupport.money(request.getCustomerSalePrice()));
        trade.setCustomerSalePricePerUnit(MurabahaSupport.money(request.getCustomerSalePricePerUnit()));
        trade.setCustomerSaleConfirmationRef(request.getCustomerSaleConfirmationRef());
        trade.setCustomerSaleSettlementDate(request.getSettlementDate());
        trade.setCustomerSaleJournalRef(txn.getJournal() != null ? txn.getJournal().getJournalNumber() : null);
        trade.setCustomerSaleProceedsCreditedTo(request.getCreditedAccountId());
        trade.setCustomerSaleStatus(MurabahaDomainEnums.CommoditySaleStatus.SETTLED);
        trade.setPurchaseAndSaleBrokersDifferent(Boolean.TRUE);
        trade.setShariahComplianceVerified(Boolean.TRUE.equals(trade.getOwnershipTransferSequenceValid())
                && Boolean.TRUE.equals(trade.getOwnershipRiskBornByBank())
                && Boolean.TRUE.equals(trade.getPurchaseAndSaleBrokersDifferent()));
        trade.setOverallStatus(MurabahaDomainEnums.CommodityTradeStatus.COMPLETED);
        return tradeRepository.save(trade);
    }

    @Transactional(readOnly = true)
    public ComplianceValidationResult validateTradeCompliance(Long tradeId) {
        CommodityMurabahaTrade trade = getTrade(tradeId);
        boolean hasEvidence = trade.getBankOwnershipEvidenceType() != null && trade.getBankOwnershipEvidenceRef() != null;
        boolean bankOwnedBeforeSale = trade.getBankOwnershipDate() != null
                && (trade.getSaleToCustDate() == null || trade.getBankOwnershipDate().isBefore(trade.getSaleToCustDate()));
        boolean brokersDifferent = Boolean.TRUE.equals(trade.getPurchaseAndSaleBrokersDifferent())
                || (trade.getPurchaseBrokerName() != null
                && trade.getCustomerSaleBrokerName() != null
                && !trade.getPurchaseBrokerName().equalsIgnoreCase(trade.getCustomerSaleBrokerName()));
        boolean riskBorne = Boolean.TRUE.equals(trade.getOwnershipRiskBornByBank());
        boolean minimumOwnership = Boolean.TRUE.equals(trade.getMinimumOwnershipPeriodMet());

        Map<String, Boolean> flags = Map.of(
                "purchaseBeforeSale", bankOwnedBeforeSale,
                "ownershipEvidenceDocumented", hasEvidence,
                "brokersDifferent", brokersDifferent,
                "bankBoreRisk", riskBorne,
                "minimumOwnershipPeriodMet", minimumOwnership);

        List<String> issues = flags.entrySet().stream()
                .filter(entry -> !Boolean.TRUE.equals(entry.getValue()))
                .map(Map.Entry::getKey)
                .toList();

        return ComplianceValidationResult.builder()
                .compliant(issues.isEmpty())
                .status(issues.isEmpty() ? "COMPLIANT" : "NON_COMPLIANT")
                .flags(flags)
                .issues(issues)
                .build();
    }

    @Transactional(readOnly = true)
    public CommodityMurabahaTrade getTrade(Long tradeId) {
        return tradeRepository.findById(tradeId)
                .orElseThrow(() -> new ResourceNotFoundException("CommodityMurabahaTrade", "id", tradeId));
    }

    @Transactional(readOnly = true)
    public CommodityMurabahaTrade getTradeByContract(Long contractId) {
        return tradeRepository.findByContractId(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("CommodityMurabahaTrade", "contractId", contractId));
    }

    @Transactional(readOnly = true)
    public List<CommodityMurabahaTrade> getTradesByStatus(MurabahaDomainEnums.CommodityTradeStatus status) {
        return tradeRepository.findByOverallStatus(status);
    }

    @Transactional(readOnly = true)
    public List<CommodityMurabahaTrade> getPendingOwnershipVerification() {
        return tradeRepository.findByOwnershipVerifiedAtIsNullAndOverallStatus(
                MurabahaDomainEnums.CommodityTradeStatus.BANK_OWNS_COMMODITY);
    }

    private MurabahaContract getCommodityContract(Long contractId) {
        MurabahaContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("MurabahaContract", "id", contractId));
        if (contract.getMurabahahType() != MurabahaDomainEnums.MurabahahType.COMMODITY_MURABAHA) {
            throw new BusinessException("Contract is not configured for Commodity Murabaha",
                    "INVALID_MURABAHA_TYPE");
        }
        return contract;
    }
}
