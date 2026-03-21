package com.cbs.nostro.dto;

import lombok.*;

import java.time.Instant;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AutoFetchConfigDto {
    private Long id;
    private String bankName;
    private String protocol;
    private String host;
    private String schedule;
    private Instant lastFetch;
    private String status;
    private String accountPattern;
}
