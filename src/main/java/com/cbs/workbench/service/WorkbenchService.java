package com.cbs.workbench.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.workbench.entity.StaffWorkbenchSession;
import com.cbs.workbench.repository.StaffWorkbenchSessionRepository;
import com.cbs.customer.service.CustomerService;
import com.cbs.account.service.AccountService;
import com.cbs.customer.dto.CustomerResponse;
import com.cbs.account.dto.AccountResponse;
import com.cbs.account.dto.TransactionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class WorkbenchService {

    private final StaffWorkbenchSessionRepository sessionRepository;
    private final CurrentActorProvider currentActorProvider;
    private final CustomerService customerService;
    private final AccountService accountService;

    private static final Set<String> VALID_WORKBENCH_TYPES = Set.of(
            "TELLER", "RELATIONSHIP_MANAGER", "SUPERVISOR", "BACK_OFFICE", "COMPLIANCE"
    );

    @Transactional
    public StaffWorkbenchSession createSession(String staffUserId, String staffName, String workbenchType) {
        if (staffUserId == null || staffUserId.isBlank()) {
            throw new BusinessException("Staff user ID is required.", "INVALID_STAFF_ID");
        }
        if (workbenchType == null || workbenchType.isBlank()) {
            workbenchType = "TELLER";
        }
        if (!VALID_WORKBENCH_TYPES.contains(workbenchType)) {
            throw new BusinessException(
                    "Invalid workbench type: " + workbenchType + ". Valid: " + VALID_WORKBENCH_TYPES,
                    "INVALID_WORKBENCH_TYPE"
            );
        }

        // Limit active sessions per staff to prevent session accumulation
        List<StaffWorkbenchSession> existingSessions = sessionRepository
                .findByStaffUserIdAndSessionStatus(staffUserId, "ACTIVE");
        if (existingSessions.size() >= 3) {
            throw new BusinessException(
                    "Staff " + staffUserId + " already has " + existingSessions.size()
                            + " active sessions. Please close existing sessions first.",
                    "MAX_SESSIONS_REACHED"
            );
        }

        StaffWorkbenchSession session = StaffWorkbenchSession.builder()
                .sessionId("WB-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase())
                .staffUserId(staffUserId)
                .staffName(staffName)
                .workbenchType(workbenchType)
                .sessionStatus("ACTIVE")
                .startedAt(Instant.now())
                .lastActivityAt(Instant.now())
                .build();

        StaffWorkbenchSession saved = sessionRepository.save(session);
        log.info("Workbench session created: sessionId={}, staff={}, type={}",
                saved.getSessionId(), staffUserId, workbenchType);
        return saved;
    }

    @Transactional
    public StaffWorkbenchSession loadCustomerContext(String sessionId, Long customerId) {
        StaffWorkbenchSession s = getSession(sessionId);

        if (!"ACTIVE".equals(s.getSessionStatus())) {
            throw new BusinessException("Session " + sessionId + " is not active.", "SESSION_NOT_ACTIVE");
        }
        if (customerId == null) {
            throw new BusinessException("Customer ID is required.", "INVALID_CUSTOMER_ID");
        }

        s.setCustomerId(customerId);
        s.setLastActivityAt(Instant.now());

        // Build customer 360-view context
        Map<String, Object> context = new LinkedHashMap<>();
        try {
            CustomerResponse customer = customerService.getCustomer360(customerId);
            context.put("customerName", customer.getDisplayName());
            context.put("cifNumber", customer.getCifNumber());
            context.put("customerType", customer.getCustomerType());
            context.put("customerStatus", customer.getStatus());
            context.put("riskRating", customer.getRiskRating());
        } catch (Exception e) {
            log.warn("Failed to load customer data for customerId={}: {}", customerId, e.getMessage());
            context.put("customerLoadError", e.getMessage());
        }

        try {
            List<AccountResponse> accounts = accountService.getCustomerAccounts(customerId);
            List<Map<String, Object>> accountSummaries = new ArrayList<>();
            for (AccountResponse account : accounts) {
                Map<String, Object> summary = new LinkedHashMap<>();
                summary.put("accountNumber", account.getAccountNumber());
                summary.put("accountName", account.getAccountName());
                summary.put("accountType", account.getAccountType());
                summary.put("status", account.getStatus());
                summary.put("availableBalance", account.getAvailableBalance());
                summary.put("currency", account.getCurrencyCode());
                accountSummaries.add(summary);
            }
            context.put("accounts", accountSummaries);
            context.put("totalAccounts", accounts.size());
        } catch (Exception e) {
            log.warn("Failed to load accounts for customerId={}: {}", customerId, e.getMessage());
            context.put("accountLoadError", e.getMessage());
        }

        try {
            Page<TransactionResponse> recentTxPage = customerService.getCustomerTransactions(customerId, 0, 10);
            List<Map<String, Object>> txSummaries = new ArrayList<>();
            for (TransactionResponse tx : recentTxPage.getContent()) {
                Map<String, Object> txMap = new LinkedHashMap<>();
                txMap.put("reference", tx.getTransactionRef());
                txMap.put("type", tx.getTransactionType());
                txMap.put("amount", tx.getAmount());
                txMap.put("valueDate", tx.getValueDate());
                txMap.put("narration", tx.getNarration());
                txSummaries.add(txMap);
            }
            context.put("recentTransactions", txSummaries);
        } catch (Exception e) {
            log.warn("Failed to load transactions for customerId={}: {}", customerId, e.getMessage());
            context.put("transactionLoadError", e.getMessage());
        }

        s.setActiveContext(context);

        StaffWorkbenchSession saved = sessionRepository.save(s);
        log.info("Customer context loaded: sessionId={}, customerId={}, staff={}",
                sessionId, customerId, s.getStaffUserId());
        return saved;
    }

    @Transactional
    public StaffWorkbenchSession addTask(String sessionId, String taskType, String taskDescription, String priority) {
        StaffWorkbenchSession s = getSession(sessionId);
        if (!"ACTIVE".equals(s.getSessionStatus())) {
            throw new BusinessException("Session " + sessionId + " is not active.", "SESSION_NOT_ACTIVE");
        }
        if (taskType == null || taskType.isBlank()) {
            throw new BusinessException("Task type is required.", "INVALID_TASK_TYPE");
        }

        Map<String, Object> context = s.getActiveContext() != null
                ? new LinkedHashMap<>(s.getActiveContext())
                : new LinkedHashMap<>();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> taskQueue = context.containsKey("taskQueue")
                ? new ArrayList<>((List<Map<String, Object>>) context.get("taskQueue"))
                : new ArrayList<>();

        Map<String, Object> task = new LinkedHashMap<>();
        task.put("taskId", "T-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        task.put("taskType", taskType);
        task.put("description", taskDescription);
        task.put("priority", priority != null ? priority : "NORMAL");
        task.put("status", "PENDING");
        task.put("createdAt", Instant.now().toString());
        task.put("createdBy", currentActorProvider.getCurrentActor());
        taskQueue.add(task);

        context.put("taskQueue", taskQueue);
        s.setActiveContext(context);
        s.setLastActivityAt(Instant.now());

        StaffWorkbenchSession saved = sessionRepository.save(s);
        log.info("Task added to session: sessionId={}, taskType={}, by={}",
                sessionId, taskType, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public StaffWorkbenchSession endSession(String sessionId) {
        StaffWorkbenchSession s = getSession(sessionId);
        if ("TERMINATED".equals(s.getSessionStatus())) {
            throw new BusinessException("Session " + sessionId + " is already terminated.", "ALREADY_TERMINATED");
        }
        s.setSessionStatus("TERMINATED");
        s.setEndedAt(Instant.now());

        StaffWorkbenchSession saved = sessionRepository.save(s);
        long durationSec = s.getStartedAt() != null
                ? Duration.between(s.getStartedAt(), Instant.now()).getSeconds()
                : 0;
        log.info("Workbench session ended: sessionId={}, staff={}, duration={}s",
                sessionId, s.getStaffUserId(), durationSec);
        return saved;
    }

    public List<StaffWorkbenchSession> getAllSessions() {
        return sessionRepository.findAll();
    }

    public List<StaffWorkbenchSession> getActiveSessions(String staffUserId) {
        if (staffUserId == null || staffUserId.isBlank()) {
            throw new BusinessException("Staff user ID is required.", "INVALID_STAFF_ID");
        }
        return sessionRepository.findByStaffUserIdAndSessionStatus(staffUserId, "ACTIVE");
    }

    private StaffWorkbenchSession getSession(String sessionId) {
        return sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("StaffWorkbenchSession", "sessionId", sessionId));
    }
}
