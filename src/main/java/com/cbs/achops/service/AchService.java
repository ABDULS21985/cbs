package com.cbs.achops.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.achops.entity.AchBatch;
import com.cbs.achops.entity.AchItem;
import com.cbs.achops.repository.AchBatchRepository;
import com.cbs.achops.repository.AchItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AchService {

    private final AchBatchRepository batchRepository;
    private final AchItemRepository itemRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;

    @Value("${cbs.ach.gl.clearing:1001-ACH-001}")
    private String achClearingGlCode;

    @Transactional
    public AchBatch createBatch(AchBatch batch) {
        batch.setBatchId("ACH-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return batchRepository.save(batch);
    }

    @Transactional
    public AchBatch submit(String batchId) {
        AchBatch b = getBatch(batchId);
        if (!"VALIDATED".equals(b.getStatus()) && !"CREATED".equals(b.getStatus())) {
            throw new BusinessException("Batch not ready for submission");
        }
        b.setStatus("SUBMITTED");
        b.setSubmittedAt(Instant.now());
        log.info("ACH batch submitted: id={}, operator={}, txns={}", batchId, b.getAchOperator(), b.getTotalTransactions());
        return batchRepository.save(b);
    }

    @Transactional
    public AchBatch settle(String batchId) {
        AchBatch b = getBatch(batchId);
        b.setStatus("SETTLED");
        b.setSettledAt(Instant.now());
        return batchRepository.save(b);
    }

    public List<AchBatch> getByOperator(String operator, String status) {
        return batchRepository.findByAchOperatorAndStatusOrderByEffectiveDateDesc(operator, status);
    }

    // ========================================================================
    // INBOUND ITEM OPERATIONS
    // ========================================================================

    @Transactional
    public AchItem postInboundItem(Long batchId, Long itemId) {
        AchItem item = itemRepository.findByBatchIdAndId(batchId, itemId)
                .orElseThrow(() -> new ResourceNotFoundException("AchItem", "id", itemId));

        if (!"PENDING".equals(item.getStatus()) && !"RECEIVED".equals(item.getStatus())) {
            throw new BusinessException("Item is not in a postable state: " + item.getStatus(), "ITEM_NOT_POSTABLE");
        }

        // Validate batch is in correct status for posting
        AchBatch batch = item.getBatch();
        if (!"SUBMITTED".equals(batch.getStatus()) && !"SETTLED".equals(batch.getStatus())) {
            throw new BusinessException("Batch must be SUBMITTED before items can be posted, current status: " + batch.getStatus(),
                    "BATCH_NOT_SUBMITTED");
        }

        // Validate item has required fields
        if (item.getAccountNumber() == null || item.getAccountNumber().isBlank()) {
            throw new BusinessException("Account number is required for posting", "MISSING_ACCOUNT_NUMBER");
        }
        if (item.getAmount() == null || item.getAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Item amount must be greater than zero", "INVALID_ITEM_AMOUNT");
        }

        // Resolve customer account
        Account account = accountRepository.findByAccountNumber(item.getAccountNumber())
                .orElseThrow(() -> new BusinessException("Account not found: " + item.getAccountNumber(), "ACCOUNT_NOT_FOUND"));

        // Determine credit or debit based on transaction code
        // Standard ACH: codes 22/32/33 = credit, codes 27/37 = debit
        boolean isCredit = isInboundCredit(item.getTransactionCode());
        String narration = "ACH inbound " + (isCredit ? "credit" : "debit") + " - Batch " + batchId;

        if (isCredit) {
            accountPostingService.postCreditAgainstGl(
                    account, TransactionType.CREDIT, item.getAmount(),
                    narration, TransactionChannel.SYSTEM, "ACH:" + batchId + ":" + itemId,
                    achClearingGlCode, "ACH_OPS", "ACH-" + batchId + "-" + itemId
            );
        } else {
            accountPostingService.postDebitAgainstGl(
                    account, TransactionType.DEBIT, item.getAmount(),
                    narration, TransactionChannel.SYSTEM, "ACH:" + batchId + ":" + itemId,
                    achClearingGlCode, "ACH_OPS", "ACH-" + batchId + "-" + itemId
            );
        }

        item.setStatus("POSTED");
        item.setPostedAt(Instant.now());
        AchItem saved = itemRepository.save(item);

        // Update batch counters
        long postedCount = itemRepository.countByBatchIdAndStatus(batchId, "POSTED");
        if (postedCount >= batch.getTotalTransactions()) {
            batch.setStatus("SETTLED");
            batch.setSettledAt(Instant.now());
            batchRepository.save(batch);
            log.info("ACH batch fully settled: batchId={}", batchId);
        }

        log.info("ACH inbound item posted: batchId={}, itemId={}, account={}, amount={}, direction={}",
                batchId, itemId, item.getAccountNumber(), item.getAmount(), isCredit ? "CREDIT" : "DEBIT");
        return saved;
    }

    private boolean isInboundCredit(String transactionCode) {
        if (transactionCode == null) return true; // default to credit for inbound
        return switch (transactionCode) {
            case "27", "37", "28", "38" -> false; // debit codes
            default -> true; // 22, 32, 33 and others default to credit
        };
    }

    @Transactional
    public AchItem returnInboundItem(Long batchId, Long itemId, String reasonCode) {
        AchItem item = itemRepository.findByBatchIdAndId(batchId, itemId)
                .orElseThrow(() -> new ResourceNotFoundException("AchItem", "id", itemId));

        if ("RETURNED".equals(item.getStatus())) {
            throw new BusinessException("Item is already returned", "ITEM_ALREADY_RETURNED");
        }
        if ("POSTED".equals(item.getStatus())) {
            throw new BusinessException("Cannot return a posted item — use reversal instead", "ITEM_ALREADY_POSTED");
        }

        item.setStatus("RETURNED");
        item.setReturnCode(reasonCode);
        item.setReturnReason(resolveReturnReason(reasonCode));
        item.setReturnedAt(Instant.now());
        AchItem saved = itemRepository.save(item);

        // Update batch return counter
        AchBatch batch = item.getBatch();
        batch.setReturnCount(batch.getReturnCount() + 1);
        batchRepository.save(batch);

        log.info("ACH inbound item returned: batchId={}, itemId={}, reasonCode={}", batchId, itemId, reasonCode);
        return saved;
    }

    public List<AchItem> getItemsByBatch(Long batchId) {
        return itemRepository.findByBatchIdOrderBySequenceNumberAsc(batchId);
    }

    private AchBatch getBatch(String id) {
        return batchRepository.findByBatchId(id)
                .orElseThrow(() -> new ResourceNotFoundException("AchBatch", "batchId", id));
    }

    private String resolveReturnReason(String code) {
        return switch (code) {
            case "R01" -> "Insufficient Funds";
            case "R02" -> "Account Closed";
            case "R03" -> "No Account / Unable to Locate Account";
            case "R04" -> "Invalid Account Number Structure";
            case "R05" -> "Unauthorized Debit to Consumer Account";
            case "R06" -> "Returned Per ODFI Request";
            case "R07" -> "Authorization Revoked by Customer";
            case "R08" -> "Payment Stopped";
            case "R09" -> "Uncollected Funds";
            case "R10" -> "Customer Advises Not Authorized";
            default -> "Return reason: " + code;
        };
    }
}
