package com.cbs.card.service;

public record IslamicCardAuthorizationDecision(
        boolean applicable,
        boolean allowed,
        Long islamicCardId,
        String settlementGlCode,
        String shariahScreeningRef,
        String shariahDecision,
        String shariahReason,
        String responseCode
) {

    public static IslamicCardAuthorizationDecision notApplicable() {
        return new IslamicCardAuthorizationDecision(false, true, null, null, null, null, null, null);
    }

    public static IslamicCardAuthorizationDecision allowed(Long islamicCardId,
                                                           String settlementGlCode,
                                                           String screeningRef,
                                                           String shariahDecision,
                                                           String shariahReason) {
        return new IslamicCardAuthorizationDecision(true, true, islamicCardId, settlementGlCode,
                screeningRef, shariahDecision, shariahReason, null);
    }

    public static IslamicCardAuthorizationDecision blocked(Long islamicCardId,
                                                           String settlementGlCode,
                                                           String screeningRef,
                                                           String shariahReason,
                                                           String responseCode) {
        return new IslamicCardAuthorizationDecision(true, false, islamicCardId, settlementGlCode,
                screeningRef, "BLOCKED", shariahReason, responseCode);
    }
}