package com.cbs.murabaha.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.murabaha.dto.AssetDamageReportRequest;
import com.cbs.murabaha.dto.DeliveryDetailsRequest;
import com.cbs.murabaha.dto.InitiateAssetPurchaseRequest;
import com.cbs.murabaha.dto.OwnershipEvidenceRequest;
import com.cbs.murabaha.dto.PaymentDetailsRequest;
import com.cbs.murabaha.dto.PurchaseOrderDetailsRequest;
import com.cbs.murabaha.dto.TransferDetailsRequest;
import com.cbs.murabaha.entity.AssetMurabahaPurchase;
import com.cbs.murabaha.entity.MurabahaContract;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import com.cbs.murabaha.repository.AssetMurabahaPurchaseRepository;
import com.cbs.murabaha.repository.MurabahaContractRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AssetMurabahaService {

    private static final AtomicLong PURCHASE_SEQUENCE = new AtomicLong(System.nanoTime());

    private final AssetMurabahaPurchaseRepository purchaseRepository;
    private final MurabahaContractRepository contractRepository;
    private final IslamicPostingRuleService postingRuleService;

    public AssetMurabahaPurchase initiatePurchase(Long contractId, InitiateAssetPurchaseRequest request) {
        MurabahaContract contract = getAssetContract(contractId);
        purchaseRepository.findByContractId(contractId).ifPresent(existing -> {
            throw new BusinessException("Asset Murabaha purchase already exists for this contract",
                    "PURCHASE_ALREADY_EXISTS");
        });

        AssetMurabahaPurchase purchase = AssetMurabahaPurchase.builder()
                .contractId(contractId)
                .purchaseRef(MurabahaSupport.nextReference("AMP", PURCHASE_SEQUENCE))
                .assetCategory(request.getAssetCategory())
                .assetDescription(request.getAssetDescription())
                .assetSpecification(request.getAssetSpecification())
                .newOrUsed(request.getNewOrUsed())
                .supplierName(request.getSupplierName())
                .supplierRegistrationNumber(request.getSupplierRegistrationNumber())
                .supplierAddress(request.getSupplierAddress())
                .supplierContactPerson(request.getSupplierContactPerson())
                .supplierContactPhone(request.getSupplierContactPhone())
                .supplierBankAccount(request.getSupplierBankAccount())
                .supplierQuoteRef(request.getSupplierQuoteRef())
                .supplierQuoteDate(request.getSupplierQuoteDate())
                .supplierQuoteExpiry(request.getSupplierQuoteExpiry())
                .supplierQuoteAmount(MurabahaSupport.money(request.getSupplierQuoteAmount()))
                .purchaseStatus(MurabahaDomainEnums.AssetPurchaseStatus.QUOTE_RECEIVED)
                .overallStatus(MurabahaDomainEnums.AssetPurchaseOverallStatus.QUOTE_PHASE)
                .registeredInBankName(false)
                .insuranceDuringOwnership(false)
                .riskBornByBank(false)
                .assetInspected(false)
                .ownershipVerified(false)
                .assetRegisteredToCustomer(false)
                .verificationChecklist(new ArrayList<>())
                .tenantId(contract.getTenantId())
                .build();
        contract.setStatus(MurabahaDomainEnums.ContractStatus.PENDING_OWNERSHIP);
        contractRepository.save(contract);
        return purchaseRepository.save(purchase);
    }

    public AssetMurabahaPurchase issuePurchaseOrder(Long purchaseId, PurchaseOrderDetailsRequest details) {
        AssetMurabahaPurchase purchase = getPurchase(purchaseId);
        if (purchase.getPurchaseStatus() != MurabahaDomainEnums.AssetPurchaseStatus.QUOTE_RECEIVED
                || purchase.getOverallStatus() != MurabahaDomainEnums.AssetPurchaseOverallStatus.QUOTE_PHASE) {
            throw new BusinessException("Purchase order can only be issued when status is QUOTE_RECEIVED. Current: "
                    + purchase.getPurchaseStatus(), "INVALID_PURCHASE_STATE");
        }
        purchase.setPurchaseOrderRef(details.getPurchaseOrderRef());
        purchase.setPurchaseOrderDate(details.getPurchaseOrderDate());
        purchase.setPurchaseStatus(MurabahaDomainEnums.AssetPurchaseStatus.PO_ISSUED);
        purchase.setOverallStatus(MurabahaDomainEnums.AssetPurchaseOverallStatus.PURCHASE_IN_PROGRESS);
        return purchaseRepository.save(purchase);
    }

    public AssetMurabahaPurchase recordPaymentToSupplier(Long purchaseId, PaymentDetailsRequest details) {
        AssetMurabahaPurchase purchase = getPurchase(purchaseId);
        if (purchase.getPurchaseStatus() != MurabahaDomainEnums.AssetPurchaseStatus.PO_ISSUED
                && purchase.getPurchaseStatus() != MurabahaDomainEnums.AssetPurchaseStatus.INVOICE_RECEIVED) {
            throw new BusinessException("Purchase order must be issued before payment", "PO_NOT_ISSUED");
        }
        MurabahaContract contract = getAssetContract(purchase.getContractId());
        if (details.getPurchasePrice() != null && contract.getCostPrice() != null
                && details.getPurchasePrice().compareTo(contract.getCostPrice()) > 0) {
            throw new BusinessException("Payment amount " + details.getPurchasePrice()
                    + " exceeds contract cost price " + contract.getCostPrice(), "PAYMENT_EXCEEDS_COST");
        }

        purchase.setPurchasePrice(MurabahaSupport.money(details.getPurchasePrice()));
        purchase.setSupplierNegotiatedPrice(MurabahaSupport.money(details.getNegotiatedPrice()));
        purchase.setPurchaseInvoiceRef(details.getInvoiceRef());
        purchase.setPurchaseInvoiceDate(details.getInvoiceDate());
        purchase.setPaymentToSupplierDate(details.getPaymentDate());
        purchase.setPaymentToSupplierRef(details.getPaymentReference());
        purchase.setPurchaseStatus(MurabahaDomainEnums.AssetPurchaseStatus.PAYMENT_MADE);
        purchase.setOverallStatus(MurabahaDomainEnums.AssetPurchaseOverallStatus.PURCHASE_IN_PROGRESS);

        var journal = postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("MURABAHA")
                .txnType(IslamicTransactionType.ASSET_ACQUISITION)
                .amount(purchase.getPurchasePrice())
                .valueDate(details.getPaymentDate())
                .reference(purchase.getPurchaseRef() + "-PAY")
                .additionalContext(Map.of("currencyCode", contract.getCurrencyCode()))
                .build());
        purchase.setPaymentToSupplierJournalRef(journal.getJournalNumber());
        return purchaseRepository.save(purchase);
    }

    public AssetMurabahaPurchase recordDelivery(Long purchaseId, DeliveryDetailsRequest details) {
        AssetMurabahaPurchase purchase = getPurchase(purchaseId);
        if (purchase.getPurchaseStatus() != MurabahaDomainEnums.AssetPurchaseStatus.PAYMENT_MADE
                && purchase.getPurchaseStatus() != MurabahaDomainEnums.AssetPurchaseStatus.INVOICE_RECEIVED) {
            throw new BusinessException("Delivery can only be recorded when status is PAYMENT_MADE or INVOICE_RECEIVED. Current: "
                    + purchase.getPurchaseStatus(), "INVALID_PURCHASE_STATE");
        }
        purchase.setPurchaseStatus(MurabahaDomainEnums.AssetPurchaseStatus.DELIVERED);
        purchase.setOverallStatus(MurabahaDomainEnums.AssetPurchaseOverallStatus.BANK_OWNS_ASSET);
        purchase.setPossessionLocation(details.getDeliveryLocation());
        purchase.setAssetInspectionDate(details.getDeliveryDate());
        purchase.setAssetInspectionNotes("Delivery reference: " + details.getDeliveryReference());
        purchase.setAssetInspected(Boolean.TRUE);
        return purchaseRepository.save(purchase);
    }

    public AssetMurabahaPurchase recordPossession(Long purchaseId, OwnershipEvidenceRequest evidence) {
        AssetMurabahaPurchase purchase = getPurchase(purchaseId);
        if (evidence.getInsurancePolicyRef() == null || evidence.getInsurancePolicyRef().isBlank()) {
            throw new BusinessException("Insurance policy is mandatory for bank-owned assets. Provide insurance details.", "INSURANCE_REQUIRED");
        }
        // Temporal validation: ownershipDate must be after paymentToSupplierDate
        if (purchase.getPaymentToSupplierDate() != null && evidence.getOwnershipDate() != null
                && evidence.getOwnershipDate().isBefore(purchase.getPaymentToSupplierDate())) {
            throw new BusinessException("Ownership date " + evidence.getOwnershipDate()
                    + " must not be before payment to supplier date " + purchase.getPaymentToSupplierDate(),
                    "INVALID_OWNERSHIP_DATE_SEQUENCE");
        }
        validatePossessionEvidence(purchase.getAssetCategory(), evidence.getEvidenceType());

        purchase.setPossessionType(evidence.getPossessionType() != null
                ? evidence.getPossessionType()
                : MurabahaDomainEnums.PossessionType.CONSTRUCTIVE);
        purchase.setPossessionDate(evidence.getOwnershipDate());
        purchase.setPossessionEvidenceType(evidence.getEvidenceType());
        purchase.setPossessionEvidenceRef(evidence.getEvidenceRef());
        purchase.setPossessionEvidenceDocumentPath(evidence.getDocumentPath());
        purchase.setPossessionLocation(evidence.getPossessionLocation());
        purchase.setRegisteredInBankName(Boolean.TRUE.equals(evidence.getRegisteredInBankName()));
        purchase.setBankNameOnTitle(evidence.getBankNameOnTitle());
        purchase.setInsuranceDuringOwnership(Boolean.TRUE.equals(evidence.getInsuranceDuringOwnership()));
        purchase.setInsurancePolicyRef(evidence.getInsurancePolicyRef());
        purchase.setInsuranceProvider(evidence.getInsuranceProvider());
        purchase.setInsuranceCoverageAmount(MurabahaSupport.money(evidence.getInsuranceCoverageAmount()));
        purchase.setRiskBornByBank(Boolean.TRUE);
        purchase.setAssetInspected(Boolean.TRUE.equals(evidence.getAssetInspected()));
        purchase.setAssetInspectionDate(evidence.getInspectionDate());
        purchase.setAssetInspectionNotes(evidence.getInspectionNotes());
        purchase.setOverallStatus(MurabahaDomainEnums.AssetPurchaseOverallStatus.BANK_OWNS_ASSET);
        return purchaseRepository.save(purchase);
    }

    public AssetMurabahaPurchase verifyOwnership(Long purchaseId, String verifiedBy) {
        AssetMurabahaPurchase purchase = getPurchase(purchaseId);
        // Four-eyes check: verifier must be different from the person who recorded possession
        if (verifiedBy != null && purchase.getCreatedBy() != null
                && verifiedBy.equalsIgnoreCase(purchase.getCreatedBy())) {
            throw new BusinessException("Ownership verifier must be different from the person who initiated the purchase (four-eyes principle)",
                    "FOUR_EYES_REQUIRED");
        }
        List<String> missingItems = buildOwnershipChecklistFailures(purchase);
        if (!missingItems.isEmpty()) {
            throw new BusinessException("Ownership verification failed: " + String.join(", ", missingItems),
                    "OWNERSHIP_CHECKLIST_INCOMPLETE");
        }

        purchase.setOwnershipVerified(Boolean.TRUE);
        purchase.setOwnershipVerifiedBy(verifiedBy);
        purchase.setOwnershipVerifiedAt(Instant.now());
        purchase.setOverallStatus(MurabahaDomainEnums.AssetPurchaseOverallStatus.OWNERSHIP_VERIFIED);
        purchase.setVerificationChecklist(buildChecklistSnapshot(purchase, verifiedBy));
        purchaseRepository.save(purchase);

        MurabahaContract contract = getAssetContract(purchase.getContractId());
        contract.setOwnershipVerified(Boolean.TRUE);
        contract.setOwnershipVerifiedBy(verifiedBy);
        contract.setOwnershipVerifiedAt(Instant.now());
        contract.setStatus(MurabahaDomainEnums.ContractStatus.OWNERSHIP_VERIFIED);
        contract.appendOwnershipEvent(Map.of(
                "event", "ASSET_OWNERSHIP_VERIFIED",
                "verifiedBy", verifiedBy,
                "timestamp", Instant.now().toString()));
        contractRepository.save(contract);
        return purchase;
    }

    public AssetMurabahaPurchase transferToCustomer(Long purchaseId, TransferDetailsRequest details) {
        AssetMurabahaPurchase purchase = getPurchase(purchaseId);
        MurabahaContract contract = getAssetContract(purchase.getContractId());
        if (contract.getStatus() != MurabahaDomainEnums.ContractStatus.ACTIVE
                && contract.getStatus() != MurabahaDomainEnums.ContractStatus.EXECUTED) {
            throw new BusinessException("Asset transfer requires an executed Murabaha sale",
                    "CONTRACT_NOT_EXECUTED");
        }
        purchase.setTransferToCustomerDate(details.getTransferDate());
        purchase.setTransferDocumentRef(details.getTransferDocumentRef());
        purchase.setAssetRegisteredToCustomer(Boolean.TRUE.equals(details.getAssetRegisteredToCustomer()));
        purchase.setCustomerAcknowledgmentDate(details.getCustomerAcknowledgmentDate());
        purchase.setCustomerAcknowledgmentRef(details.getCustomerAcknowledgmentRef());
        purchase.setOverallStatus(MurabahaDomainEnums.AssetPurchaseOverallStatus.TRANSFERRED_TO_CUSTOMER);

        // Post GL entry for asset transfer to customer
        postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                .contractTypeCode("MURABAHA")
                .txnType(IslamicTransactionType.ASSET_TRANSFER)
                .accountId(contract.getAccountId())
                .amount(purchase.getPurchasePrice() != null ? purchase.getPurchasePrice() : contract.getCostPrice())
                .valueDate(details.getTransferDate())
                .reference(purchase.getPurchaseRef() + "-TRANSFER")
                .narration("Asset transfer to customer for Murabaha contract " + contract.getContractRef())
                .additionalContext(Map.of("currencyCode", contract.getCurrencyCode()))
                .build());

        return purchaseRepository.save(purchase);
    }

    public void recordAssetDamageOrLoss(Long purchaseId, AssetDamageReportRequest report) {
        AssetMurabahaPurchase purchase = getPurchase(purchaseId);
        MurabahaContract contract = getAssetContract(purchase.getContractId());
        purchase.setAssetInspectionNotes((purchase.getAssetInspectionNotes() == null ? "" : purchase.getAssetInspectionNotes() + "\n")
                + "Damage report on " + report.getIncidentDate() + ": " + report.getDescription());
        if (Boolean.TRUE.equals(report.getTotalLoss())) {
            purchase.setOverallStatus(MurabahaDomainEnums.AssetPurchaseOverallStatus.FAILED);

            // Post GL reversal for the asset acquisition
            if (purchase.getPurchasePrice() != null && purchase.getPurchasePrice().compareTo(java.math.BigDecimal.ZERO) > 0) {
                postingRuleService.postIslamicTransaction(IslamicPostingRequest.builder()
                        .contractTypeCode("MURABAHA")
                        .txnType(IslamicTransactionType.CONTRACT_CANCELLATION)
                        .amount(purchase.getPurchasePrice())
                        .valueDate(report.getIncidentDate())
                        .reference(purchase.getPurchaseRef() + "-LOSS-REV")
                        .narration("GL reversal for total loss of asset: " + report.getDescription())
                        .additionalContext(Map.of("currencyCode", contract.getCurrencyCode()))
                        .build());
            }

            contract.setStatus(MurabahaDomainEnums.ContractStatus.CANCELLED);
            contract.appendOwnershipEvent(Map.of(
                    "event", "ASSET_TOTAL_LOSS",
                    "incidentDate", report.getIncidentDate().toString(),
                    "description", report.getDescription()));
            contractRepository.save(contract);
        }
        purchaseRepository.save(purchase);
    }

    @Transactional(readOnly = true)
    public AssetMurabahaPurchase getPurchase(Long purchaseId) {
        return purchaseRepository.findById(purchaseId)
                .orElseThrow(() -> new ResourceNotFoundException("AssetMurabahaPurchase", "id", purchaseId));
    }

    @Transactional(readOnly = true)
    public AssetMurabahaPurchase getPurchaseByContract(Long contractId) {
        return purchaseRepository.findByContractId(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("AssetMurabahaPurchase", "contractId", contractId));
    }

    @Transactional(readOnly = true)
    public List<AssetMurabahaPurchase> getPendingVerification() {
        return purchaseRepository.findByOwnershipVerifiedFalse();
    }

    @Transactional(readOnly = true)
    public List<AssetMurabahaPurchase> getByStatus(MurabahaDomainEnums.AssetPurchaseOverallStatus status) {
        return purchaseRepository.findByOverallStatus(status);
    }

    private void validatePossessionEvidence(MurabahaDomainEnums.AssetCategory category,
                                            MurabahaDomainEnums.OwnershipEvidenceType evidenceType) {
        if (category == MurabahaDomainEnums.AssetCategory.RESIDENTIAL_PROPERTY
                || category == MurabahaDomainEnums.AssetCategory.COMMERCIAL_PROPERTY
                || category == MurabahaDomainEnums.AssetCategory.LAND
                || category == MurabahaDomainEnums.AssetCategory.PROPERTY) {
            if (evidenceType != MurabahaDomainEnums.OwnershipEvidenceType.TITLE_DEED
                    && evidenceType != MurabahaDomainEnums.OwnershipEvidenceType.REGISTRATION_CERTIFICATE) {
                throw new BusinessException("Property Murabaha requires title deed or registration certificate evidence",
                        "INVALID_POSSESSION_EVIDENCE");
            }
            return;
        }
        if (category == MurabahaDomainEnums.AssetCategory.VEHICLE
                && evidenceType != MurabahaDomainEnums.OwnershipEvidenceType.REGISTRATION_CERTIFICATE) {
            throw new BusinessException("Vehicle Murabaha requires registration certificate evidence",
                    "INVALID_POSSESSION_EVIDENCE");
        }
    }

    private List<String> buildOwnershipChecklistFailures(AssetMurabahaPurchase purchase) {
        List<String> missing = new ArrayList<>();
        if (purchase.getPaymentToSupplierDate() == null) {
            missing.add("Bank has NOT paid supplier in full — payment date not recorded");
        }
        if (purchase.getPossessionEvidenceType() == null || purchase.getPossessionEvidenceRef() == null) {
            missing.add("Asset title or possession evidence is recorded");
        }
        if (!Boolean.TRUE.equals(purchase.getInsuranceDuringOwnership())) {
            missing.add("Asset is insured during bank ownership");
        }
        if (!Boolean.TRUE.equals(purchase.getRiskBornByBank())) {
            missing.add("Bank bears risk of loss or damage");
        }
        if ((purchase.getAssetCategory() == MurabahaDomainEnums.AssetCategory.VEHICLE
                || purchase.getAssetCategory() == MurabahaDomainEnums.AssetCategory.EQUIPMENT
                || purchase.getAssetCategory() == MurabahaDomainEnums.AssetCategory.MACHINERY)
                && !Boolean.TRUE.equals(purchase.getAssetInspected())) {
            missing.add("Asset inspection has been completed");
        }
        return missing;
    }

    private List<Map<String, Object>> buildChecklistSnapshot(AssetMurabahaPurchase purchase, String verifiedBy) {
        List<Map<String, Object>> items = new ArrayList<>();
        items.add(checklistItem("Bank has paid supplier in full", purchase.getPaymentToSupplierDate() != null, verifiedBy));
        items.add(checklistItem("Asset title or possession evidence recorded",
                purchase.getPossessionEvidenceType() != null && purchase.getPossessionEvidenceRef() != null, verifiedBy));
        items.add(checklistItem("Asset insured during ownership",
                Boolean.TRUE.equals(purchase.getInsuranceDuringOwnership()), verifiedBy));
        items.add(checklistItem("Bank bears risk of loss or damage",
                Boolean.TRUE.equals(purchase.getRiskBornByBank()), verifiedBy));
        items.add(checklistItem("Asset inspected where required",
                !(purchase.getAssetCategory() == MurabahaDomainEnums.AssetCategory.VEHICLE
                        || purchase.getAssetCategory() == MurabahaDomainEnums.AssetCategory.EQUIPMENT
                        || purchase.getAssetCategory() == MurabahaDomainEnums.AssetCategory.MACHINERY)
                        || Boolean.TRUE.equals(purchase.getAssetInspected()), verifiedBy));
        return items;
    }

    private Map<String, Object> checklistItem(String label, boolean checked, String verifiedBy) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("item", label);
        item.put("checked", checked);
        item.put("date", LocalDate.now().toString());
        item.put("verifiedBy", verifiedBy);
        return item;
    }

    private MurabahaContract getAssetContract(Long contractId) {
        MurabahaContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("MurabahaContract", "id", contractId));
        if (contract.getMurabahahType() != MurabahaDomainEnums.MurabahahType.ASSET_MURABAHA) {
            throw new BusinessException("Contract is not configured for Asset Murabaha",
                    "INVALID_MURABAHA_TYPE");
        }
        return contract;
    }
}
