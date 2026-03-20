package com.cbs.payroll.service;

import com.cbs.account.dto.PostTransactionRequest;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.service.AccountService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.payroll.entity.*;
import com.cbs.payroll.repository.*;
import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class PayrollService {

    private final PayrollBatchRepository batchRepository;
    private final PayrollItemRepository itemRepository;
    private final PaymentService paymentService;
    private final AccountService accountService;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public PayrollBatch createBatch(PayrollBatch batch, List<PayrollItem> items) {
        batch.setBatchId("PAY-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        batch.setStatus("DRAFT");
        batch.setEmployeeCount(items.size());

        // Calculate totals from items
        BigDecimal totalGross = BigDecimal.ZERO, totalNet = BigDecimal.ZERO, totalTax = BigDecimal.ZERO;
        for (PayrollItem item : items) {
            totalGross = totalGross.add(item.getGrossAmount());
            totalNet = totalNet.add(item.getNetAmount());
            totalTax = totalTax.add(item.getTaxAmount());
        }
        batch.setTotalGross(totalGross);
        batch.setTotalNet(totalNet);
        batch.setTotalTax(totalTax);
        batch.setTotalDeductions(totalGross.subtract(totalNet));

        PayrollBatch saved = batchRepository.save(batch);
        items.forEach(i -> { i.setBatchId(saved.getId()); itemRepository.save(i); });

        log.info("Payroll batch created: id={}, company={}, employees={}, totalNet={}",
                saved.getBatchId(), saved.getCompanyName(), items.size(), totalNet);
        return saved;
    }

    @Transactional
    public PayrollBatch validate(String batchId) {
        PayrollBatch batch = getBatch(batchId);
        List<PayrollItem> items = itemRepository.findByBatchIdOrderByEmployeeNameAsc(batch.getId());

        List<String> errors = new ArrayList<>();
        for (PayrollItem item : items) {
            if (item.getNetAmount().signum() <= 0) errors.add("Zero/negative net for: " + item.getEmployeeName());
            if (item.getCreditAccountNumber() == null || item.getCreditAccountNumber().isBlank())
                errors.add("Missing account for: " + item.getEmployeeName());
        }
        if (!errors.isEmpty()) throw new BusinessException("Validation failed: " + String.join("; ", errors));

        batch.setStatus("VALIDATED");
        batch.setUpdatedAt(Instant.now());
        log.info("Payroll validated: batch={}, items={}", batchId, items.size());
        return batchRepository.save(batch);
    }

    @Transactional
    public PayrollBatch approve(String batchId) {
        PayrollBatch batch = getBatch(batchId);
        if (!"VALIDATED".equals(batch.getStatus())) throw new BusinessException("Batch must be VALIDATED before approval");
        String approvedBy = currentActorProvider.getCurrentActor();
        batch.setStatus("APPROVED");
        batch.setApprovedBy(approvedBy);
        batch.setApprovedAt(Instant.now());
        log.info("Payroll approved: batch={}, by={}", batchId, approvedBy);
        return batchRepository.save(batch);
    }

    @Transactional
    public PayrollBatch process(String batchId) {
        PayrollBatch batch = getBatch(batchId);
        if (!"APPROVED".equals(batch.getStatus())) throw new BusinessException("Batch must be APPROVED before processing");

        batch.setStatus("PROCESSING");
        List<PayrollItem> items = itemRepository.findByBatchIdOrderByEmployeeNameAsc(batch.getId());
        int failed = 0;
        String sourceAccountNumber = null;

        for (PayrollItem item : items) {
            try {
                String paymentNarration = item.getNarration() != null && !item.getNarration().isBlank()
                        ? item.getNarration()
                        : "Payroll payment for " + item.getEmployeeName() + " (" + batch.getBatchId() + ")";

                PaymentInstruction payment = paymentService.initiateDomesticPayment(
                        batch.getDebitAccountId(),
                        item.getCreditAccountNumber(),
                        item.getEmployeeName(),
                        item.getCreditBankCode(),
                        item.getNetAmount(),
                        batch.getCurrency(),
                        paymentNarration,
                        true
                );

                if (item.getTaxAmount() != null && item.getTaxAmount().signum() > 0) {
                    if (sourceAccountNumber == null) {
                        sourceAccountNumber = accountService.getAccountById(batch.getDebitAccountId()).getAccountNumber();
                    }
                    accountService.postDebit(PostTransactionRequest.builder()
                            .accountNumber(sourceAccountNumber)
                            .transactionType(TransactionType.DEBIT)
                            .amount(item.getTaxAmount())
                            .narration("Payroll tax deduction for " + item.getEmployeeName() + " (" + batch.getBatchId() + ")")
                            .channel(TransactionChannel.SYSTEM)
                            .externalRef(payment.getInstructionRef() + "-TAX")
                            .build());
                }

                item.setStatus("PAID");
                item.setFailureReason(null);
                item.setPaymentReference(payment.getInstructionRef());
            } catch (Exception e) {
                item.setStatus("FAILED");
                item.setFailureReason(e.getMessage());
                failed++;
            }
            itemRepository.save(item);
        }

        batch.setFailedCount(failed);
        batch.setProcessedAt(Instant.now());
        batch.setStatus(failed == 0 ? "COMPLETED" : (failed < items.size() ? "PARTIALLY_COMPLETED" : "FAILED"));
        batch.setUpdatedAt(Instant.now());
        log.info("Payroll processed: batch={}, total={}, failed={}, status={}", batchId, items.size(), failed, batch.getStatus());
        return batchRepository.save(batch);
    }

    public List<PayrollBatch> getAllBatches() { return batchRepository.findAll(); }
    public List<PayrollBatch> getByCustomer(Long customerId) { return batchRepository.findByCustomerIdOrderByPaymentDateDesc(customerId); }
    public List<PayrollItem> getItems(String batchId) {
        PayrollBatch batch = getBatch(batchId);
        return itemRepository.findByBatchIdOrderByEmployeeNameAsc(batch.getId());
    }

    private PayrollBatch getBatch(String batchId) {
        return batchRepository.findByBatchId(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("PayrollBatch", "batchId", batchId));
    }
}
