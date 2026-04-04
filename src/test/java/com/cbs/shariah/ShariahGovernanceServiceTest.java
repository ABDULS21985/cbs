package com.cbs.shariah;

import com.cbs.common.exception.BusinessException;
import com.cbs.shariah.dto.*;
import com.cbs.shariah.entity.*;
import com.cbs.shariah.mapper.ShariahMapper;
import com.cbs.shariah.repository.*;
import com.cbs.shariah.service.ShariahGovernanceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShariahGovernanceServiceTest {

    @Mock private SsbBoardMemberRepository memberRepo;
    @Mock private FatwaRecordRepository fatwaRepo;
    @Mock private SsbReviewRequestRepository reviewRepo;
    @Mock private SsbVoteRepository voteRepo;
    @Mock private SsbReviewAuditLogRepository auditRepo;
    @Mock private ShariahMapper mapper;

    @InjectMocks private ShariahGovernanceService service;

    @BeforeEach
    void setUp() {
        lenient().when(auditRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("Should create SSB board member with generated member ID")
    void createMember_success() {
        var request = CreateSsbMemberRequest.builder()
                .fullName("Dr. Ahmad Al-Rashid")
                .title("Shariah Scholar")
                .appointmentDate(LocalDate.of(2026, 1, 1))
                .expiryDate(LocalDate.of(2027, 1, 1))
                .votingWeight(1)
                .contactEmail("ahmad@example.com")
                .build();

        var entity = SsbBoardMember.builder()
                .id(1L)
                .memberId("SSB-0001")
                .fullName("Dr. Ahmad Al-Rashid")
                .isActive(true)
                .isChairman(false)
                .votingWeight(1)
                .appointmentDate(LocalDate.of(2026, 1, 1))
                .expiryDate(LocalDate.of(2027, 1, 1))
                .contactEmail("ahmad@example.com")
                .build();

        var response = SsbMemberResponse.builder()
                .id(1L)
                .memberId("SSB-0001")
                .fullName("Dr. Ahmad Al-Rashid")
                .build();

        when(mapper.toEntity(request)).thenReturn(entity);
        when(memberRepo.save(any())).thenReturn(entity);
        when(memberRepo.count()).thenReturn(0L);
        when(mapper.toMemberResponse(entity)).thenReturn(response);

        SsbMemberResponse result = service.createMember(request, "admin");

        assertThat(result.getMemberId()).isEqualTo("SSB-0001");
        assertThat(result.getFullName()).isEqualTo("Dr. Ahmad Al-Rashid");
        verify(memberRepo).save(any());
    }

    @Test
    @DisplayName("Should reject member creation when appointment date is not before expiry date")
    void createMember_rejectInvalidDateWindow() {
        var request = CreateSsbMemberRequest.builder()
                .fullName("Dr. Ahmad Al-Rashid")
                .appointmentDate(LocalDate.of(2026, 1, 1))
                .expiryDate(LocalDate.of(2026, 1, 1))
                .build();

        assertThatThrownBy(() -> service.createMember(request, "admin"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Appointment date must be before expiry date");
    }

    @Test
    @DisplayName("Should require approved review before activating fatwa")
    void activateFatwa_requiresApprovedReview() {
        var fatwa = FatwaRecord.builder()
                .id(1L)
                .fatwaNumber("FTW-2026-0001")
                .status(FatwaStatus.DRAFT)
                .build();

        when(fatwaRepo.findById(1L)).thenReturn(Optional.of(fatwa));
        when(reviewRepo.existsByLinkedFatwaIdAndStatus(1L, ReviewRequestStatus.APPROVED)).thenReturn(false);

        assertThatThrownBy(() -> service.activateFatwa(1L, "admin"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("without at least one APPROVED SSB review");
    }

    @Test
    @DisplayName("Should activate fatwa when approved review exists")
    void activateFatwa_success() {
        var fatwa = FatwaRecord.builder()
                .id(1L)
                .fatwaNumber("FTW-2026-0001")
                .status(FatwaStatus.DRAFT)
                .build();
        var response = FatwaResponse.builder()
                .id(1L)
                .fatwaNumber("FTW-2026-0001")
                .status(FatwaStatus.ACTIVE)
                .build();

        when(fatwaRepo.findById(1L)).thenReturn(Optional.of(fatwa));
        when(reviewRepo.existsByLinkedFatwaIdAndStatus(1L, ReviewRequestStatus.APPROVED)).thenReturn(true);
        when(fatwaRepo.save(any())).thenReturn(fatwa);
        when(mapper.toFatwaResponse(any())).thenReturn(response);

        FatwaResponse result = service.activateFatwa(1L, "admin");

        assertThat(result.getStatus()).isEqualTo(FatwaStatus.ACTIVE);
        assertThat(fatwa.getApprovedAt()).isNotNull();
    }

    @Test
    @DisplayName("Should supersede an active fatwa with another active fatwa")
    void supersedeFatwa_success() {
        var fatwa = FatwaRecord.builder()
                .id(1L)
                .fatwaNumber("FTW-2026-0001")
                .status(FatwaStatus.ACTIVE)
                .build();
        var replacement = FatwaRecord.builder()
                .id(2L)
                .fatwaNumber("FTW-2026-0002")
                .status(FatwaStatus.ACTIVE)
                .build();
        var response = FatwaResponse.builder()
                .id(1L)
                .status(FatwaStatus.SUPERSEDED)
                .supersededByFatwaId(2L)
                .build();

        when(fatwaRepo.findById(1L)).thenReturn(Optional.of(fatwa));
        when(fatwaRepo.findById(2L)).thenReturn(Optional.of(replacement));
        when(fatwaRepo.save(any())).thenReturn(fatwa);
        when(mapper.toFatwaResponse(any())).thenReturn(response);

        FatwaResponse result = service.supersedeFatwa(1L, 2L, "admin");

        assertThat(result.getStatus()).isEqualTo(FatwaStatus.SUPERSEDED);
        assertThat(fatwa.getSupersededByFatwaId()).isEqualTo(2L);
    }

    @Test
    @DisplayName("Should reject review creation when quorum exceeds assigned members")
    void createReview_quorumExceedsMembers() {
        var request = CreateReviewRequest.builder()
                .requestType(ReviewRequestType.NEW_PRODUCT)
                .title("Test Review")
                .assignedMemberIds(List.of(1L, 2L))
                .requiredQuorum(5)
                .build();

        assertThatThrownBy(() -> service.createReview(request, "admin"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("exceeds assigned members");
    }

    @Test
    @DisplayName("Should reset prior votes when resubmitting a revision-required review")
    void submitReview_resetsVotesWhenResubmittingRevisionRequired() {
        var review = SsbReviewRequest.builder()
                .id(1L)
                .requestCode("SSB-2026-0001")
                .status(ReviewRequestStatus.REVISION_REQUIRED)
                .assignedMemberIds(List.of(1L, 2L))
                .requiredQuorum(2)
                .currentApprovals(1)
                .currentRejections(0)
                .build();

        when(reviewRepo.findById(1L)).thenReturn(Optional.of(review));
        when(memberRepo.findByIdInAndIsActiveTrue(List.of(1L, 2L))).thenReturn(List.of(
                SsbBoardMember.builder().id(1L).isActive(true).build(),
                SsbBoardMember.builder().id(2L).isActive(true).build()
        ));
        when(reviewRepo.save(any())).thenReturn(review);
        when(voteRepo.findByReviewRequestIdOrderByVotedAtAsc(1L)).thenReturn(List.of());

        ReviewRequestResponse result = service.submitReview(1L, "admin");

        assertThat(result.getStatus()).isEqualTo(ReviewRequestStatus.SUBMITTED);
        assertThat(review.getCurrentApprovals()).isZero();
        assertThat(review.getCurrentRejections()).isZero();
        verify(voteRepo).deleteByReviewRequestId(1L);
    }

    @Test
    @DisplayName("Should auto-approve review when quorum is reached by assigned authenticated member")
    void castVote_autoApproveOnQuorum() {
        var member = SsbBoardMember.builder()
                .id(1L)
                .memberId("SSB-0001")
                .contactEmail("scholar@example.com")
                .isActive(true)
                .build();
        var review = SsbReviewRequest.builder()
                .id(1L)
                .requestCode("SSB-2026-0001")
                .status(ReviewRequestStatus.SUBMITTED)
                .assignedMemberIds(List.of(1L))
                .requiredQuorum(1)
                .build();
        var voteRequest = CastVoteRequest.builder()
                .vote(VoteType.APPROVE)
                .comments("Approved")
                .build();
        var savedVote = SsbVote.builder()
                .id(1L)
                .reviewRequestId(1L)
                .memberId(1L)
                .vote(VoteType.APPROVE)
                .votedAt(Instant.now())
                .build();

        when(reviewRepo.findById(1L)).thenReturn(Optional.of(review));
        when(memberRepo.findByMemberIdIgnoreCaseAndIsActiveTrue("SSB-0001")).thenReturn(Optional.of(member));
        when(voteRepo.findByReviewRequestIdAndMemberId(1L, 1L)).thenReturn(Optional.empty());
        when(voteRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(voteRepo.findByReviewRequestIdOrderByVotedAtAsc(1L)).thenReturn(List.of(savedVote));
        when(reviewRepo.save(any())).thenReturn(review);

        ReviewRequestResponse result = service.castVote(1L, voteRequest, "shariah-officer", Set.of("SSB-0001"));

        assertThat(result.getStatus()).isEqualTo(ReviewRequestStatus.APPROVED);
        assertThat(review.getResolvedBy()).isEqualTo("QUORUM");
        assertThat(review.getCurrentApprovals()).isEqualTo(1);
    }

    @Test
    @DisplayName("Should reject vote impersonation when body member ID does not match authenticated SSB member")
    void castVote_rejectImpersonation() {
        var member = SsbBoardMember.builder()
                .id(1L)
                .memberId("SSB-0001")
                .contactEmail("scholar@example.com")
                .isActive(true)
                .build();
        var review = SsbReviewRequest.builder()
                .id(1L)
                .status(ReviewRequestStatus.SUBMITTED)
                .assignedMemberIds(List.of(1L))
                .requiredQuorum(1)
                .build();
        var voteRequest = CastVoteRequest.builder()
                .memberId(2L)
                .vote(VoteType.APPROVE)
                .build();

        when(reviewRepo.findById(1L)).thenReturn(Optional.of(review));
        when(memberRepo.findByMemberIdIgnoreCaseAndIsActiveTrue("SSB-0001")).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> service.castVote(1L, voteRequest, "shariah-officer", Set.of("SSB-0001")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("cannot vote on behalf of another member");
    }

    @Test
    @DisplayName("Should reject vote from authenticated member who is not assigned to the review")
    void castVote_rejectUnassignedAuthenticatedMember() {
        var member = SsbBoardMember.builder()
                .id(99L)
                .memberId("SSB-0099")
                .isActive(true)
                .build();
        var review = SsbReviewRequest.builder()
                .id(1L)
                .status(ReviewRequestStatus.SUBMITTED)
                .assignedMemberIds(List.of(1L))
                .requiredQuorum(1)
                .build();
        var voteRequest = CastVoteRequest.builder()
                .vote(VoteType.APPROVE)
                .build();

        when(reviewRepo.findById(1L)).thenReturn(Optional.of(review));
        when(memberRepo.findByMemberIdIgnoreCaseAndIsActiveTrue("SSB-0099")).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> service.castVote(1L, voteRequest, "shariah-officer", Set.of("SSB-0099")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not assigned");
    }

    @Test
    @DisplayName("Should recalculate quorum when deactivating a member with pending vote on an open review")
    void deactivateMember_recalculatesQuorum() {
        var member = SsbBoardMember.builder()
                .id(2L)
                .memberId("SSB-0002")
                .isActive(true)
                .build();
        var activeMember = SsbBoardMember.builder().id(1L).memberId("SSB-0001").isActive(true).build();
        var review = SsbReviewRequest.builder()
                .id(10L)
                .requestCode("SSB-2026-0010")
                .status(ReviewRequestStatus.SUBMITTED)
                .assignedMemberIds(List.of(1L, 2L))
                .requiredQuorum(2)
                .build();

        when(memberRepo.findById(2L)).thenReturn(Optional.of(member));
        when(memberRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(reviewRepo.findByStatusInOrderByCreatedAtDesc(any())).thenReturn(List.of(review));
        when(voteRepo.findByReviewRequestIdOrderByVotedAtAsc(10L)).thenReturn(List.of());
        when(memberRepo.findByIdInAndIsActiveTrue(List.of(1L, 2L))).thenReturn(List.of(activeMember));
        when(reviewRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.deactivateMember(2L, "admin");

        assertThat(member.getIsActive()).isFalse();
        assertThat(review.getRequiredQuorum()).isEqualTo(1);
        assertThat(review.getReviewNotes()).contains("Pending vote removed");
    }

    @Test
    @DisplayName("Should return prompt-aligned dashboard metrics")
    void getDashboard_returnsPromptAlignedMetrics() {
        var resolvedApproved = SsbReviewRequest.builder()
                .id(1L)
                .submittedAt(Instant.parse("2026-01-01T00:00:00Z"))
                .resolvedAt(Instant.parse("2026-01-03T00:00:00Z"))
                .build();
        var upcoming = SsbReviewRequest.builder()
                .id(2L)
                .requestCode("SSB-2026-0002")
                .title("Murabaha Product Review")
                .priority("HIGH")
                .status(ReviewRequestStatus.UNDER_REVIEW)
                .slaDeadline(Instant.parse("2026-01-10T00:00:00Z"))
                .build();

        when(memberRepo.countByIsActiveTrue()).thenReturn(3L);
        when(reviewRepo.countByStatus(ReviewRequestStatus.SUBMITTED)).thenReturn(1L);
        when(reviewRepo.countByStatus(ReviewRequestStatus.UNDER_REVIEW)).thenReturn(2L);
        when(reviewRepo.countByStatusAndResolvedAtAfter(eq(ReviewRequestStatus.APPROVED), any())).thenReturn(4L);
        when(reviewRepo.countByStatusAndResolvedAtAfter(eq(ReviewRequestStatus.REJECTED), any())).thenReturn(1L);
        when(reviewRepo.countByTypeGrouped(any())).thenReturn(List.<Object[]>of(new Object[]{ReviewRequestType.NEW_PRODUCT, 2L}));
        when(reviewRepo.findByStatusInAndSubmittedAtIsNotNullAndResolvedAtIsNotNullOrderByResolvedAtDesc(any()))
                .thenReturn(List.of(resolvedApproved));
        when(reviewRepo.findTop5ByStatusInAndSlaDeadlineIsNotNullOrderBySlaDeadlineAsc(any()))
                .thenReturn(List.of(upcoming));

        SsbDashboardResponse result = service.getDashboard();

        assertThat(result.getActiveMembers()).isEqualTo(3L);
        assertThat(result.getPendingReviews()).isEqualTo(3L);
        assertThat(result.getApprovedThisMonth()).isEqualTo(4L);
        assertThat(result.getRejectedThisMonth()).isEqualTo(1L);
        assertThat(result.getAvgResolutionDays()).isEqualTo(2.0d);
        assertThat(result.getReviewsByCategory()).containsEntry("NEW_PRODUCT", 2L);
        assertThat(result.getUpcomingDeadlines()).hasSize(1);
        assertThat(result.getUpcomingDeadlines().get(0).getRequestCode()).isEqualTo("SSB-2026-0002");
    }
}
