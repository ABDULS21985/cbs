package com.cbs.sanctions;

import com.cbs.sanctions.entity.ScreeningMatch;
import com.cbs.sanctions.entity.ScreeningRequest;
import com.cbs.sanctions.entity.Watchlist;
import com.cbs.sanctions.repository.ScreeningRequestRepository;
import com.cbs.sanctions.repository.WatchlistRepository;
import com.cbs.sanctions.service.SanctionsScreeningService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SanctionsScreeningServiceTest {

    @Mock
    private WatchlistRepository watchlistRepository;

    @Mock
    private ScreeningRequestRepository screeningRepository;

    @InjectMocks
    private SanctionsScreeningService service;

    // ── screenName ──────────────────────────────────────────────────────

    @Test
    @DisplayName("screenName creates a screening request with correct SCR- ref format")
    void screenNameCreatesRequestWithCorrectRefFormat() {
        when(watchlistRepository.fuzzySearch(anyString(), anyList(), anyDouble()))
                .thenReturn(List.of());
        when(screeningRepository.save(any(ScreeningRequest.class)))
                .thenAnswer(i -> i.getArgument(0));

        ScreeningRequest result = service.screenName(
                "CUSTOMER", "John Doe", "INDIVIDUAL",
                null, "US", null, 100L, "TXN-001",
                null, null);

        assertThat(result.getScreeningRef()).startsWith("SCR-");
        assertThat(result.getScreeningRef()).hasSize(16); // "SCR-" + 12 chars
        assertThat(result.getScreeningType()).isEqualTo("CUSTOMER");
        assertThat(result.getSubjectName()).isEqualTo("John Doe");
    }

    @Test
    @DisplayName("screenName returns CLEAR status when no matches found")
    void screenNameReturnsClearWhenNoMatches() {
        when(watchlistRepository.fuzzySearch(anyString(), anyList(), anyDouble()))
                .thenReturn(List.of());
        when(screeningRepository.save(any(ScreeningRequest.class)))
                .thenAnswer(i -> i.getArgument(0));

        ScreeningRequest result = service.screenName(
                "TRANSACTION", "Jane Smith", "INDIVIDUAL",
                null, "GB", null, 200L, "TXN-002",
                List.of("OFAC_SDN"), new BigDecimal("90.00"));

        assertThat(result.getStatus()).isEqualTo("CLEAR");
        assertThat(result.getMatches()).isEmpty();
        assertThat(result.getTotalMatches()).isEqualTo(0);
    }

    // ── disposeMatch ────────────────────────────────────────────────────

    @Test
    @DisplayName("disposeMatch updates match disposition and disposedBy")
    void disposeMatchUpdatesDispositionAndDisposedBy() {
        ScreeningRequest request = buildRequestWithMatches("POTENTIAL_MATCH", 2, "PENDING");
        when(screeningRepository.findById(1L)).thenReturn(Optional.of(request));
        when(screeningRepository.save(any(ScreeningRequest.class)))
                .thenAnswer(i -> i.getArgument(0));

        ScreeningRequest result = service.disposeMatch(1L, 10L, "FALSE_POSITIVE", "analyst1", "Not a match");

        ScreeningMatch disposed = result.getMatches().stream()
                .filter(m -> m.getId().equals(10L))
                .findFirst().orElseThrow();
        assertThat(disposed.getDisposition()).isEqualTo("FALSE_POSITIVE");
        assertThat(disposed.getDisposedBy()).isEqualTo("analyst1");
        assertThat(disposed.getDisposedAt()).isNotNull();
    }

    @Test
    @DisplayName("disposeMatch sets status to CONFIRMED_MATCH when all disposed and true matches exist")
    void disposeMatchSetsConfirmedMatchWhenTrueMatchesExist() {
        ScreeningRequest request = buildRequestWithMatches("POTENTIAL_MATCH", 2, "PENDING");
        // Pre-dispose first match as TRUE_MATCH
        request.getMatches().get(0).setId(10L);
        request.getMatches().get(0).setDisposition("TRUE_MATCH");
        // Second match still PENDING with id 11
        request.getMatches().get(1).setId(11L);

        when(screeningRepository.findById(1L)).thenReturn(Optional.of(request));
        when(screeningRepository.save(any(ScreeningRequest.class)))
                .thenAnswer(i -> i.getArgument(0));

        // Dispose second match as TRUE_MATCH too
        ScreeningRequest result = service.disposeMatch(1L, 11L, "TRUE_MATCH", "analyst2", "Confirmed");

        assertThat(result.getStatus()).isEqualTo("CONFIRMED_MATCH");
        assertThat(result.getTrueMatches()).isEqualTo(2);
        assertThat(result.getReviewedBy()).isEqualTo("analyst2");
        assertThat(result.getReviewedAt()).isNotNull();
    }

    @Test
    @DisplayName("disposeMatch sets status to CLEAR when all false positives")
    void disposeMatchSetsClearWhenAllFalsePositives() {
        ScreeningRequest request = buildRequestWithMatches("POTENTIAL_MATCH", 2, "PENDING");
        // Pre-dispose first match as FALSE_POSITIVE
        request.getMatches().get(0).setId(10L);
        request.getMatches().get(0).setDisposition("FALSE_POSITIVE");
        // Second match still PENDING
        request.getMatches().get(1).setId(11L);

        when(screeningRepository.findById(1L)).thenReturn(Optional.of(request));
        when(screeningRepository.save(any(ScreeningRequest.class)))
                .thenAnswer(i -> i.getArgument(0));

        ScreeningRequest result = service.disposeMatch(1L, 11L, "FALSE_POSITIVE", "analyst3", "All clear");

        assertThat(result.getStatus()).isEqualTo("CLEAR");
        assertThat(result.getFalsePositives()).isEqualTo(2);
        assertThat(result.getTrueMatches()).isEqualTo(0);
        assertThat(result.getReviewNotes()).isEqualTo("All clear");
    }

    // ── confirmMatch ────────────────────────────────────────────────────

    @Test
    @DisplayName("confirmMatch sets all pending matches to TRUE_MATCH")
    void confirmMatchSetsAllPendingToTrueMatch() {
        ScreeningRequest request = buildRequestWithMatches("POTENTIAL_MATCH", 3, "PENDING");
        when(screeningRepository.findById(1L)).thenReturn(Optional.of(request));
        when(screeningRepository.save(any(ScreeningRequest.class)))
                .thenAnswer(i -> i.getArgument(0));

        ScreeningRequest result = service.confirmMatch(1L);

        assertThat(result.getMatches()).allSatisfy(m -> {
            assertThat(m.getDisposition()).isEqualTo("TRUE_MATCH");
            assertThat(m.getDisposedBy()).isEqualTo("SYSTEM");
            assertThat(m.getDisposedAt()).isNotNull();
        });
    }

    @Test
    @DisplayName("confirmMatch sets request status to CONFIRMED_MATCH")
    void confirmMatchSetsRequestStatusToConfirmedMatch() {
        ScreeningRequest request = buildRequestWithMatches("POTENTIAL_MATCH", 2, "PENDING");
        when(screeningRepository.findById(1L)).thenReturn(Optional.of(request));
        when(screeningRepository.save(any(ScreeningRequest.class)))
                .thenAnswer(i -> i.getArgument(0));

        ScreeningRequest result = service.confirmMatch(1L);

        assertThat(result.getStatus()).isEqualTo("CONFIRMED_MATCH");
        assertThat(result.getTrueMatches()).isEqualTo(2);
        assertThat(result.getReviewedBy()).isEqualTo("SYSTEM");
        assertThat(result.getReviewedAt()).isNotNull();
    }

    // ── markFalsePositive ───────────────────────────────────────────────

    @Test
    @DisplayName("markFalsePositive sets all pending matches to FALSE_POSITIVE")
    void markFalsePositiveSetsAllPendingToFalsePositive() {
        ScreeningRequest request = buildRequestWithMatches("POTENTIAL_MATCH", 3, "PENDING");
        when(screeningRepository.findById(1L)).thenReturn(Optional.of(request));
        when(screeningRepository.save(any(ScreeningRequest.class)))
                .thenAnswer(i -> i.getArgument(0));

        ScreeningRequest result = service.markFalsePositive(1L);

        assertThat(result.getMatches()).allSatisfy(m -> {
            assertThat(m.getDisposition()).isEqualTo("FALSE_POSITIVE");
            assertThat(m.getDisposedBy()).isEqualTo("SYSTEM");
            assertThat(m.getDisposedAt()).isNotNull();
        });
    }

    @Test
    @DisplayName("markFalsePositive sets request status to CLEAR when no true matches")
    void markFalsePositiveSetsClearWhenNoTrueMatches() {
        ScreeningRequest request = buildRequestWithMatches("POTENTIAL_MATCH", 2, "PENDING");
        when(screeningRepository.findById(1L)).thenReturn(Optional.of(request));
        when(screeningRepository.save(any(ScreeningRequest.class)))
                .thenAnswer(i -> i.getArgument(0));

        ScreeningRequest result = service.markFalsePositive(1L);

        assertThat(result.getStatus()).isEqualTo("CLEAR");
        assertThat(result.getFalsePositives()).isEqualTo(2);
        assertThat(result.getReviewedBy()).isEqualTo("SYSTEM");
        assertThat(result.getReviewedAt()).isNotNull();
    }

    // ── getPendingReview ────────────────────────────────────────────────

    @Test
    @DisplayName("getPendingReview delegates to repository with POTENTIAL_MATCH status")
    void getPendingReviewDelegatesToRepository() {
        Pageable pageable = PageRequest.of(0, 20);
        ScreeningRequest req = ScreeningRequest.builder()
                .id(1L).screeningRef("SCR-ABC123").status("POTENTIAL_MATCH").build();
        Page<ScreeningRequest> expectedPage = new PageImpl<>(List.of(req), pageable, 1);

        when(screeningRepository.findByStatusOrderByCreatedAtDesc("POTENTIAL_MATCH", pageable))
                .thenReturn(expectedPage);

        Page<ScreeningRequest> result = service.getPendingReview(pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getScreeningRef()).isEqualTo("SCR-ABC123");
        verify(screeningRepository).findByStatusOrderByCreatedAtDesc("POTENTIAL_MATCH", pageable);
    }

    // ── helpers ─────────────────────────────────────────────────────────

    private ScreeningRequest buildRequestWithMatches(String status, int matchCount, String disposition) {
        ScreeningRequest request = ScreeningRequest.builder()
                .id(1L)
                .screeningRef("SCR-TEST000001")
                .screeningType("CUSTOMER")
                .subjectName("Test Subject")
                .subjectType("INDIVIDUAL")
                .status(status)
                .totalMatches(matchCount)
                .matches(new ArrayList<>())
                .build();

        for (int i = 0; i < matchCount; i++) {
            ScreeningMatch match = ScreeningMatch.builder()
                    .id((long) (10 + i))
                    .screening(request)
                    .matchScore(new BigDecimal("92.50"))
                    .matchType("FUZZY")
                    .matchedFields(List.of("primary_name"))
                    .disposition(disposition)
                    .build();
            request.getMatches().add(match);
        }

        return request;
    }
}
