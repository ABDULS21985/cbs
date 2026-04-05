package com.cbs.card.dto;

import java.time.Instant;
import java.util.List;

public record IslamicCardProfileResponse(
        Long id,
        String profileCode,
        String profileName,
        String description,
        List<String> restrictedMccs,
        Boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}