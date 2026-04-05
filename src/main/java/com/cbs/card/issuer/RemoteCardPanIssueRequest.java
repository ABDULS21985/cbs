package com.cbs.card.issuer;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RemoteCardPanIssueRequest {

    private String cardReference;
    private Long accountId;
    private Long customerId;
    private String cardType;
    private String scheme;
    private String tier;
    private String cardholderName;
    private String branchCode;
    private String currencyCode;
    private String expiryDate;
    private String institutionId;
}