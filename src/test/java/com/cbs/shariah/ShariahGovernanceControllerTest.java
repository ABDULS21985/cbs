package com.cbs.shariah;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.exception.GlobalExceptionHandler;
import com.cbs.shariah.controller.ShariahGovernanceController;
import com.cbs.shariah.dto.*;
import com.cbs.shariah.entity.FatwaCategory;
import com.cbs.shariah.entity.FatwaStatus;
import com.cbs.shariah.entity.ReviewRequestStatus;
import com.cbs.shariah.entity.ReviewRequestType;
import com.cbs.shariah.entity.VoteType;
import com.cbs.shariah.service.ShariahGovernanceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ShariahGovernanceControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private ShariahGovernanceService service;

    @InjectMocks
    private ShariahGovernanceController controller;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("createMember should call service and return created response")
    void createMember() {
        var request = CreateSsbMemberRequest.builder()
                .fullName("Dr. Ahmad Al-Rashid")
                .appointmentDate(LocalDate.now().plusDays(1))
                .expiryDate(LocalDate.now().plusYears(1))
                .contactEmail("ahmad@example.com")
                .build();
        var response = SsbMemberResponse.builder().id(1L).memberId("SSB-0001").fullName("Dr. Ahmad Al-Rashid").build();

        when(service.createMember(any(), eq("admin-subject"))).thenReturn(response);

        ResponseEntity<ApiResponse<SsbMemberResponse>> result = controller.createMember(
                request, authToken("admin@example.com", "admin", "admin-subject")
        );

        assertThat(result.getStatusCode().value()).isEqualTo(201);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getData().getMemberId()).isEqualTo("SSB-0001");
    }

    @Test
    @DisplayName("getActiveMembers should return service response")
    void getActiveMembers() {
        when(service.getActiveMembers()).thenReturn(List.of(
                SsbMemberResponse.builder().id(1L).memberId("SSB-0001").fullName("Member One").build()
        ));

        ResponseEntity<ApiResponse<List<SsbMemberResponse>>> result = controller.getActiveMembers();

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("updateMember should call service and return updated member")
    void updateMember() {
        var request = CreateSsbMemberRequest.builder()
                .fullName("Dr. Fatimah")
                .appointmentDate(LocalDate.now().plusDays(1))
                .expiryDate(LocalDate.now().plusYears(1))
                .build();
        var response = SsbMemberResponse.builder().id(1L).memberId("SSB-0001").fullName("Dr. Fatimah").build();

        when(service.updateMember(eq(1L), any(), eq("admin-subject"))).thenReturn(response);

        ResponseEntity<ApiResponse<SsbMemberResponse>> result = controller.updateMember(
                1L, request, authToken("admin@example.com", "admin", "admin-subject")
        );

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody().getData().getFullName()).isEqualTo("Dr. Fatimah");
    }

    @Test
    @DisplayName("deactivateMember should call service and return success message")
    void deactivateMember() {
        ResponseEntity<ApiResponse<Void>> result = controller.deactivateMember(
                1L, authToken("admin@example.com", "admin", "admin-subject")
        );

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        verify(service).deactivateMember(1L, "admin-subject");
    }

    @Test
    @DisplayName("createFatwa should call service and return created response")
    void createFatwa() {
        var request = CreateFatwaRequest.builder()
                .fatwaTitle("Murabaha Approval")
                .fatwaCategory(FatwaCategory.PRODUCT_APPROVAL)
                .subject("Murabaha Product")
                .effectiveDate(LocalDate.now().plusDays(1))
                .build();
        var response = FatwaResponse.builder().id(1L).fatwaNumber("FTW-2026-0001").status(FatwaStatus.DRAFT).build();

        when(service.createFatwa(any(), eq("admin-subject"))).thenReturn(response);

        ResponseEntity<ApiResponse<FatwaResponse>> result = controller.createFatwa(
                request, authToken("admin@example.com", "admin", "admin-subject")
        );

        assertThat(result.getStatusCode().value()).isEqualTo(201);
        assertThat(result.getBody().getData().getFatwaNumber()).isEqualTo("FTW-2026-0001");
    }

    @Test
    @DisplayName("createFatwa should reject invalid request payload through bean validation")
    void createFatwa_validationError() throws Exception {
        var request = CreateFatwaRequest.builder()
                .fatwaTitle("Murabaha Approval")
                .fatwaCategory(FatwaCategory.PRODUCT_APPROVAL)
                .subject("Murabaha Product")
                .effectiveDate(LocalDate.now().minusDays(1))
                .build();

        mockMvc.perform(post("/v1/shariah/fatwa")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("listFatwas should delegate to service")
    void listFatwas() {
        when(service.listFatwas(FatwaStatus.ACTIVE, FatwaCategory.PRODUCT_APPROVAL)).thenReturn(List.of(
                FatwaResponse.builder().id(1L).fatwaNumber("FTW-2026-0001").status(FatwaStatus.ACTIVE).build()
        ));

        ResponseEntity<ApiResponse<List<FatwaResponse>>> result =
                controller.listFatwas(FatwaStatus.ACTIVE, FatwaCategory.PRODUCT_APPROVAL);

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("getFatwa should return fatwa detail")
    void getFatwa() {
        when(service.getFatwa(1L)).thenReturn(
                FatwaResponse.builder().id(1L).fatwaNumber("FTW-2026-0001").status(FatwaStatus.ACTIVE).build()
        );

        ResponseEntity<ApiResponse<FatwaResponse>> result = controller.getFatwa(1L);

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody().getData().getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("updateFatwa should call service and return updated fatwa")
    void updateFatwa() {
        var request = UpdateFatwaRequest.builder()
                .fatwaTitle("Updated Fatwa")
                .effectiveDate(LocalDate.now().plusDays(2))
                .build();

        when(service.updateFatwa(eq(1L), any(), eq("admin-subject"))).thenReturn(
                FatwaResponse.builder().id(1L).fatwaNumber("FTW-2026-0001").fatwaTitle("Updated Fatwa").build()
        );

        ResponseEntity<ApiResponse<FatwaResponse>> result = controller.updateFatwa(
                1L, request, authToken("admin@example.com", "admin", "admin-subject")
        );

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody().getData().getFatwaTitle()).isEqualTo("Updated Fatwa");
    }

    @Test
    @DisplayName("activateFatwa should call service")
    void activateFatwa() {
        when(service.activateFatwa(1L, "admin-subject")).thenReturn(
                FatwaResponse.builder().id(1L).fatwaNumber("FTW-2026-0001").status(FatwaStatus.ACTIVE).build()
        );

        ResponseEntity<ApiResponse<FatwaResponse>> result = controller.activateFatwa(
                1L, authToken("admin@example.com", "admin", "admin-subject")
        );

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody().getData().getStatus()).isEqualTo(FatwaStatus.ACTIVE);
    }

    @Test
    @DisplayName("revokeFatwa should call service")
    void revokeFatwa() {
        when(service.revokeFatwa(1L, "admin-subject")).thenReturn(
                FatwaResponse.builder().id(1L).fatwaNumber("FTW-2026-0001").status(FatwaStatus.REVOKED).build()
        );

        ResponseEntity<ApiResponse<FatwaResponse>> result = controller.revokeFatwa(
                1L, authToken("admin@example.com", "admin", "admin-subject")
        );

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody().getData().getStatus()).isEqualTo(FatwaStatus.REVOKED);
    }

    @Test
    @DisplayName("supersedeFatwa should call service")
    void supersedeFatwa() {
        var request = SupersedeFatwaRequest.builder().replacementFatwaId(2L).build();

        when(service.supersedeFatwa(1L, 2L, "admin-subject")).thenReturn(
                FatwaResponse.builder().id(1L).status(FatwaStatus.SUPERSEDED).supersededByFatwaId(2L).build()
        );

        ResponseEntity<ApiResponse<FatwaResponse>> result = controller.supersedeFatwa(
                1L, request, authToken("admin@example.com", "admin", "admin-subject")
        );

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody().getData().getSupersededByFatwaId()).isEqualTo(2L);
    }

    @Test
    @DisplayName("createReview should call service and return created response")
    void createReview() {
        var request = CreateReviewRequest.builder()
                .requestType(ReviewRequestType.NEW_PRODUCT)
                .title("Murabaha Product Review")
                .assignedMemberIds(List.of(1L, 2L))
                .requiredQuorum(2)
                .priority("HIGH")
                .build();

        when(service.createReview(any(), eq("admin-subject"))).thenReturn(
                ReviewRequestResponse.builder().id(1L).requestCode("SSB-2026-0001").status(ReviewRequestStatus.DRAFT).build()
        );

        ResponseEntity<ApiResponse<ReviewRequestResponse>> result = controller.createReview(
                request, authToken("admin@example.com", "admin", "admin-subject")
        );

        assertThat(result.getStatusCode().value()).isEqualTo(201);
        assertThat(result.getBody().getData().getRequestCode()).isEqualTo("SSB-2026-0001");
    }

    @Test
    @DisplayName("listReviews should delegate to service")
    void listReviews() {
        when(service.listReviews(ReviewRequestStatus.SUBMITTED)).thenReturn(List.of(
                ReviewRequestResponse.builder().id(1L).requestCode("SSB-2026-0001").status(ReviewRequestStatus.SUBMITTED).build()
        ));

        ResponseEntity<ApiResponse<List<ReviewRequestResponse>>> result =
                controller.listReviews(ReviewRequestStatus.SUBMITTED);

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("getReview should return review detail")
    void getReview() {
        when(service.getReview(1L)).thenReturn(
                ReviewRequestResponse.builder().id(1L).requestCode("SSB-2026-0001").status(ReviewRequestStatus.SUBMITTED).build()
        );

        ResponseEntity<ApiResponse<ReviewRequestResponse>> result = controller.getReview(1L);

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody().getData().getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("submitReview should call service")
    void submitReview() {
        when(service.submitReview(1L, "admin-subject")).thenReturn(
                ReviewRequestResponse.builder().id(1L).status(ReviewRequestStatus.SUBMITTED).build()
        );

        ResponseEntity<ApiResponse<ReviewRequestResponse>> result = controller.submitReview(
                1L, authToken("admin@example.com", "admin", "admin-subject")
        );

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody().getData().getStatus()).isEqualTo(ReviewRequestStatus.SUBMITTED);
    }

    @Test
    @DisplayName("castVote should pass authenticated identifiers to service")
    void castVote() {
        var auth = authToken("shariah.user@example.com", "preferred-user", "subject-123");
        var request = CastVoteRequest.builder().memberId(1L).vote(VoteType.APPROVE).comments("Approved").build();

        when(service.castVote(eq(1L), any(), eq("subject-123"), any())).thenReturn(
                ReviewRequestResponse.builder().id(1L).status(ReviewRequestStatus.APPROVED).build()
        );

        ResponseEntity<ApiResponse<ReviewRequestResponse>> result = controller.castVote(1L, request, auth);

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody().getData().getStatus()).isEqualTo(ReviewRequestStatus.APPROVED);
        verify(service).castVote(eq(1L), any(CastVoteRequest.class), eq("subject-123"),
                argThat(ids -> ids.contains("subject-123")
                        && ids.contains("preferred-user")
                        && ids.contains("shariah.user@example.com")));
    }

    @Test
    @DisplayName("resolveReview should call service")
    void resolveReview() {
        when(service.resolveReview(1L, "Resolution notes", "admin-subject")).thenReturn(
                ReviewRequestResponse.builder().id(1L).status(ReviewRequestStatus.APPROVED).resolutionNotes("Resolution notes").build()
        );

        ResponseEntity<ApiResponse<ReviewRequestResponse>> result = controller.resolveReview(
                1L, "Resolution notes", authToken("admin@example.com", "admin", "admin-subject")
        );

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody().getData().getResolutionNotes()).isEqualTo("Resolution notes");
    }

    @Test
    @DisplayName("getDashboard should return prompt-aligned dashboard response")
    void getDashboard() {
        when(service.getDashboard()).thenReturn(
                SsbDashboardResponse.builder()
                        .activeMembers(3)
                        .pendingReviews(2)
                        .approvedThisMonth(4)
                        .rejectedThisMonth(1)
                        .avgResolutionDays(2.5d)
                        .reviewsByCategory(java.util.Map.of("NEW_PRODUCT", 2L))
                        .upcomingDeadlines(List.of(
                                SsbUpcomingDeadlineResponse.builder()
                                        .reviewId(1L)
                                        .requestCode("SSB-2026-0001")
                                        .title("Murabaha Review")
                                        .priority("HIGH")
                                        .status(ReviewRequestStatus.UNDER_REVIEW)
                                        .slaDeadline(Instant.parse("2026-01-10T00:00:00Z"))
                                        .build()
                        ))
                        .build()
        );

        ResponseEntity<ApiResponse<SsbDashboardResponse>> result = controller.getDashboard();

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody().getData().getAvgResolutionDays()).isEqualTo(2.5d);
        assertThat(result.getBody().getData().getUpcomingDeadlines()).hasSize(1);
    }

    private JwtAuthenticationToken authToken(String email, String preferredUsername, String subject) {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim("sub", subject)
                .claim("preferred_username", preferredUsername)
                .claim("email", email)
                .build();
        return new JwtAuthenticationToken(jwt, AuthorityUtils.createAuthorityList("ROLE_CBS_ADMIN"));
    }
}
