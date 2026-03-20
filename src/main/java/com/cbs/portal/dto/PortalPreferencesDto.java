package com.cbs.portal.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortalPreferencesDto {
    private String language;
    private Long defaultTransferAccountId;
    private String statementDelivery;  // EMAIL, DOWNLOAD, BOTH
}
