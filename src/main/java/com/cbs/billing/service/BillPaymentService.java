package com.cbs.billing.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.billing.dto.*;
import com.cbs.billing.entity.*;
import com.cbs.billing.repository.*;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class BillPaymentService {

    private final BillerRepository billerRepository;
    private final BillPaymentRepository billPaymentRepository;
    private final BillFavoriteRepository billFavoriteRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;
    private final CbsProperties cbsProperties;

    // ========================================================================
    // BILLER MANAGEMENT
    // ========================================================================

    @Transactional
    public Biller createBiller(Biller biller) {
        if (billerRepository.findByBillerCode(biller.getBillerCode()).isPresent()) {
            throw new BusinessException("Biller code already exists: " + biller.getBillerCode(), "DUPLICATE_BILLER");
        }
        Biller saved = billerRepository.save(biller);
        log.info("Biller created: code={}, name={}, category={}", saved.getBillerCode(), saved.getBillerName(), saved.getBillerCategory());
        return saved;
    }

    public List<Biller> getAllActiveBillers() {
        return billerRepository.findByIsActiveTrueOrderByBillerNameAsc();
    }

    public List<Biller> getAllBillers() {
        return billerRepository.findAllByOrderByBillerNameAsc();
    }

    @Transactional
    public Biller updateBiller(Long id, Biller updates) {
        Biller existing = getBiller(id);
        if (updates.getBillerName() != null) existing.setBillerName(updates.getBillerName());
        if (updates.getBillerCategory() != null) existing.setBillerCategory(updates.getBillerCategory());
        if (updates.getSettlementBankCode() != null) existing.setSettlementBankCode(updates.getSettlementBankCode());
        if (updates.getSettlementAccountNumber() != null) existing.setSettlementAccountNumber(updates.getSettlementAccountNumber());
        if (updates.getCustomerIdLabel() != null) existing.setCustomerIdLabel(updates.getCustomerIdLabel());
        if (updates.getCustomerIdRegex() != null) existing.setCustomerIdRegex(updates.getCustomerIdRegex());
        if (updates.getMinAmount() != null) existing.setMinAmount(updates.getMinAmount());
        if (updates.getMaxAmount() != null) existing.setMaxAmount(updates.getMaxAmount());
        if (updates.getCurrencyCode() != null) existing.setCurrencyCode(updates.getCurrencyCode());
        if (updates.getFlatFee() != null) existing.setFlatFee(updates.getFlatFee());
        if (updates.getPercentageFee() != null) existing.setPercentageFee(updates.getPercentageFee());
        if (updates.getFeeCap() != null) existing.setFeeCap(updates.getFeeCap());
        if (updates.getFeeBearer() != null) existing.setFeeBearer(updates.getFeeBearer());
        if (updates.getContactEmail() != null) existing.setContactEmail(updates.getContactEmail());
        if (updates.getContactPhone() != null) existing.setContactPhone(updates.getContactPhone());
        if (updates.getLogoUrl() != null) existing.setLogoUrl(updates.getLogoUrl());
        if (updates.getIsActive() != null) existing.setIsActive(updates.getIsActive());
        Biller saved = billerRepository.save(existing);
        log.info("Biller updated: code={}, name={}", saved.getBillerCode(), saved.getBillerName());
        return saved;
    }

    public List<Biller> getBillersByCategory(BillerCategory category) {
        return billerRepository.findByBillerCategoryAndIsActiveTrue(category);
    }

    public Biller getBiller(Long id) {
        return billerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Biller", "id", id));
    }

    public Biller getBillerByCode(String billerCode) {
        return billerRepository.findByBillerCode(billerCode)
                .orElseThrow(() -> new ResourceNotFoundException("Biller", "billerCode", billerCode));
    }

    // ========================================================================
    // BILLER SEARCH
    // ========================================================================

    public List<Biller> searchBillers(String query) {
        if (!StringUtils.hasText(query) || query.length() < 2) {
            return List.of();
        }
        return billerRepository.searchByNameOrCode(query.trim());
    }

    // ========================================================================
    // BILL VALIDATION
    // ========================================================================

    public BillValidationResponseDto validateBillReference(String billerCode, String customerId) {
        Biller biller = billerRepository.findByBillerCode(billerCode)
                .orElseThrow(() -> new ResourceNotFoundException("Biller", "billerCode", billerCode));

        if (!Boolean.TRUE.equals(biller.getIsActive())) {
            throw new BusinessException("Biller is not active", "BILLER_INACTIVE");
        }

        // Validate customer ID against biller's regex pattern
        boolean regexValid = true;
        if (StringUtils.hasText(biller.getCustomerIdRegex()) && StringUtils.hasText(customerId)) {
            regexValid = customerId.matches(biller.getCustomerIdRegex());
        }

        if (!regexValid) {
            return BillValidationResponseDto.builder()
                    .referenceValid(false)
                    .customerId(customerId)
                    .billerCode(billerCode)
                    .build();
        }

        // In a production system, this would call the biller's external validation API.
        // The integration point would vary by biller:
        //   - NIBSS BillPay for Nigerian billers
        //   - Direct API integration for major billers (DSTV, IKEDC, etc.)
        //   - Aggregator API (e.g., Paystack, Flutterwave) for broad biller coverage
        //
        // For now, we validate the format and return the reference as valid.
        // The external integration can be plugged in per-biller via the metadata field.
        return BillValidationResponseDto.builder()
                .referenceValid(true)
                .customerId(customerId)
                .customerName("Validated Customer — " + customerId)
                .billerCode(billerCode)
                .build();
    }

    // ========================================================================
    // FEE PREVIEW
    // ========================================================================

    public BillFeePreviewDto calculateFeePreview(String billerCode, BigDecimal amount) {
        Biller biller = billerRepository.findByBillerCode(billerCode)
                .orElseThrow(() -> new ResourceNotFoundException("Biller", "billerCode", billerCode));

        BigDecimal fee = biller.calculateFee(amount);
        BigDecimal totalDebit = "CUSTOMER".equals(biller.getFeeBearer()) ? amount.add(fee) : amount;

        String commissionType = biller.getPercentageFee() != null
                && biller.getPercentageFee().compareTo(BigDecimal.ZERO) > 0 ? "PERCENTAGE" : "FLAT";

        return BillFeePreviewDto.builder()
                .billerCode(billerCode)
                .amount(amount)
                .fee(fee)
                .commission(fee)
                .totalDebit(totalDebit)
                .feeBearer(biller.getFeeBearer())
                .commissionType(commissionType)
                .build();
    }

    // ========================================================================
    // BILL PAYMENT
    // ========================================================================

    @Transactional
    public BillPayment payBill(Long debitAccountId, String billerCode, String billerCustomerId,
                                 String billerCustomerName, BigDecimal amount) {
        Account debitAccount = accountRepository.findById(debitAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", debitAccountId));

        Biller biller = billerRepository.findByBillerCode(billerCode)
                .orElseThrow(() -> new ResourceNotFoundException("Biller", "billerCode", billerCode));

        if (!Boolean.TRUE.equals(biller.getIsActive())) {
            throw new BusinessException("Biller is not active", "BILLER_INACTIVE");
        }

        // Validate biller customer ID format
        if (biller.getCustomerIdRegex() != null && !billerCustomerId.matches(biller.getCustomerIdRegex())) {
            throw new BusinessException("Invalid biller customer ID format", "INVALID_BILLER_CUSTOMER_ID");
        }

        // Validate amount range
        if (biller.getMinAmount() != null && amount.compareTo(biller.getMinAmount()) < 0) {
            throw new BusinessException("Amount below biller minimum: " + biller.getMinAmount(), "BELOW_MIN_AMOUNT");
        }
        if (biller.getMaxAmount() != null && amount.compareTo(biller.getMaxAmount()) > 0) {
            throw new BusinessException("Amount exceeds biller maximum: " + biller.getMaxAmount(), "EXCEEDS_MAX_AMOUNT");
        }

        // Calculate fee
        BigDecimal fee = biller.calculateFee(amount);
        BigDecimal totalAmount = "CUSTOMER".equals(biller.getFeeBearer()) ? amount.add(fee) : amount;

        if (debitAccount.getAvailableBalance().compareTo(totalAmount) < 0) {
            throw new BusinessException("Insufficient balance", "INSUFFICIENT_BALANCE");
        }

        String paymentRef = "BIL-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();

        BillPayment payment = BillPayment.builder()
                .paymentRef(paymentRef)
                .biller(biller).debitAccount(debitAccount).customer(debitAccount.getCustomer())
                .billerCustomerId(billerCustomerId).billerCustomerName(billerCustomerName)
                .billAmount(amount).feeAmount(fee).totalAmount(totalAmount)
                .currencyCode(biller.getCurrencyCode())
                .status("PROCESSING").build();

        if (biller.getSettlementAccount() != null) {
            Account settlement = biller.getSettlementAccount();
            accountPostingService.postTransfer(
                    debitAccount,
                    settlement,
                    amount,
                    amount,
                    "Bill payment " + paymentRef,
                    "Bill settlement " + paymentRef,
                    TransactionChannel.SYSTEM,
                    paymentRef,
                    "BILL_PAYMENT",
                    paymentRef
            );
            if (fee.compareTo(BigDecimal.ZERO) > 0 && "CUSTOMER".equals(biller.getFeeBearer())) {
                accountPostingService.postDebitAgainstGl(
                        debitAccount,
                        TransactionType.FEE_DEBIT,
                        fee,
                        "Bill payment fee " + paymentRef,
                        TransactionChannel.SYSTEM,
                        paymentRef + ":FEE",
                        resolveBillSettlementGlCode(),
                        "BILL_PAYMENT",
                        paymentRef
                );
            }
            payment.setStatus("COMPLETED");
            payment.setBillerConfirmationRef("CONF-" + paymentRef);
        } else {
            accountPostingService.postDebitAgainstGl(
                    debitAccount,
                    TransactionType.DEBIT,
                    totalAmount,
                    "Bill payment " + paymentRef,
                    TransactionChannel.SYSTEM,
                    paymentRef,
                    resolveBillSettlementGlCode(),
                    "BILL_PAYMENT",
                    paymentRef
            );
            payment.setStatus("COMPLETED");
        }

        BillPayment saved = billPaymentRepository.save(payment);
        log.info("Bill payment completed: ref={}, biller={}, amount={}, fee={}", paymentRef, billerCode, amount, fee);
        return saved;
    }

    public BillPayment getPayment(Long id) {
        return billPaymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BillPayment", "id", id));
    }

    public Page<BillPayment> getCustomerPayments(Long customerId, Pageable pageable) {
        return billPaymentRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable);
    }

    public Page<BillPayment> getCustomerPaymentsByStatus(Long customerId, String status, Pageable pageable) {
        return billPaymentRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(customerId, status, pageable);
    }

    // ========================================================================
    // PAYMENT HISTORY DTO MAPPING
    // ========================================================================

    public List<BillPaymentHistoryDto> getPaymentHistory(Long customerId, Pageable pageable, String status) {
        Page<BillPayment> page;
        if (StringUtils.hasText(status)) {
            page = billPaymentRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(customerId, status.toUpperCase(), pageable);
        } else {
            page = billPaymentRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable);
        }
        return page.getContent().stream().map(this::toHistoryDto).toList();
    }

    private BillPaymentHistoryDto toHistoryDto(BillPayment payment) {
        Biller biller = payment.getBiller();
        return BillPaymentHistoryDto.builder()
                .id(payment.getId())
                .transactionRef(payment.getPaymentRef())
                .billerName(biller != null ? biller.getBillerName() : "Unknown")
                .billerCode(biller != null ? biller.getBillerCode() : "")
                .categoryCode(biller != null ? biller.getBillerCategory().name() : "")
                .amount(payment.getBillAmount())
                .fee(payment.getFeeAmount())
                .totalDebit(payment.getTotalAmount())
                .status(payment.getStatus())
                .confirmationNumber(payment.getBillerConfirmationRef())
                .customerReference(payment.getBillerCustomerId())
                .paidAt(payment.getCreatedAt())
                .build();
    }

    // ========================================================================
    // FAVORITES
    // ========================================================================

    public List<BillFavoriteDto> getCustomerFavorites(Long customerId) {
        return billFavoriteRepository.findByCustomerIdOrderByLastPaidAtDesc(customerId)
                .stream()
                .map(this::toFavoriteDto)
                .toList();
    }

    @Transactional
    public BillFavoriteDto addFavorite(Customer customer, BillFavoriteRequestDto request) {
        Biller biller = billerRepository.findByBillerCode(request.getBillerCode())
                .orElseThrow(() -> new ResourceNotFoundException("Biller", "billerCode", request.getBillerCode()));

        // Check if favorite already exists for this customer + biller + reference
        var existing = billFavoriteRepository.findByCustomerIdAndBillerIdAndBillerCustomerId(
                customer.getId(), biller.getId(), request.getBillerCustomerId());
        if (existing.isPresent()) {
            // Update the alias if provided, return existing
            BillFavorite fav = existing.get();
            if (StringUtils.hasText(request.getAlias())) {
                fav.setAlias(request.getAlias());
            }
            if (request.getFields() != null && !request.getFields().isEmpty()) {
                fav.setFields(request.getFields());
            }
            return toFavoriteDto(billFavoriteRepository.save(fav));
        }

        // Limit favorites per customer
        long count = billFavoriteRepository.countByCustomerId(customer.getId());
        if (count >= 20) {
            throw new BusinessException("Maximum of 20 favorites allowed per customer", "MAX_FAVORITES_REACHED");
        }

        BillFavorite favorite = BillFavorite.builder()
                .customer(customer)
                .biller(biller)
                .billerCustomerId(request.getBillerCustomerId())
                .alias(request.getAlias())
                .fields(request.getFields() != null ? request.getFields() : Map.of())
                .paymentCount(0)
                .build();

        BillFavorite saved = billFavoriteRepository.save(favorite);
        log.info("Bill favorite added: customerId={}, billerCode={}", customer.getId(), biller.getBillerCode());
        return toFavoriteDto(saved);
    }

    @Transactional
    public void removeFavorite(Long customerId, Long favoriteId) {
        BillFavorite favorite = billFavoriteRepository.findByIdAndCustomerId(favoriteId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("BillFavorite", "id", favoriteId));
        billFavoriteRepository.delete(favorite);
        log.info("Bill favorite removed: id={}, customerId={}", favoriteId, customerId);
    }

    @Transactional
    public BillFavoriteDto updateFavoriteAlias(Long customerId, Long favoriteId, String alias) {
        BillFavorite favorite = billFavoriteRepository.findByIdAndCustomerId(favoriteId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("BillFavorite", "id", favoriteId));
        favorite.setAlias(alias);
        return toFavoriteDto(billFavoriteRepository.save(favorite));
    }

    @Transactional
    public void updateFavoriteAfterPayment(Long customerId, String billerCode, String billerCustomerId, BigDecimal amount) {
        Biller biller = billerRepository.findByBillerCode(billerCode).orElse(null);
        if (biller == null) return;

        billFavoriteRepository.findByCustomerIdAndBillerIdAndBillerCustomerId(customerId, biller.getId(), billerCustomerId)
                .ifPresent(fav -> {
                    fav.setLastPaidAmount(amount);
                    fav.setLastPaidAt(Instant.now());
                    fav.setPaymentCount(fav.getPaymentCount() + 1);
                    billFavoriteRepository.save(fav);
                });
    }

    private BillFavoriteDto toFavoriteDto(BillFavorite favorite) {
        Biller biller = favorite.getBiller();
        return BillFavoriteDto.builder()
                .id(favorite.getId())
                .billerName(biller.getBillerName())
                .billerCode(biller.getBillerCode())
                .categoryCode(biller.getBillerCategory().name())
                .billerCustomerId(favorite.getBillerCustomerId())
                .alias(favorite.getAlias())
                .fields(favorite.getFields())
                .lastPaidAmount(favorite.getLastPaidAmount())
                .lastPaidAt(favorite.getLastPaidAt())
                .paymentCount(favorite.getPaymentCount())
                .build();
    }

    // ========================================================================
    // INTERNAL
    // ========================================================================

    private String resolveBillSettlementGlCode() {
        String glCode = cbsProperties.getLedger().getExternalClearingGlCode();
        if (!StringUtils.hasText(glCode)) {
            throw new BusinessException("CBS_LEDGER_EXTERNAL_CLEARING_GL is required for bill payment settlement",
                    "MISSING_BILL_PAYMENT_SETTLEMENT_GL");
        }
        return glCode;
    }
}
