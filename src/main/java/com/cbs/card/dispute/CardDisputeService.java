package com.cbs.card.dispute;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CardDisputeService {

    private final CardDisputeRepository disputeRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;
    private final CurrentActorProvider currentActorProvider;

    /**
     * Initiates a dispute with scheme-compliant deadlines.
     * Visa: 120 days from transaction date to file.
     * Mastercard: 120 days from transaction / 540 days for fraud.
     */
    @Transactional
    public CardDispute initiateDispute(Long cardId, Long customerId, Long accountId, Long transactionId,
                                         String transactionRef, LocalDate transactionDate,
                                         BigDecimal transactionAmount, String transactionCurrency,
                                         String merchantName, String merchantId,
                                         DisputeType disputeType, String disputeReason,
                                         BigDecimal disputeAmount, String cardScheme) {
        // Calculate scheme-compliant deadlines
        int filingDays = disputeType == DisputeType.FRAUD ? 540 : 120;
        LocalDate filingDeadline = transactionDate.plusDays(filingDays);
        LocalDate responseDeadline = LocalDate.now().plusDays(45); // Scheme response window
        LocalDate arbitrationDeadline = LocalDate.now().plusDays(90);

        Long seq = disputeRepository.getNextDisputeSequence();
        String ref = String.format("DSP%012d", seq);
        String createdBy = currentActorProvider.getCurrentActor();

        CardDispute dispute = CardDispute.builder()
                .disputeRef(ref).cardId(cardId).customerId(customerId).accountId(accountId)
                .transactionId(transactionId).transactionRef(transactionRef)
                .transactionDate(transactionDate).transactionAmount(transactionAmount)
                .transactionCurrency(transactionCurrency)
                .merchantName(merchantName).merchantId(merchantId)
                .disputeType(disputeType).disputeReason(disputeReason)
                .disputeAmount(disputeAmount).disputeCurrency(transactionCurrency)
                .cardScheme(cardScheme)
                .filingDeadline(filingDeadline).responseDeadline(responseDeadline)
                .arbitrationDeadline(arbitrationDeadline)
                .status(DisputeStatus.INITIATED).createdBy(createdBy).build();

        dispute.addTimelineEntry("Dispute initiated", null, DisputeStatus.INITIATED, createdBy, disputeReason);

        CardDispute saved = disputeRepository.save(dispute);
        log.info("Dispute initiated: ref={}, type={}, amount={}, merchant={}, scheme={}",
                ref, disputeType, disputeAmount, merchantName, cardScheme);
        return saved;
    }

    /**
     * Issues provisional credit to the cardholder while investigation is ongoing.
     * Regulation E (US) / scheme rules require this within 10 business days for most disputes.
     */
    @Transactional
    public CardDispute issueProvisionalCredit(Long disputeId) {
        CardDispute dispute = findDisputeOrThrow(disputeId);
        String performedBy = currentActorProvider.getCurrentActor();

        if (dispute.getProvisionalCreditAmount() != null) {
            throw new BusinessException("Provisional credit already issued", "PROV_CREDIT_EXISTS");
        }

        Account account = accountRepository.findById(dispute.getAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", dispute.getAccountId()));

        accountPostingService.postCredit(
                account,
                TransactionType.CREDIT,
                dispute.getDisputeAmount(),
                "Provisional credit " + dispute.getDisputeRef(),
                TransactionChannel.SYSTEM,
                "DISPUTE:" + dispute.getDisputeRef() + ":PROV");

        dispute.setProvisionalCreditAmount(dispute.getDisputeAmount());
        dispute.setProvisionalCreditDate(LocalDate.now());

        DisputeStatus prev = dispute.getStatus();
        dispute.setStatus(DisputeStatus.INVESTIGATION);
        dispute.addTimelineEntry("Provisional credit issued: " + dispute.getDisputeAmount(),
                prev, DisputeStatus.INVESTIGATION, performedBy, null);

        log.info("Provisional credit issued: dispute={}, amount={}", dispute.getDisputeRef(), dispute.getDisputeAmount());
        return disputeRepository.save(dispute);
    }

    /**
     * Files a chargeback with the card scheme (Visa/Mastercard).
     */
    @Transactional
    public CardDispute fileChargeback(Long disputeId, String schemeCaseId, String schemeReasonCode) {
        CardDispute dispute = findDisputeOrThrow(disputeId);
        String performedBy = currentActorProvider.getCurrentActor();

        if (dispute.getStatus() != DisputeStatus.INITIATED && dispute.getStatus() != DisputeStatus.INVESTIGATION) {
            throw new BusinessException("Dispute must be in INITIATED or INVESTIGATION to file chargeback", "INVALID_STATE");
        }

        DisputeStatus prev = dispute.getStatus();
        dispute.setSchemeCaseId(schemeCaseId);
        dispute.setSchemeReasonCode(schemeReasonCode);
        dispute.setStatus(DisputeStatus.CHARGEBACK_FILED);
        dispute.addTimelineEntry("Chargeback filed: case=" + schemeCaseId + " reason=" + schemeReasonCode,
                prev, DisputeStatus.CHARGEBACK_FILED, performedBy, null);

        log.info("Chargeback filed: dispute={}, case={}, reason={}", dispute.getDisputeRef(), schemeCaseId, schemeReasonCode);
        return disputeRepository.save(dispute);
    }

    /**
     * Records merchant representment (merchant disputes the chargeback).
     */
    @Transactional
    public CardDispute recordRepresentment(Long disputeId, String merchantResponse) {
        CardDispute dispute = findDisputeOrThrow(disputeId);
        String performedBy = currentActorProvider.getCurrentActor();

        if (dispute.getStatus() != DisputeStatus.CHARGEBACK_FILED) {
            throw new BusinessException("Chargeback must be filed before representment", "INVALID_STATE");
        }

        DisputeStatus prev = dispute.getStatus();
        dispute.setMerchantResponse(merchantResponse);
        dispute.setMerchantResponseDate(LocalDate.now());
        dispute.setStatus(DisputeStatus.REPRESENTMENT);
        dispute.addTimelineEntry("Merchant representment received", prev, DisputeStatus.REPRESENTMENT, performedBy, merchantResponse);

        return disputeRepository.save(dispute);
    }

    /**
     * Escalates to pre-arbitration or arbitration.
     */
    @Transactional
    public CardDispute escalateToArbitration(Long disputeId, boolean preArbitration, String notes) {
        CardDispute dispute = findDisputeOrThrow(disputeId);
        String performedBy = currentActorProvider.getCurrentActor();

        DisputeStatus prev = dispute.getStatus();
        DisputeStatus next = preArbitration ? DisputeStatus.PRE_ARBITRATION : DisputeStatus.ARBITRATION;
        dispute.setStatus(next);
        dispute.addTimelineEntry("Escalated to " + next, prev, next, performedBy, notes);

        return disputeRepository.save(dispute);
    }

    /**
     * Resolves the dispute (customer or merchant favour, split, withdrawn).
     */
    @Transactional
    public CardDispute resolveDispute(Long disputeId, String resolutionType, BigDecimal resolutionAmount,
                                        String notes) {
        CardDispute dispute = findDisputeOrThrow(disputeId);
        String performedBy = currentActorProvider.getCurrentActor();

        DisputeStatus prev = dispute.getStatus();
        DisputeStatus resolved = "CUSTOMER_FAVOUR".equals(resolutionType) ?
                DisputeStatus.RESOLVED_CUSTOMER :
                "WITHDRAWN".equals(resolutionType) ? DisputeStatus.WITHDRAWN : DisputeStatus.RESOLVED_MERCHANT;

        dispute.setResolutionType(resolutionType);
        dispute.setResolutionAmount(resolutionAmount);
        dispute.setResolutionDate(LocalDate.now());
        dispute.setResolutionNotes(notes);
        dispute.setStatus(resolved);

        // If resolved in merchant's favour and provisional credit was issued, reverse it
        if (resolved == DisputeStatus.RESOLVED_MERCHANT && dispute.getProvisionalCreditAmount() != null
                && !Boolean.TRUE.equals(dispute.getProvisionalCreditReversed())) {
            Account account = accountRepository.findById(dispute.getAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Account", "id", dispute.getAccountId()));
            accountPostingService.postDebit(
                    account,
                    TransactionType.DEBIT,
                    dispute.getProvisionalCreditAmount(),
                    "Provisional credit reversal " + dispute.getDisputeRef(),
                    TransactionChannel.SYSTEM,
                    "DISPUTE:" + dispute.getDisputeRef() + ":REV");
            dispute.setProvisionalCreditReversed(true);
            log.info("Provisional credit reversed: dispute={}, amount={}", dispute.getDisputeRef(), dispute.getProvisionalCreditAmount());
        }

        dispute.addTimelineEntry("Resolved: " + resolutionType + " amount=" + resolutionAmount,
                prev, resolved, performedBy, notes);

        log.info("Dispute resolved: ref={}, resolution={}, amount={}", dispute.getDisputeRef(), resolutionType, resolutionAmount);
        return disputeRepository.save(dispute);
    }

    /**
     * Checks for SLA breaches and flags them.
     */
    @Transactional
    public int checkSlaBreaches() {
        List<CardDispute> breached = disputeRepository.findSlaBreached(LocalDate.now());
        for (CardDispute d : breached) {
            d.setIsSlaBreached(true);
            disputeRepository.save(d);
        }
        if (!breached.isEmpty()) log.warn("Dispute SLA breached: {} cases", breached.size());
        return breached.size();
    }

    public CardDispute getDispute(Long id) { return findDisputeOrThrow(id); }

    public Page<CardDispute> getCustomerDisputes(Long customerId, Pageable pageable) {
        return disputeRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable);
    }

    public Page<CardDispute> getByStatus(DisputeStatus status, Pageable pageable) {
        return disputeRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
    }

    public DisputeDashboard getDashboard() {
        return new DisputeDashboard(
                disputeRepository.countByStatus(DisputeStatus.INITIATED),
                disputeRepository.countByStatus(DisputeStatus.INVESTIGATION),
                disputeRepository.countByStatus(DisputeStatus.CHARGEBACK_FILED),
                disputeRepository.countByStatus(DisputeStatus.REPRESENTMENT),
                disputeRepository.countByStatus(DisputeStatus.PRE_ARBITRATION) + disputeRepository.countByStatus(DisputeStatus.ARBITRATION));
    }

    private CardDispute findDisputeOrThrow(Long id) {
        return disputeRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("CardDispute", "id", id));
    }

    public record DisputeDashboard(long initiated, long investigation, long chargebackFiled, long representment, long arbitration) {}
}
