package com.cbs.islamicaml.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FiuResponseDetails {
    private String fiuReferenceNumber;
    private String responseNotes;
    private boolean acknowledged;
}
