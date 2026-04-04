package com.cbs.shariah.repository;

import com.cbs.shariah.entity.SsbVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SsbVoteRepository extends JpaRepository<SsbVote, Long> {

    List<SsbVote> findByReviewRequestIdOrderByVotedAtAsc(Long reviewRequestId);

    Optional<SsbVote> findByReviewRequestIdAndMemberId(Long reviewRequestId, Long memberId);

    long countByReviewRequestId(Long reviewRequestId);

    void deleteByReviewRequestId(Long reviewRequestId);
}
