package com.cbs.bankdraft.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.bankdraft.entity.BankDraft;
import com.cbs.bankdraft.repository.BankDraftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class BankDraftService {

    private final BankDraftRepository draftRepository;

    @Transactional
    public BankDraft issue(BankDraft draft) {
        draft.setDraftNumber("DD-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        draft.setStatus("ISSUED");
        draft.setIssueDate(LocalDate.now());
        if (draft.getExpiryDate() == null) draft.setExpiryDate(LocalDate.now().plusMonths(6));
        draft.setSerialNumber("SER-" + System.currentTimeMillis());

        BankDraft saved = draftRepository.save(draft);
        log.info("Bank draft issued: number={}, type={}, payee={}, amount={} {}",
                saved.getDraftNumber(), saved.getDraftType(), saved.getPayeeName(), saved.getAmount(), saved.getCurrency());
        return saved;
    }

    @Transactional
    public BankDraft present(String draftNumber) {
        BankDraft draft = getByNumber(draftNumber);
        if (!"ISSUED".equals(draft.getStatus()) && !"DISPATCHED".equals(draft.getStatus()))
            throw new BusinessException("Draft not in presentable state: " + draft.getStatus());
        if (draft.getExpiryDate() != null && LocalDate.now().isAfter(draft.getExpiryDate()))
            throw new BusinessException("Draft has expired on " + draft.getExpiryDate());

        draft.setStatus("PRESENTED");
        draft.setPresentedAt(Instant.now());
        draft.setUpdatedAt(Instant.now());
        log.info("Bank draft presented: number={}", draftNumber);
        return draftRepository.save(draft);
    }

    @Transactional
    public BankDraft pay(String draftNumber) {
        BankDraft draft = getByNumber(draftNumber);
        if (!"PRESENTED".equals(draft.getStatus()))
            throw new BusinessException("Draft must be PRESENTED before payment");
        draft.setStatus("PAID");
        draft.setPaidAt(Instant.now());
        draft.setUpdatedAt(Instant.now());
        log.info("Bank draft paid: number={}, amount={}", draftNumber, draft.getAmount());
        return draftRepository.save(draft);
    }

    @Transactional
    public BankDraft stopPayment(String draftNumber, String reason) {
        BankDraft draft = getByNumber(draftNumber);
        if ("PAID".equals(draft.getStatus())) throw new BusinessException("Cannot stop a paid draft");
        draft.setStatus("STOPPED");
        draft.setStopReason(reason);
        draft.setUpdatedAt(Instant.now());
        log.warn("Bank draft stopped: number={}, reason={}", draftNumber, reason);
        return draftRepository.save(draft);
    }

    @Transactional
    public BankDraft reissue(String draftNumber) {
        BankDraft original = getByNumber(draftNumber);
        if (!"STOPPED".equals(original.getStatus()) && !"LOST".equals(original.getStatus()) && !"EXPIRED".equals(original.getStatus()))
            throw new BusinessException("Only STOPPED/LOST/EXPIRED drafts can be reissued");

        BankDraft newDraft = BankDraft.builder()
                .customerId(original.getCustomerId()).debitAccountId(original.getDebitAccountId())
                .draftType(original.getDraftType()).payeeName(original.getPayeeName())
                .amount(original.getAmount()).currency(original.getCurrency())
                .issueBranchId(original.getIssueBranchId()).deliveryMethod(original.getDeliveryMethod())
                .deliveryAddress(original.getDeliveryAddress()).commissionAmount(original.getCommissionAmount())
                .build();

        BankDraft reissued = issue(newDraft);
        original.setReissuedAs(reissued.getDraftNumber());
        original.setStatus("REISSUED");
        draftRepository.save(original);
        log.info("Bank draft reissued: original={} → new={}", draftNumber, reissued.getDraftNumber());
        return reissued;
    }

    @Transactional
    public int expireOverdueDrafts() {
        List<BankDraft> expired = draftRepository.findExpiredDrafts();
        expired.forEach(d -> { d.setStatus("EXPIRED"); d.setUpdatedAt(Instant.now()); draftRepository.save(d); });
        if (!expired.isEmpty()) log.info("Expired {} overdue bank drafts", expired.size());
        return expired.size();
    }

    public List<BankDraft> getByCustomer(Long customerId) { return draftRepository.findByCustomerIdOrderByCreatedAtDesc(customerId); }

    private BankDraft getByNumber(String number) {
        return draftRepository.findByDraftNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("BankDraft", "draftNumber", number));
    }
}
