package com.cbs.shariah.repository;

import com.cbs.shariah.entity.ReviewRequestStatus;
import com.cbs.shariah.entity.SsbReviewRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface SsbReviewRequestRepository extends JpaRepository<SsbReviewRequest, Long> {

    Optional<SsbReviewRequest> findByRequestCode(String requestCode);

    boolean existsByLinkedFatwaIdAndStatus(Long linkedFatwaId, ReviewRequestStatus status);

    List<SsbReviewRequest> findByStatusOrderByCreatedAtDesc(ReviewRequestStatus status);

    List<SsbReviewRequest> findByStatusInOrderByCreatedAtDesc(List<ReviewRequestStatus> statuses);

    List<SsbReviewRequest> findByStatusInAndSubmittedAtIsNotNullAndResolvedAtIsNotNullOrderByResolvedAtDesc(
            List<ReviewRequestStatus> statuses);

    List<SsbReviewRequest> findTop5ByStatusInAndSlaDeadlineIsNotNullOrderBySlaDeadlineAsc(
            List<ReviewRequestStatus> statuses);

    long countByStatus(ReviewRequestStatus status);

    long countByStatusAndResolvedAtAfter(ReviewRequestStatus status, Instant after);

    @Query("SELECT r.requestType, COUNT(r) FROM SsbReviewRequest r WHERE r.status IN :statuses GROUP BY r.requestType")
    List<Object[]> countByTypeGrouped(List<ReviewRequestStatus> statuses);

    long countBySlaDeadlineBeforeAndStatusIn(Instant now, List<ReviewRequestStatus> statuses);

    @Query(value = "SELECT nextval('cbs.ssb_review_code_seq')", nativeQuery = true)
    Long getNextReviewCodeSequence();
}
