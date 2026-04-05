package com.cbs.card.issuer;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class RemoteCardPanIssueResponse {

    @JsonAlias({"pan", "cardNumber", "primaryAccountNumber"})
    private String pan;

    @JsonAlias({"providerName", "issuerName"})
    private String providerName;

    @JsonAlias({"providerReference", "issuerReference", "requestId"})
    private String providerReference;
}