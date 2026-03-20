package com.cbs.portal.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TwoFactorResponse {
    private boolean enabled;
    private String qrCodeUrl;
    private String secret;
    private String message;
}
