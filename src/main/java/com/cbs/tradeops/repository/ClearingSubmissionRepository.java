package com.cbs.tradeops.repository;

import com.cbs.tradeops.entity.ClearingSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClearingSubmissionRepository extends JpaRepository<ClearingSubmission, Long> {
    Optional<ClearingSubmission> findBySubmissionRef(String submissionRef);
    List<ClearingSubmission> findByStatusOrderBySubmittedAtAsc(String status);
}
