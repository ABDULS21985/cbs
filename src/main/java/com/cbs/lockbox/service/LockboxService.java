package com.cbs.lockbox.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.lockbox.entity.*;
import com.cbs.lockbox.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class LockboxService {

    private final LockboxRepository lockboxRepository;
    private final LockboxItemRepository itemRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public Lockbox createLockbox(Lockbox lockbox) {
        lockbox.setLockboxNumber("LBX-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        Lockbox saved = lockboxRepository.save(lockbox);
        log.info("AUDIT: Lockbox created by {}: number={}, type={}, customer={}",
                currentActorProvider.getCurrentActor(), saved.getLockboxNumber(), saved.getLockboxType(), saved.getCustomerId());
        return saved;
    }

    @Transactional
    public LockboxItem receiveItem(String lockboxNumber, LockboxItem item) {
        Lockbox lockbox = getLockbox(lockboxNumber);

        // Validate amount > 0
        if (item.getAmount() == null || item.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Lockbox item amount must be greater than zero", "INVALID_AMOUNT");
        }

        // Validate cheque number uniqueness if provided
        if (item.getChequeNumber() != null && !item.getChequeNumber().isBlank()) {
            boolean duplicate = itemRepository.findByLockboxIdOrderByCreatedAtDesc(lockbox.getId()).stream()
                    .anyMatch(existing -> item.getChequeNumber().equals(existing.getChequeNumber()));
            if (duplicate) {
                throw new BusinessException("Duplicate cheque number: " + item.getChequeNumber(), "DUPLICATE_CHEQUE");
            }
        }

        item.setLockboxId(lockbox.getId());
        item.setItemReference("LBI-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        item.setStatus("RECEIVED");

        // OCR confidence calculation based on available data
        if (lockbox.getOcrEnabled()) {
            item.setStatus("OCR_PROCESSED");
            boolean hasAmount = item.getAmount() != null && item.getAmount().compareTo(BigDecimal.ZERO) > 0;
            boolean hasChequeNumber = item.getChequeNumber() != null && !item.getChequeNumber().isBlank();

            if (hasAmount && hasChequeNumber) {
                item.setOcrConfidence(new BigDecimal("100"));
            } else if (hasAmount) {
                item.setOcrConfidence(new BigDecimal("80"));
            } else {
                item.setOcrConfidence(BigDecimal.ZERO);
            }
            log.debug("OCR processed: item={}, confidence={}%", item.getItemReference(), item.getOcrConfidence());
        }

        LockboxItem saved = itemRepository.save(item);
        log.info("AUDIT: Lockbox item received by {}: lockbox={}, item={}, amount={}, cheque={}, ocrConfidence={}",
                currentActorProvider.getCurrentActor(), lockboxNumber, saved.getItemReference(), saved.getAmount(),
                saved.getChequeNumber(), saved.getOcrConfidence());

        // Auto-deposit if enabled and OCR confidence is high
        if (lockbox.getAutoDeposit() && item.getOcrConfidence() != null
                && item.getOcrConfidence().compareTo(new BigDecimal("85")) >= 0) {
            saved.setStatus("DEPOSITED");
            saved.setDepositedAt(Instant.now());
            itemRepository.save(saved);
            log.info("AUDIT: Lockbox auto-deposit by {}: item={}, amount={}",
                    currentActorProvider.getCurrentActor(), saved.getItemReference(), saved.getAmount());
        }

        return saved;
    }

    @Transactional
    public LockboxItem markException(Long itemId, String reason) {
        LockboxItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("LockboxItem", "id", itemId));
        item.setStatus("EXCEPTION");
        item.setExceptionReason(reason);
        log.warn("AUDIT: Lockbox exception by {}: item={}, reason={}",
                currentActorProvider.getCurrentActor(), item.getItemReference(), reason);
        return itemRepository.save(item);
    }

    @Transactional
    public LockboxItem depositItem(Long itemId) {
        LockboxItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("LockboxItem", "id", itemId));
        if ("DEPOSITED".equals(item.getStatus())) {
            throw new BusinessException("Item already deposited: " + item.getItemReference(), "ALREADY_DEPOSITED");
        }
        item.setStatus("DEPOSITED");
        item.setDepositedAt(Instant.now());
        log.info("AUDIT: Lockbox item deposited by {}: item={}, amount={}",
                currentActorProvider.getCurrentActor(), item.getItemReference(), item.getAmount());
        return itemRepository.save(item);
    }

    public List<LockboxItem> getItems(String lockboxNumber, String status) {
        Lockbox lockbox = getLockbox(lockboxNumber);
        return status != null
                ? itemRepository.findByLockboxIdAndStatusOrderByCreatedAtDesc(lockbox.getId(), status)
                : itemRepository.findByLockboxIdOrderByCreatedAtDesc(lockbox.getId());
    }

    public Map<String, Object> getLockboxSummary(String lockboxNumber) {
        Lockbox lockbox = getLockbox(lockboxNumber);
        long received = itemRepository.countByLockboxIdAndStatus(lockbox.getId(), "RECEIVED");
        long deposited = itemRepository.countByLockboxIdAndStatus(lockbox.getId(), "DEPOSITED");
        long exceptions = itemRepository.countByLockboxIdAndStatus(lockbox.getId(), "EXCEPTION");
        return Map.of("lockbox", lockboxNumber, "received", received, "deposited", deposited, "exceptions", exceptions);
    }

    private Lockbox getLockbox(String number) {
        return lockboxRepository.findByLockboxNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("Lockbox", "lockboxNumber", number));
    }
}
