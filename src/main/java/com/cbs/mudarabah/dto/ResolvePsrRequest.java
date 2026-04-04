package com.cbs.mudarabah.dto;

import lombok.*;

import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ResolvePsrRequest {

    private Long productTemplateId;
    private Map<String, Object> context;
}
