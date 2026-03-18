package com.cbs.branch.repository;

import com.cbs.branch.entity.BranchQueueTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface BranchQueueTicketRepository extends JpaRepository<BranchQueueTicket, Long> {
    List<BranchQueueTicket> findByBranchIdAndStatusOrderByIssuedAtAsc(Long branchId, String status);
    long countByBranchIdAndStatus(Long branchId, String status);
    List<BranchQueueTicket> findByBranchIdAndIssuedAtBetween(Long branchId, Instant start, Instant end);
}
