package com.cbs.account.service;

import com.cbs.account.dto.TransactionWorkflowDto;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.entity.TransactionReversalRequest;
import com.cbs.account.repository.TransactionReversalRequestRepository;
import com.cbs.approval.entity.ApprovalRequest;
import com.cbs.approval.repository.ApprovalRequestRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TransactionReversalWorkflowService {

    private static final BigDecimal DUAL_AUTH_THRESHOLD = new BigDecimal("1000000");

    private final TransactionService transactionService;
    private final AccountPostingService accountPostingService;
    private final TransactionReversalRequestRepository reversalRequestRepository;
    private final ApprovalRequestRepository approvalRequestRepository;
    private final CurrentActorProvider currentActorProvider;
    private final TransactionAuditService transactionAuditService;
    private final CbsProperties cbsProperties;

    public TransactionWorkflowDto.ReversalPreview preview(Long transactionId, TransactionWorkflowDto.ReversalRequest request) {
        TransactionJournal transaction = transactionService.getTransactionEntity(transactionId);
        boolean originalDebit = isDebitLike(transaction);
        String settlement = normalizeSettlement(request != null ? request.getRequestedSettlement() : null);
        String suspenseGl = resolveSuspenseGlCode();

        return TransactionWorkflowDto.ReversalPreview.builder()
                .transactionId(transaction.getId())
                .transactionRef(transaction.getTransactionRef())
                .originalAmount(transaction.getAmount())
                .originalAccountNumber(transaction.getAccount().getAccountNumber())
                .originalDirection(originalDebit ? "DEBIT" : "CREDIT")
                .reversalDirection(originalDebit ? "CREDIT" : "DEBIT")
                .customerAccountNumber(transaction.getAccount().getAccountNumber())
                .counterpartyAccountNumber(transaction.getContraAccountNumber())
                .glDebitAccount(originalDebit ? suspenseGl : transaction.getAccount().getAccountNumber())
                .glCreditAccount(originalDebit ? transaction.getAccount().getAccountNumber() : suspenseGl)
                .settlementTiming("NEXT_BUSINESS_DAY".equals(settlement) ? "Next Business Day" : "Immediate")
                .dualAuthorizationRequired(transaction.getAmount().compareTo(DUAL_AUTH_THRESHOLD) > 0)
                .build();
    }

    @Transactional
    public TransactionWorkflowDto.ReversalResult submit(Long transactionId, TransactionWorkflowDto.ReversalRequest request) {
        TransactionJournal transaction = transactionService.getTransactionEntity(transactionId);
        TransactionWorkflowDto.ReversalPreview preview = preview(transactionId, request);
        String actor = currentActorProvider.getCurrentActor();

        TransactionReversalRequest reversalRequest = TransactionReversalRequest.builder()
                .requestRef(nextReversalRequestRef())
                .transaction(transaction)
                .transactionRef(transaction.getTransactionRef())
                .amount(transaction.getAmount())
                .currencyCode(transaction.getCurrencyCode())
                .reasonCategory(nonBlank(request != null ? request.getReasonCategory() : null, "CUSTOMER_REQUEST"))
                .subReason(request != null ? request.getSubReason() : null)
                .notes(request != null ? request.getNotes() : null)
                .requestedSettlement(normalizeSettlement(request != null ? request.getRequestedSettlement() : null))
                .requestedBy(actor)
                .requestedAt(Instant.now())
                .status(preview.isDualAuthorizationRequired() ? "PENDING_APPROVAL" : "COMPLETED")
                .build();
        reversalRequest = reversalRequestRepository.save(reversalRequest);

        if (preview.isDualAuthorizationRequired()) {
            ApprovalRequest approvalRequest = ApprovalRequest.builder()
                    .requestCode(nextApprovalRequestCode())
                    .entityType("TRANSACTION_REVERSAL")
                    .entityId(reversalRequest.getId())
                    .requestedAction("APPROVE_REVERSAL")
                    .requestedBy(actor)
                    .approverRole("CBS_ADMIN")
                    .notes(nonBlank(request != null ? request.getNotes() : null,
                            "Transaction reversal requires second approval"))
                    .status("PENDING")
                    .priority("HIGH")
                    .build();
            approvalRequest = approvalRequestRepository.save(approvalRequest);
            reversalRequest.setApprovalRequest(approvalRequest);
            reversalRequest = reversalRequestRepository.save(reversalRequest);
            transactionAuditService.recordEvent(
                    transaction,
                    "REVERSAL_REQUESTED",
                    "Reversal " + reversalRequest.getRequestRef() + " submitted for approval",
                    transaction.getChannel() != null ? transaction.getChannel().name() : null,
                    Map.of("requestRef", reversalRequest.getRequestRef(), "approvalRequestCode", approvalRequest.getRequestCode())
            );
            return TransactionWorkflowDto.ReversalResult.builder()
                    .requestRef(reversalRequest.getRequestRef())
                    .status(reversalRequest.getStatus())
                    .approvalRequired(true)
                    .approvalRequestCode(approvalRequest.getRequestCode())
                    .message("Dual authorization required. Approval request routed to supervisor.")
                    .build();
        }

        return executeReversal(reversalRequest, actor);
    }

    @Transactional
    public TransactionWorkflowDto.ReversalResult approve(Long requestId) {
        TransactionReversalRequest request = reversalRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("TransactionReversalRequest", "id", requestId));
        if (!"PENDING_APPROVAL".equalsIgnoreCase(request.getStatus())) {
            throw new BusinessException("Only pending reversal requests can be approved", "INVALID_REVERSAL_REQUEST_STATE");
        }
        if (request.getApprovalRequest() != null) {
            request.getApprovalRequest().setStatus("APPROVED");
            request.getApprovalRequest().setApprovedBy(currentActorProvider.getCurrentActor());
            request.getApprovalRequest().setApprovedAt(Instant.now());
            request.getApprovalRequest().setUpdatedAt(Instant.now());
            approvalRequestRepository.save(request.getApprovalRequest());
        }
        return executeReversal(request, currentActorProvider.getCurrentActor());
    }

    @Transactional
    public TransactionWorkflowDto.ReversalResult reject(Long requestId, String reason) {
        TransactionReversalRequest request = reversalRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("TransactionReversalRequest", "id", requestId));
        request.setStatus("REJECTED");
        request.setRejectedBy(currentActorProvider.getCurrentActor());
        request.setRejectedAt(Instant.now());
        request.setRejectionReason(reason);
        if (request.getApprovalRequest() != null) {
            request.getApprovalRequest().setStatus("REJECTED");
            request.getApprovalRequest().setRejectedBy(currentActorProvider.getCurrentActor());
            request.getApprovalRequest().setRejectedAt(Instant.now());
            request.getApprovalRequest().setRejectionReason(reason);
            request.getApprovalRequest().setUpdatedAt(Instant.now());
            approvalRequestRepository.save(request.getApprovalRequest());
        }
        reversalRequestRepository.save(request);
        transactionAuditService.recordEvent(
                request.getTransaction(),
                "REVERSAL_REJECTED",
                "Reversal " + request.getRequestRef() + " rejected",
                request.getTransaction().getChannel() != null ? request.getTransaction().getChannel().name() : null,
                Map.of("requestRef", request.getRequestRef(), "reason", nonBlank(reason, "No reason supplied"))
        );
        return TransactionWorkflowDto.ReversalResult.builder()
                .requestRef(request.getRequestRef())
                .status("REJECTED")
                .approvalRequired(false)
                .message("Reversal request rejected")
                .build();
    }

    public AdviceDownload downloadAdvice(Long requestId) {
        TransactionReversalRequest request = reversalRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("TransactionReversalRequest", "id", requestId));
        if (!StringUtils.hasText(request.getAdvicePath())) {
            throw new BusinessException("No advice letter available for this reversal", "ADVICE_NOT_AVAILABLE");
        }
        try {
            Path path = Path.of(request.getAdvicePath());
            return new AdviceDownload(
                    Files.readAllBytes(path),
                    "reversal-advice-" + request.getRequestRef() + ".html",
                    "text/html"
            );
        } catch (Exception ex) {
            throw new BusinessException("Failed to load reversal advice: " + ex.getMessage(), "ADVICE_LOAD_FAILED");
        }
    }

    public org.springframework.data.domain.Page<TransactionWorkflowDto.ReversalRecord> listRequests(
            String status,
            boolean mine,
            org.springframework.data.domain.Pageable pageable
    ) {
        String normalizedStatus = StringUtils.hasText(status) ? status.trim().toUpperCase() : null;
        org.springframework.data.domain.Page<TransactionReversalRequest> page;
        if (mine) {
            String actor = currentActorProvider.getCurrentActor();
            page = StringUtils.hasText(normalizedStatus)
                    ? reversalRequestRepository.findByRequestedByAndStatusOrderByRequestedAtDesc(actor, normalizedStatus, pageable)
                    : reversalRequestRepository.findByRequestedByOrderByRequestedAtDesc(actor, pageable);
        } else {
            page = StringUtils.hasText(normalizedStatus)
                    ? reversalRequestRepository.findByStatusOrderByRequestedAtDesc(normalizedStatus, pageable)
                    : reversalRequestRepository.findAllByOrderByRequestedAtDesc(pageable);
        }
        return page.map(this::toRecord);
    }

    public TransactionWorkflowDto.ReversalRecord getRequest(Long requestId) {
        TransactionReversalRequest request = reversalRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("TransactionReversalRequest", "id", requestId));
        return toRecord(request);
    }

    public TransactionWorkflowDto.ReversalCounts getCounts() {
        return TransactionWorkflowDto.ReversalCounts.builder()
                .pendingApproval(reversalRequestRepository.countByStatus("PENDING_APPROVAL"))
                .completed(reversalRequestRepository.countByStatus("COMPLETED"))
                .rejected(reversalRequestRepository.countByStatus("REJECTED"))
                .build();
    }

    private TransactionWorkflowDto.ReversalResult executeReversal(TransactionReversalRequest request, String actor) {
        AccountPostingService.ReversalResult result = accountPostingService.reverseTransaction(
                request.getTransaction().getId(),
                buildReason(request)
        );
        request.setStatus("COMPLETED");
        request.setApprovedBy(actor);
        request.setApprovedAt(Instant.now());
        request.setReversalRef(result.reversalGroupRef());
        request.setAdvicePath(writeAdviceFile(request, result.reversalGroupRef()));
        reversalRequestRepository.save(request);
        transactionAuditService.recordEvent(
                request.getTransaction(),
                "REVERSAL_COMPLETED",
                "Reversal " + request.getRequestRef() + " completed",
                request.getTransaction().getChannel() != null ? request.getTransaction().getChannel().name() : null,
                Map.of("requestRef", request.getRequestRef(), "reversalRef", result.reversalGroupRef())
        );
        return TransactionWorkflowDto.ReversalResult.builder()
                .requestRef(request.getRequestRef())
                .status("COMPLETED")
                .reversalRef(result.reversalGroupRef())
                .approvalRequired(false)
                .adviceDownloadUrl("/api/v1/transactions/reversals/" + request.getId() + "/advice")
                .message("Transaction reversed successfully")
                .build();
    }

    private String writeAdviceFile(TransactionReversalRequest request, String reversalRef) {
        try {
            Path directory = Path.of("build", "reports", "transactions", "reversals");
            Files.createDirectories(directory);
            Path file = directory.resolve(request.getRequestRef() + ".html");
            String html = """
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                      <meta charset="UTF-8" />
                      <title>Reversal Advice %s</title>
                      <style>
                        body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
                        .card { max-width: 760px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px; }
                        .brand { color: #1d4ed8; font-size: 26px; font-weight: 700; }
                        .muted { color: #6b7280; font-size: 12px; }
                        table { width: 100%%; border-collapse: collapse; margin-top: 18px; }
                        td { padding: 8px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
                        td:first-child { width: 34%%; color: #6b7280; }
                      </style>
                    </head>
                    <body>
                      <div class="card">
                        <div class="brand">BellBank</div>
                        <p class="muted">Transaction reversal advice</p>
                        <table>
                          <tr><td>Reversal Request</td><td>%s</td></tr>
                          <tr><td>Original Transaction</td><td>%s</td></tr>
                          <tr><td>Reversal Reference</td><td>%s</td></tr>
                          <tr><td>Amount</td><td>%s %s</td></tr>
                          <tr><td>Reason</td><td>%s</td></tr>
                          <tr><td>Approved By</td><td>%s</td></tr>
                          <tr><td>Approved At</td><td>%s</td></tr>
                        </table>
                      </div>
                    </body>
                    </html>
                    """.formatted(
                    HtmlUtils.htmlEscape(request.getRequestRef()),
                    HtmlUtils.htmlEscape(request.getRequestRef()),
                    HtmlUtils.htmlEscape(request.getTransactionRef()),
                    HtmlUtils.htmlEscape(reversalRef),
                    request.getAmount().toPlainString(),
                    HtmlUtils.htmlEscape(request.getCurrencyCode()),
                    HtmlUtils.htmlEscape(buildReason(request)),
                    HtmlUtils.htmlEscape(nonBlank(request.getApprovedBy(), request.getRequestedBy())),
                    HtmlUtils.htmlEscape(DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(
                            request.getApprovedAt().atZone(ZoneId.of(cbsProperties.getDeployment().getTimezone())).toOffsetDateTime()))
            );
            Files.writeString(file, html, StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            return file.toAbsolutePath().toString();
        } catch (Exception ex) {
            throw new BusinessException("Failed to generate reversal advice: " + ex.getMessage(), "REVERSAL_ADVICE_FAILED");
        }
    }

    private String buildReason(TransactionReversalRequest request) {
        List<String> reasonParts = new java.util.ArrayList<>();
        reasonParts.add(nonBlank(request.getReasonCategory(), "REVERSAL"));
        if (StringUtils.hasText(request.getSubReason())) {
            reasonParts.add(request.getSubReason());
        }
        if (StringUtils.hasText(request.getNotes())) {
            reasonParts.add(request.getNotes());
        }
        return String.join(" | ", reasonParts);
    }

    private String nextReversalRequestRef() {
        return "RVL-" + LocalDate.now().getYear() + "-" + String.format("%06d", reversalRequestRepository.nextRequestSequence());
    }

    private String nextApprovalRequestCode() {
        return "APR-" + LocalDate.now().getYear() + "-" + String.format("%06d", approvalRequestRepository.getNextCodeSequence());
    }

    private boolean isDebitLike(TransactionJournal transaction) {
        TransactionType type = transaction.getTransactionType() == TransactionType.REVERSAL && transaction.getReversedTransaction() != null
                ? transaction.getReversedTransaction().getTransactionType()
                : transaction.getTransactionType();
        return switch (type) {
            case DEBIT, FEE_DEBIT, TRANSFER_OUT, LIEN_PLACEMENT -> true;
            default -> false;
        };
    }

    private String resolveSuspenseGlCode() {
        String glCode = cbsProperties.getLedger().getExternalClearingGlCode();
        if (!StringUtils.hasText(glCode)) {
            return "EXTERNAL_CLEARING";
        }
        return glCode;
    }

    private String normalizeSettlement(String settlement) {
        if (!StringUtils.hasText(settlement)) {
            return "IMMEDIATE";
        }
        return settlement.trim().toUpperCase();
    }

    private String nonBlank(String value, String fallback) {
        return StringUtils.hasText(value) ? value.trim() : fallback;
    }

    private TransactionWorkflowDto.ReversalRecord toRecord(TransactionReversalRequest request) {
        TransactionJournal transaction = request.getTransaction();
        return TransactionWorkflowDto.ReversalRecord.builder()
                .id(request.getId())
                .requestRef(request.getRequestRef())
                .transactionId(transaction.getId())
                .transactionRef(request.getTransactionRef())
                .accountNumber(transaction.getAccount().getAccountNumber())
                .accountName(transaction.getAccount().getAccountName())
                .amount(request.getAmount())
                .currencyCode(request.getCurrencyCode())
                .reasonCategory(request.getReasonCategory())
                .subReason(request.getSubReason())
                .notes(request.getNotes())
                .requestedSettlement(request.getRequestedSettlement())
                .status(request.getStatus())
                .requestedBy(request.getRequestedBy())
                .requestedAt(request.getRequestedAt())
                .approvedBy(request.getApprovedBy())
                .approvedAt(request.getApprovedAt())
                .rejectedBy(request.getRejectedBy())
                .rejectedAt(request.getRejectedAt())
                .rejectionReason(request.getRejectionReason())
                .reversalRef(request.getReversalRef())
                .approvalRequestCode(request.getApprovalRequest() != null ? request.getApprovalRequest().getRequestCode() : null)
                .adviceDownloadUrl(StringUtils.hasText(request.getAdvicePath()) ? "/api/v1/transactions/reversals/" + request.getId() + "/advice" : null)
                .build();
    }

    public record AdviceDownload(byte[] content, String filename, String contentType) {
    }
}
