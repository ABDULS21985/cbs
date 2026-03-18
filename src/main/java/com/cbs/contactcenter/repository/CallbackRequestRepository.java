package com.cbs.contactcenter.repository;

import com.cbs.contactcenter.entity.CallbackRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CallbackRequestRepository extends JpaRepository<CallbackRequest, Long> {
    List<CallbackRequest> findByStatusOrderByPreferredTimeAsc(String status);
    List<CallbackRequest> findByAssignedAgentIdAndStatus(String agentId, String status);
    List<CallbackRequest> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
}
