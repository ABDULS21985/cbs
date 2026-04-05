package com.cbs.bankdraft.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.bankdraft.entity.BankDraft;
import com.cbs.bankdraft.repository.BankDraftRepository;
import com.cbs.gl.service.GeneralLedgerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class BankDraftService {

    private final BankDraftRepository draftRepository;
    private final GeneralLedgerService generalLedgerService;
    private final CurrentActorProvider currentActorProvider;

    @Value("${cbs.bankdraft.gl.customer-account:1001-CUS-001}")
    private String customerAccountGlCode;

    @Value("${cbs.bankdraft.gl.draft-payable:2200-DD-001}")
    private String draftPayableGlCode;

    @Value("${cbs.bankdraft.gl.cash-clearing:1001-CLR-001}")
    private String cashClearingGlCode;

    @Transactional
    public BankDraft issue(BankDraft draft) {
        // Validate required fields
        if (draft.getAmount() == null || draft.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Draft amount must be greater than zero", "INVALID_DRAFT_AMOUNT");
        }
        if (draft.getCustomerId() == null) {
            throw new BusinessException("Customer ID is required", "MISSING_CUSTOMER_ID");
        }
        if (draft.getDebitAccountId() == null) {
            throw new BusinessException("Debit account ID is required", "MISSING_DEBIT_ACCOUNT");
        }
        if (draft.getPayeeName() == null || draft.getPayeeName().isBlank()) {
            throw new BusinessException("Payee name is required", "MISSING_PAYEE_NAME");
        }

        draft.setDraftNumber("DD-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        draft.setStatus("ISSUED");
        draft.setIssueDate(LocalDate.now());
        if (draft.getExpiryDate() == null) draft.setExpiryDate(LocalDate.now().plusMonths(6));
        draft.setSerialNumber("SER-" + System.currentTimeMillis());

        BankDraft saved = draftRepository.save(draft);

        // GL posting: Debit Customer Account, Credit Bank Draft Payable
        List<GeneralLedgerService.JournalLineRequest> journalLines = List.of(
                new GeneralLedgerService.JournalLineRequest(
                        customerAccountGlCode, saved.getAmount(), BigDecimal.ZERO,
                        saved.getCurrency(), BigDecimal.ONE,
                        "Bank draft issued to " + saved.getPayeeName() + " - " + saved.getDraftNumber(),
                        null, null, saved.getDebitAccountId(), saved.getCustomerId()),
                new GeneralLedgerService.JournalLineRequest(
                        draftPayableGlCode, BigDecimal.ZERO, saved.getAmount(),
                        saved.getCurrency(), BigDecimal.ONE,
                        "Draft payable - " + saved.getDraftNumber(),
                        null, null, null, saved.getCustomerId())
        );

        generalLedgerService.postJournal(
                "BANK_DRAFT",
                "Bank draft issued: " + saved.getDraftNumber(),
                "BANK_DRAFT",
                saved.getDraftNumber(),
                LocalDate.now(),
                currentActorProvider.getCurrentActor(),
                journalLines
        );

        log.info("Bank draft issued: number={}, type={}, payee={}, amount={} {}, customer={}",
                saved.getDraftNumber(), saved.getDraftType(), saved.getPayeeName(),
                saved.getAmount(), saved.getCurrency(), saved.getCustomerId());
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

        // GL posting: Debit Bank Draft Payable, Credit Cash/Clearing
        List<GeneralLedgerService.JournalLineRequest> journalLines = List.of(
                new GeneralLedgerService.JournalLineRequest(
                        draftPayableGlCode, draft.getAmount(), BigDecimal.ZERO,
                        draft.getCurrency(), BigDecimal.ONE,
                        "Draft payable settlement - " + draftNumber,
                        null, null, null, draft.getCustomerId()),
                new GeneralLedgerService.JournalLineRequest(
                        cashClearingGlCode, BigDecimal.ZERO, draft.getAmount(),
                        draft.getCurrency(), BigDecimal.ONE,
                        "Cash clearing - draft payment " + draftNumber,
                        null, null, null, null)
        );

        generalLedgerService.postJournal(
                "BANK_DRAFT",
                "Bank draft paid: " + draftNumber,
                "BANK_DRAFT",
                draftNumber + ":PAY",
                LocalDate.now(),
                currentActorProvider.getCurrentActor(),
                journalLines
        );

        BankDraft saved = draftRepository.save(draft);
        log.info("Bank draft paid: number={}, amount={} {}, customer={}",
                draftNumber, draft.getAmount(), draft.getCurrency(), draft.getCustomerId());
        return saved;
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

    public List<BankDraft> getAll() { return draftRepository.findAll(); }

    public List<BankDraft> getByCustomer(Long customerId) { return draftRepository.findByCustomerIdOrderByCreatedAtDesc(customerId); }

    private BankDraft getByNumber(String number) {
        return draftRepository.findByDraftNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("BankDraft", "draftNumber", number));
    }
}
