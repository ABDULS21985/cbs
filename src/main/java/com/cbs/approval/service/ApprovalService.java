package com.cbs.approval.service;

import com.cbs.approval.entity.ApprovalRequest;
import com.cbs.approval.repository.ApprovalRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
        // Delegated approvals are those with priority DELEGATED or where approverRole differs from original
        return repository.findByStatus(status, pageable);
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
        List<ApprovalRequest> requests = repository.findAllByIdIn(ids);
        Instant now = Instant.now();
        for (ApprovalRequest req : requests) {
            if ("PENDING".equals(req.getStatus())) {
                req.setStatus("APPROVED");
                req.setApprovedBy(approvedBy);
                req.setApprovedAt(now);
                req.setUpdatedAt(now);
            }
        }
        return repository.saveAll(requests);
    }
}
