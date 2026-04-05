package com.cbs.shariah.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.shariah.dto.*;
import com.cbs.shariah.entity.*;
import com.cbs.shariah.mapper.ShariahMapper;
import com.cbs.shariah.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Year;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShariahGovernanceService {

    private static final Set<String> ALLOWED_PRIORITIES = Set.of("NORMAL", "HIGH", "URGENT");
    private static final List<ReviewRequestStatus> OPEN_REVIEW_STATUSES = List.of(
            ReviewRequestStatus.DRAFT,
            ReviewRequestStatus.SUBMITTED,
            ReviewRequestStatus.UNDER_REVIEW,
            ReviewRequestStatus.REVISION_REQUIRED
    );
    private static final List<ReviewRequestStatus> PENDING_REVIEW_STATUSES = List.of(
            ReviewRequestStatus.SUBMITTED,
            ReviewRequestStatus.UNDER_REVIEW
    );
    private static final List<ReviewRequestStatus> RESOLVED_REVIEW_STATUSES = List.of(
            ReviewRequestStatus.APPROVED,
            ReviewRequestStatus.REJECTED
    );

    private final SsbBoardMemberRepository memberRepo;
    private final FatwaRecordRepository fatwaRepo;
    private final SsbReviewRequestRepository reviewRepo;
    private final SsbVoteRepository voteRepo;
    private final SsbReviewAuditLogRepository auditRepo;
    private final ShariahMapper mapper;

    // ── SSB Board Members ───────────────────────────────────────────────

    @Transactional
    public SsbMemberResponse createMember(CreateSsbMemberRequest request, String createdBy) {
        validateMemberWindow(request.getAppointmentDate(), request.getExpiryDate());

        SsbBoardMember member = mapper.toEntity(request);
        member.setMemberId(generateMemberId());
        if (member.getIsChairman() == null) member.setIsChairman(false);
        if (member.getVotingWeight() == null) member.setVotingWeight(1);
        member = memberRepo.save(member);
        log.info("SSB member registered: {} by {}", member.getMemberId(), createdBy);
        audit(null, null, "MEMBER_CREATED", createdBy, Map.of("memberId", member.getMemberId()));
        return mapper.toMemberResponse(member);
    }

    public List<SsbMemberResponse> getActiveMembers() {
        return mapper.toMemberResponseList(memberRepo.findByIsActiveTrueOrderByFullNameAsc());
    }

    @Transactional
    public SsbMemberResponse updateMember(Long id, CreateSsbMemberRequest request, String updatedBy) {
        validateMemberWindow(request.getAppointmentDate(), request.getExpiryDate());

        SsbBoardMember member = memberRepo.findById(id)
                .orElseThrow(() -> new BusinessException("SSB member not found: " + id, HttpStatus.NOT_FOUND, "NOT_FOUND"));
        member.setFullName(request.getFullName());
        member.setTitle(request.getTitle());
        member.setQualifications(request.getQualifications());
        member.setSpecializations(request.getSpecializations());
        member.setAppointmentDate(request.getAppointmentDate());
        member.setExpiryDate(request.getExpiryDate());
        if (request.getIsChairman() != null) member.setIsChairman(request.getIsChairman());
        if (request.getVotingWeight() != null) member.setVotingWeight(request.getVotingWeight());
        member.setContactEmail(request.getContactEmail());
        member.setContactPhone(request.getContactPhone());
        member.setNationality(request.getNationality());
        member = memberRepo.save(member);
        audit(null, null, "MEMBER_UPDATED", updatedBy, Map.of("memberId", member.getMemberId()));
        return mapper.toMemberResponse(member);
    }

    @Transactional
    public void deactivateMember(Long id, String deactivatedBy) {
        SsbBoardMember member = memberRepo.findById(id)
                .orElseThrow(() -> new BusinessException("SSB member not found: " + id, HttpStatus.NOT_FOUND, "NOT_FOUND"));
        member.setIsActive(false);
        memberRepo.save(member);
        log.info("SSB member deactivated: {} by {}", member.getMemberId(), deactivatedBy);
        audit(null, null, "MEMBER_DEACTIVATED", deactivatedBy, Map.of("memberId", member.getMemberId()));

        List<SsbReviewRequest> impactedReviews = reviewRepo.findByStatusInOrderByCreatedAtDesc(OPEN_REVIEW_STATUSES).stream()
                .filter(review -> review.getAssignedMemberIds() != null && review.getAssignedMemberIds().contains(id))
                .toList();

        for (SsbReviewRequest review : impactedReviews) {
            reconcileReviewAfterMemberDeactivation(review, member, deactivatedBy);
        }
    }

    // ── Fatwa Registry ──────────────────────────────────────────────────

    @Transactional
    public FatwaResponse createFatwa(CreateFatwaRequest request, String createdBy) {
        validateFatwaDates(request.getEffectiveDate(), request.getExpiryDate());

        FatwaRecord fatwa = mapper.toEntity(request);
        fatwa.setFatwaNumber(generateFatwaNumber());
        fatwa.setCreatedBy(createdBy);
        fatwa = fatwaRepo.save(fatwa);
        log.info("Fatwa draft created: {} by {}", fatwa.getFatwaNumber(), createdBy);
        audit(null, fatwa.getId(), "FATWA_CREATED", createdBy, Map.of("fatwaNumber", fatwa.getFatwaNumber()));
        return mapper.toFatwaResponse(fatwa);
    }

    public List<FatwaResponse> listFatwas(FatwaStatus status, FatwaCategory category) {
        List<FatwaRecord> records;
        if (status != null && category != null) {
            records = fatwaRepo.findByFatwaCategoryAndStatusOrderByCreatedAtDesc(category, status);
        } else if (status != null) {
            records = fatwaRepo.findByStatusOrderByCreatedAtDesc(status);
        } else if (category != null) {
            records = fatwaRepo.findByFatwaCategoryOrderByCreatedAtDesc(category);
        } else {
            records = fatwaRepo.findByStatusInOrderByCreatedAtDesc(
                    List.of(FatwaStatus.DRAFT, FatwaStatus.ACTIVE, FatwaStatus.SUPERSEDED, FatwaStatus.REVOKED));
        }
        return mapper.toFatwaResponseList(records);
    }

    public FatwaResponse getFatwa(Long id) {
        FatwaRecord fatwa = fatwaRepo.findById(id)
                .orElseThrow(() -> new BusinessException("Fatwa not found: " + id, HttpStatus.NOT_FOUND, "NOT_FOUND"));
        return mapper.toFatwaResponse(fatwa);
    }

    @Transactional
    public FatwaResponse updateFatwa(Long id, UpdateFatwaRequest request, String updatedBy) {
        validateFatwaDates(request.getEffectiveDate(), request.getExpiryDate());

        FatwaRecord fatwa = fatwaRepo.findById(id)
                .orElseThrow(() -> new BusinessException("Fatwa not found: " + id, HttpStatus.NOT_FOUND, "NOT_FOUND"));
        if (fatwa.getStatus() != FatwaStatus.DRAFT) {
            throw new BusinessException("Only DRAFT fatwas can be edited");
        }
        mapper.updateFatwaFromRequest(request, fatwa);
        fatwa.setUpdatedBy(updatedBy);
        fatwa = fatwaRepo.save(fatwa);
        audit(null, fatwa.getId(), "FATWA_UPDATED", updatedBy, Map.of("fatwaNumber", fatwa.getFatwaNumber()));
        return mapper.toFatwaResponse(fatwa);
    }

    @Transactional
    public FatwaResponse activateFatwa(Long id, String activatedBy) {
        FatwaRecord fatwa = fatwaRepo.findById(id)
                .orElseThrow(() -> new BusinessException("Fatwa not found: " + id, HttpStatus.NOT_FOUND, "NOT_FOUND"));
        if (fatwa.getStatus() != FatwaStatus.DRAFT) {
            throw new BusinessException("Only DRAFT fatwas can be activated");
        }
        if (!reviewRepo.existsByLinkedFatwaIdAndStatus(id, ReviewRequestStatus.APPROVED)) {
            throw new BusinessException("Fatwa cannot be activated without at least one APPROVED SSB review");
        }
        fatwa.setStatus(FatwaStatus.ACTIVE);
        fatwa.setApprovedAt(Instant.now());
        if (fatwa.getEffectiveDate() == null) {
            fatwa.setEffectiveDate(LocalDate.now());
        }
        fatwa.setUpdatedBy(activatedBy);
        fatwa = fatwaRepo.save(fatwa);
        log.info("Fatwa activated: {} by {}", fatwa.getFatwaNumber(), activatedBy);
        audit(null, fatwa.getId(), "FATWA_ACTIVATED", activatedBy, Map.of("fatwaNumber", fatwa.getFatwaNumber()));
        return mapper.toFatwaResponse(fatwa);
    }

    @Transactional
    public FatwaResponse revokeFatwa(Long id, String revokedBy) {
        FatwaRecord fatwa = fatwaRepo.findById(id)
                .orElseThrow(() -> new BusinessException("Fatwa not found: " + id, HttpStatus.NOT_FOUND, "NOT_FOUND"));
        if (fatwa.getStatus() != FatwaStatus.ACTIVE) {
            throw new BusinessException("Only ACTIVE fatwas can be revoked");
        }
        fatwa.setStatus(FatwaStatus.REVOKED);
        fatwa.setUpdatedBy(revokedBy);
        fatwa = fatwaRepo.save(fatwa);
        log.info("Fatwa revoked: {} by {}", fatwa.getFatwaNumber(), revokedBy);
        audit(null, fatwa.getId(), "FATWA_REVOKED", revokedBy, Map.of("fatwaNumber", fatwa.getFatwaNumber()));
        return mapper.toFatwaResponse(fatwa);
    }

    @Transactional
    public FatwaResponse supersedeFatwa(Long fatwaId, Long replacementFatwaId, String supersededBy) {
        if (Objects.equals(fatwaId, replacementFatwaId)) {
            throw new BusinessException("Replacement fatwa must be different from the fatwa being superseded");
        }

        FatwaRecord fatwa = fatwaRepo.findById(fatwaId)
                .orElseThrow(() -> new BusinessException("Fatwa not found: " + fatwaId, HttpStatus.NOT_FOUND, "NOT_FOUND"));
        FatwaRecord replacement = fatwaRepo.findById(replacementFatwaId)
                .orElseThrow(() -> new BusinessException("Replacement fatwa not found: " + replacementFatwaId,
                        HttpStatus.NOT_FOUND, "NOT_FOUND"));

        if (fatwa.getStatus() != FatwaStatus.ACTIVE) {
            throw new BusinessException("Only ACTIVE fatwas can be superseded");
        }
        if (replacement.getStatus() != FatwaStatus.ACTIVE) {
            throw new BusinessException("Replacement fatwa must be ACTIVE before superseding another fatwa");
        }

        fatwa.setStatus(FatwaStatus.SUPERSEDED);
        fatwa.setSupersededByFatwaId(replacementFatwaId);
        fatwa.setUpdatedBy(supersededBy);
        fatwa = fatwaRepo.save(fatwa);
        audit(null, fatwa.getId(), "FATWA_SUPERSEDED", supersededBy, Map.of(
                "fatwaNumber", fatwa.getFatwaNumber(),
                "replacementFatwaId", replacementFatwaId,
                "replacementFatwaNumber", replacement.getFatwaNumber()
        ));
        return mapper.toFatwaResponse(fatwa);
    }

    // ── SSB Review Requests ─────────────────────────────────────────────

    @Transactional
    public ReviewRequestResponse createReview(CreateReviewRequest request, String createdBy) {
        validateReviewRequest(request);

        if (request.getLinkedFatwaId() != null && !fatwaRepo.existsById(request.getLinkedFatwaId())) {
            throw new BusinessException("Linked fatwa not found: " + request.getLinkedFatwaId(),
                    HttpStatus.NOT_FOUND, "NOT_FOUND");
        }

        List<SsbBoardMember> assigned = memberRepo.findByIdInAndIsActiveTrue(request.getAssignedMemberIds());
        if (assigned.size() != request.getAssignedMemberIds().size()) {
            throw new BusinessException("Some assigned member IDs are invalid or inactive");
        }

        SsbReviewRequest review = SsbReviewRequest.builder()
                .requestCode(generateRequestCode())
                .requestType(request.getRequestType())
                .title(request.getTitle())
                .description(request.getDescription())
                .assignedMemberIds(new ArrayList<>(request.getAssignedMemberIds()))
                .requiredQuorum(request.getRequiredQuorum() != null ? request.getRequiredQuorum() : request.getAssignedMemberIds().size())
                .linkedFatwaId(request.getLinkedFatwaId())
                .linkedProductCode(request.getLinkedProductCode())
                .linkedTransactionRef(request.getLinkedTransactionRef())
                .priority(normalizePriority(request.getPriority()))
                .slaDeadline(request.getSlaDeadline())
                .build();
        review = reviewRepo.save(review);
        log.info("SSB review created: {} by {}", review.getRequestCode(), createdBy);
        audit(review.getId(), null, "REVIEW_CREATED", createdBy, Map.of("requestCode", review.getRequestCode()));
        return enrichReviewResponse(review);
    }

    public List<ReviewRequestResponse> listReviews(ReviewRequestStatus status) {
        List<SsbReviewRequest> reviews;
        if (status != null) {
            reviews = reviewRepo.findByStatusOrderByCreatedAtDesc(status);
        } else {
            reviews = reviewRepo.findByStatusInOrderByCreatedAtDesc(
                    List.of(ReviewRequestStatus.DRAFT, ReviewRequestStatus.SUBMITTED,
                            ReviewRequestStatus.UNDER_REVIEW, ReviewRequestStatus.APPROVED,
                            ReviewRequestStatus.REJECTED, ReviewRequestStatus.REVISION_REQUIRED,
                            ReviewRequestStatus.WITHDRAWN));
        }
        return reviews.stream().map(this::enrichReviewResponse).toList();
    }

    public ReviewRequestResponse getReview(Long id) {
        SsbReviewRequest review = reviewRepo.findById(id)
                .orElseThrow(() -> new BusinessException("Review request not found: " + id, HttpStatus.NOT_FOUND, "NOT_FOUND"));
        return enrichReviewResponse(review);
    }

    @Transactional
    public ReviewRequestResponse submitReview(Long id, String submittedBy) {
        SsbReviewRequest review = reviewRepo.findById(id)
                .orElseThrow(() -> new BusinessException("Review request not found: " + id, HttpStatus.NOT_FOUND, "NOT_FOUND"));
        if (review.getStatus() != ReviewRequestStatus.DRAFT && review.getStatus() != ReviewRequestStatus.REVISION_REQUIRED) {
            throw new BusinessException("Review can only be submitted from DRAFT or REVISION_REQUIRED status");
        }

        reconcileRequiredQuorum(review, submittedBy);

        if (review.getStatus() == ReviewRequestStatus.REVISION_REQUIRED) {
            voteRepo.deleteByReviewRequestId(review.getId());
            review.setCurrentApprovals(0);
            review.setCurrentRejections(0);
            review.setResolvedAt(null);
            review.setResolvedBy(null);
            audit(review.getId(), null, "REVIEW_VOTES_RESET", submittedBy, Map.of("requestCode", review.getRequestCode()));
        }

        ReviewRequestStatus previousStatus = review.getStatus();
        review.setStatus(ReviewRequestStatus.SUBMITTED);
        review.setSubmittedBy(submittedBy);
        review.setSubmittedAt(Instant.now());
        review = reviewRepo.save(review);
        log.info("SSB review submitted: {} by {}", review.getRequestCode(), submittedBy);
        audit(review.getId(), null, "REVIEW_SUBMITTED", submittedBy, Map.of("requestCode", review.getRequestCode()));
        auditReviewStatusTransition(review, previousStatus, submittedBy, "SUBMIT");
        return enrichReviewResponse(review);
    }

    @Transactional
    public ReviewRequestResponse castVote(
            Long reviewId,
            CastVoteRequest request,
            String votedBy,
            Collection<String> principalIdentifiers
    ) {
        SsbReviewRequest review = reviewRepo.findById(reviewId)
                .orElseThrow(() -> new BusinessException("Review request not found: " + reviewId, HttpStatus.NOT_FOUND, "NOT_FOUND"));

        if (review.getStatus() != ReviewRequestStatus.SUBMITTED && review.getStatus() != ReviewRequestStatus.UNDER_REVIEW) {
            throw new BusinessException("Votes can only be cast on SUBMITTED or UNDER_REVIEW reviews");
        }

        SsbBoardMember authenticatedMember = resolveAuthenticatedMember(principalIdentifiers);
        if (authenticatedMember == null) {
            throw new BusinessException("Authenticated user is not an active SSB member",
                    HttpStatus.FORBIDDEN, "SSB_MEMBER_MAPPING_NOT_FOUND");
        }

        if (request.getMemberId() != null && !request.getMemberId().equals(authenticatedMember.getId())) {
            throw new BusinessException("Authenticated SSB member cannot vote on behalf of another member",
                    HttpStatus.FORBIDDEN, "SSB_MEMBER_IMPERSONATION_DENIED");
        }

        if (!review.getAssignedMemberIds().contains(authenticatedMember.getId())) {
            throw new BusinessException("Authenticated SSB member is not assigned to this review",
                    HttpStatus.FORBIDDEN, "SSB_MEMBER_NOT_ASSIGNED");
        }

        voteRepo.findByReviewRequestIdAndMemberId(reviewId, authenticatedMember.getId()).ifPresent(v -> {
            throw new BusinessException("Member " + authenticatedMember.getId() + " has already voted on this review");
        });

        SsbVote vote = SsbVote.builder()
                .reviewRequestId(reviewId)
                .memberId(authenticatedMember.getId())
                .vote(request.getVote())
                .comments(request.getComments())
                .build();
        voteRepo.save(vote);

        List<SsbVote> allVotes = voteRepo.findByReviewRequestIdOrderByVotedAtAsc(reviewId);
        ReviewRequestStatus previousStatus = review.getStatus();
        applyReviewOutcome(review, allVotes, votedBy, request.getComments());
        review = reviewRepo.save(review);

        audit(review.getId(), null, "VOTE_CAST", votedBy,
                Map.of("memberId", authenticatedMember.getId(), "vote", request.getVote().name()));
        auditReviewStatusTransition(review, previousStatus, votedBy, "VOTE_CAST");
        return enrichReviewResponse(review);
    }

    @Transactional
    public ReviewRequestResponse resolveReview(Long id, String resolutionNotes, String resolvedBy) {
        SsbReviewRequest review = reviewRepo.findById(id)
                .orElseThrow(() -> new BusinessException("Review request not found: " + id, HttpStatus.NOT_FOUND, "NOT_FOUND"));
        if (review.getStatus() == ReviewRequestStatus.APPROVED || review.getStatus() == ReviewRequestStatus.REJECTED) {
            review.setResolutionNotes(resolutionNotes);
            review.setResolvedBy(resolvedBy);
            if (review.getResolvedAt() == null) review.setResolvedAt(Instant.now());
            review = reviewRepo.save(review);
            audit(review.getId(), null, "REVIEW_RESOLVED", resolvedBy, Map.of("status", review.getStatus().name()));
            return enrichReviewResponse(review);
        }
        throw new BusinessException("Review must be APPROVED or REJECTED before resolution");
    }

    // ── Dashboard ───────────────────────────────────────────────────────

    public SsbDashboardResponse getDashboard() {
        Instant monthStart = YearMonth.now().atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);

        long pendingReviews = PENDING_REVIEW_STATUSES.stream().mapToLong(reviewRepo::countByStatus).sum();
        long approvedThisMonth = reviewRepo.countByStatusAndResolvedAtAfter(ReviewRequestStatus.APPROVED, monthStart);
        long rejectedThisMonth = reviewRepo.countByStatusAndResolvedAtAfter(ReviewRequestStatus.REJECTED, monthStart);

        List<Object[]> byType = reviewRepo.countByTypeGrouped(PENDING_REVIEW_STATUSES);
        Map<String, Long> reviewsByCategory = byType.stream()
                .collect(Collectors.toMap(r -> r[0].toString(), r -> (Long) r[1], (left, right) -> left, LinkedHashMap::new));

        List<SsbReviewRequest> resolvedReviews =
                reviewRepo.findByStatusInAndSubmittedAtIsNotNullAndResolvedAtIsNotNullOrderByResolvedAtDesc(RESOLVED_REVIEW_STATUSES);
        double avgResolutionDays = resolvedReviews.stream()
                .mapToDouble(review -> Duration.between(review.getSubmittedAt(), review.getResolvedAt()).toHours() / 24.0d)
                .average()
                .orElse(0.0d);

        List<SsbUpcomingDeadlineResponse> upcomingDeadlines =
                reviewRepo.findTop5ByStatusInAndSlaDeadlineIsNotNullOrderBySlaDeadlineAsc(PENDING_REVIEW_STATUSES).stream()
                        .map(review -> SsbUpcomingDeadlineResponse.builder()
                                .reviewId(review.getId())
                                .requestCode(review.getRequestCode())
                                .title(review.getTitle())
                                .priority(review.getPriority())
                                .status(review.getStatus())
                                .slaDeadline(review.getSlaDeadline())
                                .build())
                        .toList();

        return SsbDashboardResponse.builder()
                .activeMembers(memberRepo.countByIsActiveTrue())
                .pendingReviews(pendingReviews)
                .approvedThisMonth(approvedThisMonth)
                .rejectedThisMonth(rejectedThisMonth)
                .avgResolutionDays(avgResolutionDays)
                .reviewsByCategory(reviewsByCategory)
                .upcomingDeadlines(upcomingDeadlines)
                .build();
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private ReviewRequestResponse enrichReviewResponse(SsbReviewRequest review) {
        ReviewRequestResponse response = mapper.toReviewResponse(review);
        if (response == null) {
            response = ReviewRequestResponse.builder()
                    .id(review.getId())
                    .requestCode(review.getRequestCode())
                    .requestType(review.getRequestType())
                    .title(review.getTitle())
                    .description(review.getDescription())
                    .submittedBy(review.getSubmittedBy())
                    .submittedAt(review.getSubmittedAt())
                    .assignedMemberIds(review.getAssignedMemberIds())
                    .requiredQuorum(review.getRequiredQuorum())
                    .currentApprovals(review.getCurrentApprovals())
                    .currentRejections(review.getCurrentRejections())
                    .linkedFatwaId(review.getLinkedFatwaId())
                    .linkedProductCode(review.getLinkedProductCode())
                    .linkedTransactionRef(review.getLinkedTransactionRef())
                    .reviewNotes(review.getReviewNotes())
                    .resolutionNotes(review.getResolutionNotes())
                    .resolvedAt(review.getResolvedAt())
                    .resolvedBy(review.getResolvedBy())
                    .status(review.getStatus())
                    .priority(review.getPriority())
                    .slaDeadline(review.getSlaDeadline())
                    .createdAt(review.getCreatedAt())
                    .updatedAt(review.getUpdatedAt())
                    .build();
        }
        List<SsbVote> votes = voteRepo.findByReviewRequestIdOrderByVotedAtAsc(review.getId());
        List<VoteResponse> voteResponses = votes.stream().map(v -> {
            VoteResponse mappedVote = mapper.toVoteResponse(v);
            if (mappedVote == null) {
                mappedVote = VoteResponse.builder()
                        .id(v.getId())
                        .reviewRequestId(v.getReviewRequestId())
                        .memberId(v.getMemberId())
                        .vote(v.getVote())
                        .comments(v.getComments())
                        .votedAt(v.getVotedAt())
                        .build();
            }
            VoteResponse finalMappedVote = mappedVote;
            memberRepo.findById(v.getMemberId()).ifPresent(m -> finalMappedVote.setMemberName(m.getFullName()));
            return finalMappedVote;
        }).toList();
        response.setVotes(voteResponses);
        return response;
    }

    private void reconcileReviewAfterMemberDeactivation(SsbReviewRequest review, SsbBoardMember deactivatedMember, String actor) {
        List<SsbVote> votes = voteRepo.findByReviewRequestIdOrderByVotedAtAsc(review.getId());
        Set<Long> votedMemberIds = votes.stream().map(SsbVote::getMemberId).collect(Collectors.toSet());
        boolean pendingVoteImpacted = !votedMemberIds.contains(deactivatedMember.getId());

        ReviewRequestStatus previousStatus = review.getStatus();
        reconcileRequiredQuorum(review, actor);
        if (pendingVoteImpacted) {
            review.setReviewNotes(appendNote(review.getReviewNotes(),
                    "Pending vote removed for inactive member " + deactivatedMember.getMemberId() + "."));
        }
        applyReviewOutcome(review, votes, actor, review.getReviewNotes());
        reviewRepo.save(review);
        auditReviewStatusTransition(review, previousStatus, actor, "MEMBER_DEACTIVATED");
    }

    private void applyReviewOutcome(
            SsbReviewRequest review,
            List<SsbVote> votes,
            String actor,
            String revisionComment
    ) {
        int approvals = (int) votes.stream().filter(v -> v.getVote() == VoteType.APPROVE).count();
        int rejections = (int) votes.stream().filter(v -> v.getVote() == VoteType.REJECT).count();
        review.setCurrentApprovals(approvals);
        review.setCurrentRejections(rejections);

        Set<Long> activeAssignedMemberIds = getActiveAssignedMemberIds(review);
        Set<Long> votedMemberIds = votes.stream().map(SsbVote::getMemberId).collect(Collectors.toSet());
        long remainingPossibleApprovals = activeAssignedMemberIds.stream()
                .filter(id -> !votedMemberIds.contains(id))
                .count();

        if (votes.stream().anyMatch(v -> v.getVote() == VoteType.REQUEST_REVISION)) {
            review.setStatus(ReviewRequestStatus.REVISION_REQUIRED);
            review.setReviewNotes(revisionComment != null ? revisionComment : review.getReviewNotes());
            review.setResolvedAt(null);
            review.setResolvedBy(null);
            return;
        }

        if (approvals >= review.getRequiredQuorum()) {
            review.setStatus(ReviewRequestStatus.APPROVED);
            if (review.getResolvedAt() == null) {
                review.setResolvedAt(Instant.now());
            }
            review.setResolvedBy("QUORUM");
            return;
        }

        int activeAssignedCount = activeAssignedMemberIds.size();
        boolean isRejectedByThreshold = rejections > (activeAssignedCount - review.getRequiredQuorum());
        boolean isRejectedByUnreachableQuorum = approvals + remainingPossibleApprovals < review.getRequiredQuorum();
        if ((isRejectedByThreshold || isRejectedByUnreachableQuorum) && review.getRequiredQuorum() > 0) {
            review.setStatus(ReviewRequestStatus.REJECTED);
            if (review.getResolvedAt() == null) {
                review.setResolvedAt(Instant.now());
            }
            review.setResolvedBy("QUORUM_UNREACHABLE");
            return;
        }

        if (!votes.isEmpty()) {
            review.setStatus(ReviewRequestStatus.UNDER_REVIEW);
        } else if (review.getStatus() != ReviewRequestStatus.DRAFT) {
            review.setStatus(ReviewRequestStatus.SUBMITTED);
        }
        review.setResolvedAt(null);
        review.setResolvedBy(null);
    }

    private void reconcileRequiredQuorum(SsbReviewRequest review, String actor) {
        int activeAssignedCount = getActiveAssignedMemberIds(review).size();
        if (activeAssignedCount == 0) {
            ReviewRequestStatus previousStatus = review.getStatus();
            review.setStatus(ReviewRequestStatus.REVISION_REQUIRED);
            review.setReviewNotes(appendNote(review.getReviewNotes(),
                    "All assigned SSB members are inactive. Reassignment is required."));
            review.setResolvedAt(null);
            review.setResolvedBy(null);
            audit(review.getId(), null, "REVIEW_REASSIGNMENT_REQUIRED", actor, Map.of("requestCode", review.getRequestCode()));
            auditReviewStatusTransition(review, previousStatus, actor, "NO_ACTIVE_ASSIGNEES");
            return;
        }

        if (review.getRequiredQuorum() > activeAssignedCount) {
            int previousQuorum = review.getRequiredQuorum();
            review.setRequiredQuorum(activeAssignedCount);
            review.setReviewNotes(appendNote(review.getReviewNotes(),
                    "Required quorum recalculated from " + previousQuorum + " to " + activeAssignedCount + " after member availability change."));
            audit(review.getId(), null, "REVIEW_QUORUM_RECALCULATED", actor, Map.of(
                    "previousQuorum", previousQuorum,
                    "newQuorum", activeAssignedCount
            ));
        }
    }

    private Set<Long> getActiveAssignedMemberIds(SsbReviewRequest review) {
        if (review.getAssignedMemberIds() == null || review.getAssignedMemberIds().isEmpty()) {
            return Set.of();
        }
        return memberRepo.findByIdInAndIsActiveTrue(review.getAssignedMemberIds()).stream()
                .map(SsbBoardMember::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private SsbBoardMember resolveAuthenticatedMember(Collection<String> principalIdentifiers) {
        if (principalIdentifiers == null || principalIdentifiers.isEmpty()) {
            return null;
        }
        Set<String> normalized = principalIdentifiers.stream()
                .filter(id -> id != null && !id.isBlank())
                .map(id -> id.toLowerCase(Locale.ROOT))
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (normalized.isEmpty()) {
            return null;
        }
        List<SsbBoardMember> matches = memberRepo.findActiveByMemberIdOrEmailIn(normalized);
        return matches.isEmpty() ? null : matches.getFirst();
    }

    private void validateMemberWindow(LocalDate appointmentDate, LocalDate expiryDate) {
        if (appointmentDate != null && expiryDate != null && !appointmentDate.isBefore(expiryDate)) {
            throw new BusinessException("Appointment date must be before expiry date");
        }
    }

    private void validateFatwaDates(LocalDate effectiveDate, LocalDate expiryDate) {
        if (effectiveDate != null && effectiveDate.isBefore(LocalDate.now())) {
            throw new BusinessException("Effective date must be today or in the future");
        }
        if (effectiveDate != null && expiryDate != null && expiryDate.isBefore(effectiveDate)) {
            throw new BusinessException("Expiry date must be after or equal to effective date");
        }
    }

    private void validateReviewRequest(CreateReviewRequest request) {
        if (request.getAssignedMemberIds() == null || request.getAssignedMemberIds().isEmpty()) {
            throw new BusinessException("At least one member must be assigned");
        }
        if (new HashSet<>(request.getAssignedMemberIds()).size() != request.getAssignedMemberIds().size()) {
            throw new BusinessException("Assigned members must be unique");
        }
        if (request.getRequiredQuorum() != null && request.getRequiredQuorum() > request.getAssignedMemberIds().size()) {
            throw new BusinessException("Required quorum (" + request.getRequiredQuorum()
                    + ") exceeds assigned members (" + request.getAssignedMemberIds().size() + ")");
        }
        normalizePriority(request.getPriority());
    }

    private String normalizePriority(String priority) {
        if (priority == null || priority.isBlank()) {
            return "NORMAL";
        }
        String normalized = priority.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_PRIORITIES.contains(normalized)) {
            throw new BusinessException("Priority must be one of NORMAL, HIGH, or URGENT");
        }
        return normalized;
    }

    private String appendNote(String existing, String note) {
        if (note == null || note.isBlank()) {
            return existing;
        }
        if (existing == null || existing.isBlank()) {
            return note;
        }
        return existing + " " + note;
    }

    private void auditReviewStatusTransition(
            SsbReviewRequest review,
            ReviewRequestStatus previousStatus,
            String performedBy,
            String reason
    ) {
        if (previousStatus == null || previousStatus == review.getStatus()) {
            return;
        }
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("fromStatus", previousStatus.name());
        details.put("toStatus", review.getStatus().name());
        details.put("reason", reason);
        audit(review.getId(), null, "REVIEW_STATUS_CHANGED", performedBy, details);
    }

    private void audit(Long reviewId, Long fatwaId, String action, String performedBy, Map<String, Object> details) {
        auditRepo.save(SsbReviewAuditLog.builder()
                .reviewRequestId(reviewId)
                .fatwaId(fatwaId)
                .action(action)
                .performedBy(performedBy)
                .details(details)
                .build());
    }

    private String generateMemberId() {
        return "SSB-" + String.format("%04d", memberRepo.getNextMemberCodeSequence());
    }

    private String generateFatwaNumber() {
        int year = Year.now().getValue();
        return "FTW-" + year + "-" + String.format("%04d", fatwaRepo.getNextFatwaCodeSequence());
    }

    private String generateRequestCode() {
        int year = Year.now().getValue();
        return "SSB-" + year + "-" + String.format("%04d", reviewRepo.getNextReviewCodeSequence());
    }
}
