package com.cbs.sanctions;

import com.cbs.common.exception.ResourceNotFoundException;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SanctionsControllerTest {

    @Mock
    private WatchlistRepository watchlistRepository;

    @Mock
    private ScreeningRequestRepository screeningRepository;

    @InjectMocks
    private SanctionsScreeningService service;

    // ── refreshWatchlist ──────────────────────────────────────────────

    @Test
    @DisplayName("refreshWatchlist updates lastUpdated timestamp")
    void refreshWatchlistUpdatesLastUpdatedTimestamp() {
        Instant before = Instant.now().minusSeconds(3600);
        Watchlist wl = Watchlist.builder()
                .id(1L).listCode("OFAC_SDN").listName("OFAC SDN")
                .listSource("OFAC").entryId("ENT-001").entityType("INDIVIDUAL")
                .primaryName("John Doe").isActive(true).lastUpdated(before)
                .build();

        when(watchlistRepository.findById(1L)).thenReturn(Optional.of(wl));
        when(watchlistRepository.save(any(Watchlist.class))).thenAnswer(i -> i.getArgument(0));

        Watchlist result = service.refreshWatchlist(1L);

        assertThat(result.getLastUpdated()).isAfter(before);
        verify(watchlistRepository).save(wl);
    }

    @Test
    @DisplayName("refreshWatchlist marks entry as inactive if delistedDate is in the past")
    void refreshWatchlistMarksInactiveWhenDelistedDateInPast() {
        Watchlist wl = Watchlist.builder()
                .id(2L).listCode("UN_CONSOLIDATED").listName("UN Consolidated")
                .listSource("UN").entryId("ENT-002").entityType("ENTITY")
                .primaryName("Acme Corp").isActive(true)
                .delistedDate(LocalDate.now().minusDays(10))
                .build();

        when(watchlistRepository.findById(2L)).thenReturn(Optional.of(wl));
        when(watchlistRepository.save(any(Watchlist.class))).thenAnswer(i -> i.getArgument(0));

        Watchlist result = service.refreshWatchlist(2L);

        assertThat(result.getIsActive()).isFalse();
        verify(watchlistRepository).save(wl);
    }

    @Test
    @DisplayName("refreshWatchlist keeps entry active if delistedDate is in the future")
    void refreshWatchlistKeepsActiveWhenDelistedDateInFuture() {
        Watchlist wl = Watchlist.builder()
                .id(3L).listCode("EU_CONSOLIDATED").listName("EU Consolidated")
                .listSource("EU").entryId("ENT-003").entityType("INDIVIDUAL")
                .primaryName("Jane Smith").isActive(true)
                .delistedDate(LocalDate.now().plusDays(30))
                .build();

        when(watchlistRepository.findById(3L)).thenReturn(Optional.of(wl));
        when(watchlistRepository.save(any(Watchlist.class))).thenAnswer(i -> i.getArgument(0));

        Watchlist result = service.refreshWatchlist(3L);

        assertThat(result.getIsActive()).isTrue();
        verify(watchlistRepository).save(wl);
    }

    @Test
    @DisplayName("refreshWatchlist throws ResourceNotFoundException for missing watchlist")
    void refreshWatchlistThrowsWhenNotFound() {
        when(watchlistRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.refreshWatchlist(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── confirmMatch ──────────────────────────────────────────────────

    @Test
    @DisplayName("confirmMatch sets all pending matches to TRUE_MATCH")
    void confirmMatchSetsPendingToTrueMatch() {
        ScreeningRequest request = buildScreeningRequestWithPendingMatches();

        when(screeningRepository.findById(10L)).thenReturn(Optional.of(request));
        when(screeningRepository.save(any(ScreeningRequest.class))).thenAnswer(i -> i.getArgument(0));

        ScreeningRequest result = service.confirmMatch(10L);

        assertThat(result.getMatches()).allSatisfy(m -> {
            assertThat(m.getDisposition()).isEqualTo("TRUE_MATCH");
            assertThat(m.getDisposedBy()).isEqualTo("SYSTEM");
            assertThat(m.getDisposedAt()).isNotNull();
        });
    }

    @Test
    @DisplayName("confirmMatch sets status to CONFIRMED_MATCH when all resolved")
    void confirmMatchSetsStatusConfirmedWhenAllResolved() {
        ScreeningRequest request = buildScreeningRequestWithPendingMatches();

        when(screeningRepository.findById(10L)).thenReturn(Optional.of(request));
        when(screeningRepository.save(any(ScreeningRequest.class))).thenAnswer(i -> i.getArgument(0));

        ScreeningRequest result = service.confirmMatch(10L);

        assertThat(result.getStatus()).isEqualTo("CONFIRMED_MATCH");
        assertThat(result.getReviewedBy()).isEqualTo("SYSTEM");
        assertThat(result.getReviewedAt()).isNotNull();
        assertThat(result.getTrueMatches()).isEqualTo(2);
        verify(screeningRepository).save(request);
    }

    // ── markFalsePositive ─────────────────────────────────────────────

    @Test
    @DisplayName("markFalsePositive sets all pending matches to FALSE_POSITIVE")
    void markFalsePositiveSetsPendingToFalsePositive() {
        ScreeningRequest request = buildScreeningRequestWithPendingMatches();

        when(screeningRepository.findById(10L)).thenReturn(Optional.of(request));
        when(screeningRepository.save(any(ScreeningRequest.class))).thenAnswer(i -> i.getArgument(0));

        ScreeningRequest result = service.markFalsePositive(10L);

        assertThat(result.getMatches()).allSatisfy(m -> {
            assertThat(m.getDisposition()).isEqualTo("FALSE_POSITIVE");
            assertThat(m.getDisposedBy()).isEqualTo("SYSTEM");
            assertThat(m.getDisposedAt()).isNotNull();
        });
    }

    @Test
    @DisplayName("markFalsePositive sets status to CLEAR when no true matches")
    void markFalsePositiveSetsStatusClearWhenNoTrueMatches() {
        ScreeningRequest request = buildScreeningRequestWithPendingMatches();

        when(screeningRepository.findById(10L)).thenReturn(Optional.of(request));
        when(screeningRepository.save(any(ScreeningRequest.class))).thenAnswer(i -> i.getArgument(0));

        ScreeningRequest result = service.markFalsePositive(10L);

        assertThat(result.getStatus()).isEqualTo("CLEAR");
        assertThat(result.getReviewedBy()).isEqualTo("SYSTEM");
        assertThat(result.getReviewedAt()).isNotNull();
        assertThat(result.getFalsePositives()).isEqualTo(2);
        verify(screeningRepository).save(request);
    }

    // ── helpers ───────────────────────────────────────────────────────

    private ScreeningRequest buildScreeningRequestWithPendingMatches() {
        ScreeningRequest request = ScreeningRequest.builder()
                .id(10L).screeningRef("SCR-TEST000001")
                .screeningType("ONBOARDING").subjectName("John Doe")
                .subjectType("INDIVIDUAL").status("POTENTIAL_MATCH")
                .totalMatches(2).trueMatches(0).falsePositives(0)
                .matches(new ArrayList<>())
                .build();

        ScreeningMatch match1 = ScreeningMatch.builder()
                .id(100L).screening(request)
                .matchScore(new BigDecimal("92.50")).matchType("FUZZY")
                .matchedFields(List.of("primary_name"))
                .disposition("PENDING").build();

        ScreeningMatch match2 = ScreeningMatch.builder()
                .id(101L).screening(request)
                .matchScore(new BigDecimal("87.30")).matchType("FUZZY")
                .matchedFields(List.of("primary_name"))
                .disposition("PENDING").build();

        request.getMatches().add(match1);
        request.getMatches().add(match2);

        return request;
    }
}
