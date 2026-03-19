package com.cbs.lockbox.service;

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

    @Transactional
    public Lockbox createLockbox(Lockbox lockbox) {
        lockbox.setLockboxNumber("LBX-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        Lockbox saved = lockboxRepository.save(lockbox);
        log.info("Lockbox created: number={}, type={}, customer={}", saved.getLockboxNumber(), saved.getLockboxType(), saved.getCustomerId());
        return saved;
    }

    @Transactional
    public LockboxItem receiveItem(String lockboxNumber, LockboxItem item) {
        Lockbox lockbox = getLockbox(lockboxNumber);
        item.setLockboxId(lockbox.getId());
        item.setItemReference("LBI-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        item.setStatus("RECEIVED");

        // OCR confidence: requires OCR service integration
        if (lockbox.getOcrEnabled()) {
            item.setStatus("OCR_PROCESSED");
            item.setOcrConfidence(null); // TODO: set from real OCR service response
            log.debug("OCR processed: item={}, confidence={}%", item.getItemReference(), item.getOcrConfidence());
        }

        LockboxItem saved = itemRepository.save(item);
        log.info("Lockbox item received: lockbox={}, item={}, amount={}, cheque={}",
                lockboxNumber, saved.getItemReference(), saved.getAmount(), saved.getChequeNumber());

        // Auto-deposit if enabled and OCR confidence is high
        if (lockbox.getAutoDeposit() && item.getOcrConfidence() != null
                && item.getOcrConfidence().compareTo(new BigDecimal("85")) >= 0) {
            saved.setStatus("DEPOSITED");
            saved.setDepositedAt(Instant.now());
            itemRepository.save(saved);
            log.info("Lockbox auto-deposit: item={}, amount={}", saved.getItemReference(), saved.getAmount());
        }

        return saved;
    }

    @Transactional
    public LockboxItem markException(Long itemId, String reason) {
        LockboxItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("LockboxItem", "id", itemId));
        item.setStatus("EXCEPTION");
        item.setExceptionReason(reason);
        log.warn("Lockbox exception: item={}, reason={}", item.getItemReference(), reason);
        return itemRepository.save(item);
    }

    @Transactional
    public LockboxItem depositItem(Long itemId) {
        LockboxItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("LockboxItem", "id", itemId));
        item.setStatus("DEPOSITED");
        item.setDepositedAt(Instant.now());
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
