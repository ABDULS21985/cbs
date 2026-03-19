package com.cbs.approval.repository;

import com.cbs.approval.entity.ApprovalRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequest, Long> {

    Page<ApprovalRequest> findByStatus(String status, Pageable pageable);

    Page<ApprovalRequest> findByRequestedBy(String requestedBy, Pageable pageable);

    Page<ApprovalRequest> findByApproverRole(String approverRole, Pageable pageable);

    Page<ApprovalRequest> findByApproverRoleAndStatus(String approverRole, String status, Pageable pageable);

    Page<ApprovalRequest> findByRequestedByAndStatusIn(String requestedBy, List<String> statuses, Pageable pageable);

    Page<ApprovalRequest> findByStatusIn(List<String> statuses, Pageable pageable);

    Optional<ApprovalRequest> findByRequestCode(String requestCode);

    long countByStatus(String status);

    @Query("SELECT a.status, COUNT(a) FROM ApprovalRequest a GROUP BY a.status")
    List<Object[]> countByStatusGrouped();

    @Query(value = "SELECT nextval('cbs.approval_request_code_seq')", nativeQuery = true)
    Long getNextCodeSequence();

    List<ApprovalRequest> findAllByIdIn(List<Long> ids);
}
