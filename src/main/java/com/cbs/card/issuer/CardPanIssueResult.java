package com.cbs.card.issuer;

public record CardPanIssueResult(
        String pan,
        String providerName,
        String providerReference
) {
}