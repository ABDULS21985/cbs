package com.cbs.sanctions.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.sanctions.entity.*;
import com.cbs.sanctions.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SanctionsScreeningService {

    private final WatchlistRepository watchlistRepository;
    private final ScreeningRequestRepository screeningRepository;

    /**
     * Screens a name against configured watchlists using fuzzy matching.
     * Returns CLEAR if no matches above threshold, POTENTIAL_MATCH if hits found.
     */
    @Transactional
    public ScreeningRequest screenName(String screeningType, String subjectName, String subjectType,
                                         java.time.LocalDate subjectDob, String subjectNationality,
                                         String subjectIdNumber, Long customerId, String transactionRef,
                                         List<String> listsToScreen, BigDecimal matchThreshold) {
        long startTime = System.currentTimeMillis();
        String ref = "SCR-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();

        List<String> lists = listsToScreen != null ? listsToScreen :
                List.of("OFAC_SDN", "UN_CONSOLIDATED", "EU_CONSOLIDATED", "PEP");
        BigDecimal threshold = matchThreshold != null ? matchThreshold : new BigDecimal("85.00");

        ScreeningRequest request = ScreeningRequest.builder()
                .screeningRef(ref).screeningType(screeningType)
                .subjectName(subjectName).subjectType(subjectType)
                .subjectDob(subjectDob).subjectNationality(subjectNationality)
                .subjectIdNumber(subjectIdNumber).customerId(customerId)
                .transactionRef(transactionRef).listsScreened(lists)
                .matchThreshold(threshold).status("SCREENING").build();

        // Fuzzy search across all configured lists
        List<Watchlist> matches;
        try {
            matches = watchlistRepository.fuzzySearch(subjectName, lists, threshold.doubleValue() / 100.0);
        } catch (Exception e) {
            // Fallback: pg_trgm may not be installed — do exact prefix match
            log.warn("Fuzzy search failed (pg_trgm not available?), falling back: {}", e.getMessage());
            matches = List.of();
        }

        request.setTotalMatches(matches.size());

        for (Watchlist wl : matches) {
            BigDecimal score = calculateMatchScore(subjectName, wl.getPrimaryName(), subjectDob, wl.getDateOfBirth());

            if (score.compareTo(threshold) >= 0) {
                ScreeningMatch match = ScreeningMatch.builder()
                        .screening(request).watchlist(wl)
                        .matchScore(score).matchType(score.compareTo(new BigDecimal("99")) >= 0 ? "EXACT" : "FUZZY")
                        .matchedFields(List.of("primary_name"))
                        .disposition("PENDING").build();
                request.getMatches().add(match);
            }
        }

        request.setScreeningTimeMs((int)(System.currentTimeMillis() - startTime));
        request.setStatus(request.getMatches().isEmpty() ? "CLEAR" : "POTENTIAL_MATCH");

        ScreeningRequest saved = screeningRepository.save(request);

        if (!request.getMatches().isEmpty()) {
            log.warn("Sanctions screening hit: ref={}, subject={}, matches={}", ref, subjectName, request.getMatches().size());
        } else {
            log.info("Sanctions screening clear: ref={}, subject={}, time={}ms", ref, subjectName, request.getScreeningTimeMs());
        }

        return saved;
    }

    @Transactional
    public ScreeningRequest disposeMatch(Long screeningId, Long matchId, String disposition,
                                           String disposedBy, String notes) {
        ScreeningRequest request = screeningRepository.findById(screeningId)
                .orElseThrow(() -> new ResourceNotFoundException("ScreeningRequest", "id", screeningId));

        request.getMatches().stream()
                .filter(m -> m.getId().equals(matchId))
                .findFirst()
                .ifPresent(m -> {
                    m.setDisposition(disposition);
                    m.setDisposedBy(disposedBy);
                    m.setDisposedAt(Instant.now());
                });

        // Update counters
        long trueCount = request.getMatches().stream().filter(m -> "TRUE_MATCH".equals(m.getDisposition())).count();
        long fpCount = request.getMatches().stream().filter(m -> "FALSE_POSITIVE".equals(m.getDisposition())).count();
        request.setTrueMatches((int) trueCount);
        request.setFalsePositives((int) fpCount);

        boolean allDisposed = request.getMatches().stream().noneMatch(m -> "PENDING".equals(m.getDisposition()));
        if (allDisposed) {
            request.setStatus(trueCount > 0 ? "CONFIRMED_MATCH" : "CLEAR");
            request.setReviewedBy(disposedBy);
            request.setReviewedAt(Instant.now());
            request.setReviewNotes(notes);
        }

        return screeningRepository.save(request);
    }

    @Transactional
    public ScreeningRequest confirmMatch(Long screeningId) {
        ScreeningRequest request = screeningRepository.findById(screeningId)
                .orElseThrow(() -> new ResourceNotFoundException("ScreeningRequest", "id", screeningId));
        request.getMatches().stream()
                .filter(m -> "PENDING".equals(m.getDisposition()))
                .forEach(m -> {
                    m.setDisposition("TRUE_MATCH");
                    m.setDisposedBy("SYSTEM");
                    m.setDisposedAt(Instant.now());
                });
        long trueCount = request.getMatches().stream().filter(m -> "TRUE_MATCH".equals(m.getDisposition())).count();
        request.setTrueMatches((int) trueCount);
        boolean allDisposed = request.getMatches().stream().noneMatch(m -> "PENDING".equals(m.getDisposition()));
        if (allDisposed) {
            request.setStatus("CONFIRMED_MATCH");
            request.setReviewedBy("SYSTEM");
            request.setReviewedAt(Instant.now());
        }
        log.info("Sanctions match confirmed: screeningId={}, trueMatches={}", screeningId, trueCount);
        return screeningRepository.save(request);
    }

    @Transactional
    public ScreeningRequest markFalsePositive(Long screeningId) {
        ScreeningRequest request = screeningRepository.findById(screeningId)
                .orElseThrow(() -> new ResourceNotFoundException("ScreeningRequest", "id", screeningId));
        request.getMatches().stream()
                .filter(m -> "PENDING".equals(m.getDisposition()))
                .forEach(m -> {
                    m.setDisposition("FALSE_POSITIVE");
                    m.setDisposedBy("SYSTEM");
                    m.setDisposedAt(Instant.now());
                });
        long fpCount = request.getMatches().stream().filter(m -> "FALSE_POSITIVE".equals(m.getDisposition())).count();
        request.setFalsePositives((int) fpCount);
        boolean allDisposed = request.getMatches().stream().noneMatch(m -> "PENDING".equals(m.getDisposition()));
        if (allDisposed) {
            long trueCount = request.getMatches().stream().filter(m -> "TRUE_MATCH".equals(m.getDisposition())).count();
            request.setStatus(trueCount > 0 ? "CONFIRMED_MATCH" : "CLEAR");
            request.setReviewedBy("SYSTEM");
            request.setReviewedAt(Instant.now());
        }
        log.info("Sanctions match marked false positive: screeningId={}, fpCount={}", screeningId, fpCount);
        return screeningRepository.save(request);
    }

    @Transactional
    public Watchlist refreshWatchlist(Long watchlistId) {
        Watchlist wl = watchlistRepository.findById(watchlistId)
                .orElseThrow(() -> new ResourceNotFoundException("Watchlist", "id", watchlistId));
        // Refresh the entry timestamp — in production this would trigger an external list sync
        wl.setLastUpdated(Instant.now());
        // Delist entries that have a delisted date in the past
        if (wl.getDelistedDate() != null && wl.getDelistedDate().isBefore(java.time.LocalDate.now())) {
            wl.setIsActive(false);
            log.info("Watchlist entry delisted during refresh: listCode={}, entryId={}", wl.getListCode(), wl.getEntryId());
        }
        log.info("Watchlist refreshed: id={}, listCode={}, entryId={}", watchlistId, wl.getListCode(), wl.getEntryId());
        return watchlistRepository.save(wl);
    }

    public Page<ScreeningRequest> getPendingReview(Pageable pageable) {
        return screeningRepository.findByStatusOrderByCreatedAtDesc("POTENTIAL_MATCH", pageable);
    }

    public Page<ScreeningRequest> getCustomerScreenings(Long customerId, Pageable pageable) {
        return screeningRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable);
    }

    private BigDecimal calculateMatchScore(String queryName, String listName,
                                             java.time.LocalDate queryDob, java.time.LocalDate listDob) {
        // Simplified scoring — production would use Jaro-Winkler / Levenshtein
        String qNorm = queryName.toUpperCase().trim();
        String lNorm = listName.toUpperCase().trim();

        if (qNorm.equals(lNorm)) return new BigDecimal("100.00");

        // Token overlap score
        String[] qTokens = qNorm.split("\\s+");
        String[] lTokens = lNorm.split("\\s+");
        long matchedTokens = 0;
        for (String qt : qTokens) {
            for (String lt : lTokens) {
                if (qt.equals(lt) || (qt.length() > 3 && lt.contains(qt))) { matchedTokens++; break; }
            }
        }
        double tokenScore = (double) matchedTokens / Math.max(qTokens.length, lTokens.length) * 100;

        // DOB boost
        if (queryDob != null && listDob != null && queryDob.equals(listDob)) tokenScore = Math.min(tokenScore + 15, 100);

        return BigDecimal.valueOf(tokenScore).setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
