package com.cbs.card.issuer;

public interface CardPanIssuer {

    CardPanIssueResult issuePan(CardPanIssueCommand command);
}