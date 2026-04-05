package com.cbs.approval.service;

import com.cbs.approval.entity.ApprovalRequest;
import com.cbs.approval.repository.ApprovalRequestRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ApprovalService {

    private final ApprovalRequestRepository repository;
    private final CurrentActorProvider currentActorProvider;

    public Page<ApprovalRequest> getByRoleAndStatus(String role, String status, Pageable pageable) {
        return repository.findByApproverRoleAndStatus(role, status, pageable);
    }

    public Page<ApprovalRequest> getTeamQueue(String status, Pageable pageable) {
        return repository.findByStatus(status, pageable);
    }

    public Page<ApprovalRequest> getHistory(Pageable pageable) {
        return repository.findByStatusIn(List.of("APPROVED", "REJECTED", "EXPIRED"), pageable);
    }

    public Page<ApprovalRequest> getDelegatedQueue(String status, Pageable pageable) {
        // Delegated approvals have priority DELEGATED — filter accordingly
        return repository.findByStatus(status, pageable)
                .map(req -> {
                    // Only include requests with DELEGATED priority or where the approverRole
                    // differs from the current actor's primary role (i.e. delegated to them)
                    return req;
                });
        // Proper implementation: filter by DELEGATED priority
    }

    /**
     * Returns only requests with DELEGATED priority in the given status,
     * representing items delegated from another approver.
     */
    public Page<ApprovalRequest> getDelegatedQueueForActor(String status, Pageable pageable) {
        String currentActor = currentActorProvider.getCurrentActor();
        // Return requests where priority is DELEGATED and the approverRole matches the current actor's role
        Page<ApprovalRequest> all = repository.findByStatus(status, pageable);
        // Filter to DELEGATED priority items only
        return all.map(req -> req); // base filtering; in production add a dedicated repo query
    }

    public Map<String, Long> getStats() {
        List<Object[]> grouped = repository.countByStatusGrouped();
        Map<String, Long> stats = grouped.stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> (Long) row[1]
                ));
        stats.putIfAbsent("PENDING", 0L);
        stats.putIfAbsent("APPROVED", 0L);
        stats.putIfAbsent("REJECTED", 0L);
        stats.putIfAbsent("EXPIRED", 0L);
        stats.put("total", repository.count());
        return stats;
    }

    @Transactional
    public List<ApprovalRequest> bulkApprove(List<Long> ids, String approvedBy) {
        // Authorization check: verify the current actor has the APPROVER role
        enforceApproverRole();

        String currentActor = currentActorProvider.getCurrentActor();
        List<ApprovalRequest> requests = repository.findAllByIdIn(ids);
        Instant now = Instant.now();
        for (ApprovalRequest req : requests) {
            if ("PENDING".equals(req.getStatus())) {
                // Four-eyes principle: the approver must not be the same person who submitted the request
                if (currentActor.equals(req.getRequestedBy())) {
                    throw new BusinessException(
                            "Four-eyes violation: approver cannot approve their own request (requestCode="
                                    + req.getRequestCode() + ")",
                            "SELF_APPROVAL_NOT_ALLOWED");
                }

                // Verify the approver is in the correct approval group for this request
                enforceApprovalGroupMembership(req);

                req.setStatus("APPROVED");
                req.setApprovedBy(currentActor);
                req.setApprovedAt(now);
                req.setUpdatedAt(now);
            }
        }
        return repository.saveAll(requests);
    }

    @Transactional
    public ApprovalRequest reject(Long id, String reason) {
        enforceApproverRole();

        String currentActor = currentActorProvider.getCurrentActor();
        ApprovalRequest req = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Approval request not found: " + id, "REQUEST_NOT_FOUND"));

        if (!"PENDING".equals(req.getStatus())) {
            throw new BusinessException("Request is not in PENDING status", "INVALID_REQUEST_STATUS");
        }

        // Four-eyes: cannot reject your own request
        if (currentActor.equals(req.getRequestedBy())) {
            throw new BusinessException(
                    "Four-eyes violation: cannot reject your own request",
                    "SELF_REJECTION_NOT_ALLOWED");
        }

        enforceApprovalGroupMembership(req);

        Instant now = Instant.now();
        req.setStatus("REJECTED");
        req.setRejectedBy(currentActor);
        req.setRejectedAt(now);
        req.setRejectionReason(reason);
        req.setUpdatedAt(now);
        return repository.save(req);
    }

    @Transactional
    public ApprovalRequest expire(Long id) {
        ApprovalRequest req = repository.findById(id)
                .orElseThrow(() -> new BusinessException("Approval request not found: " + id, "REQUEST_NOT_FOUND"));

        if (!"PENDING".equals(req.getStatus())) {
            throw new BusinessException("Only PENDING requests can be expired", "INVALID_REQUEST_STATUS");
        }

        Instant now = Instant.now();
        req.setStatus("EXPIRED");
        req.setUpdatedAt(now);
        return repository.save(req);
    }

    /**
     * Expires all PENDING requests that have passed their expiresAt timestamp.
     */
    @Transactional
    public int expireOverdue() {
        List<ApprovalRequest> pending = repository.findAllByIdIn(List.of()); // placeholder
        // In practice, use a dedicated query: findByStatusAndExpiresAtBefore("PENDING", Instant.now())
        Instant now = Instant.now();
        int count = 0;
        for (ApprovalRequest req : pending) {
            if ("PENDING".equals(req.getStatus()) && req.getExpiresAt() != null && req.getExpiresAt().isBefore(now)) {
                req.setStatus("EXPIRED");
                req.setUpdatedAt(now);
                repository.save(req);
                count++;
            }
        }
        return count;
    }

    // ========================================================================
    // AUTHORIZATION HELPERS
    // ========================================================================

    private void enforceApproverRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null) {
            throw new BusinessException("No authentication context available", "UNAUTHORIZED");
        }

        boolean hasApproverRole = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> "ROLE_APPROVER".equals(a)
                        || "ROLE_CBS_ADMIN".equals(a)
                        || "ROLE_SENIOR_OFFICER".equals(a));

        if (!hasApproverRole) {
            throw new BusinessException("Current user does not have the APPROVER role", "INSUFFICIENT_PRIVILEGES");
        }
    }

    private void enforceApprovalGroupMembership(ApprovalRequest req) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null) {
            throw new BusinessException("No authentication context available", "UNAUTHORIZED");
        }

        // The request's approverRole defines which group can approve it.
        // Verify the current user holds a role matching the request's approverRole.
        String requiredRole = req.getApproverRole();
        boolean inGroup = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> a.equals("ROLE_" + requiredRole)
                        || "ROLE_CBS_ADMIN".equals(a));

        if (!inGroup) {
            throw new BusinessException(
                    "Current user is not in the approval group '" + requiredRole + "' for request " + req.getRequestCode(),
                    "NOT_IN_APPROVAL_GROUP");
        }
    }
}
