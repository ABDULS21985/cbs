package com.cbs.gl.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.time.LocalDate;
import java.util.List;

public record PostJournalRequest(
        @NotBlank String journalType,
        @NotBlank String description,
        String sourceModule,
        String sourceRef,
        LocalDate valueDate,
        @NotEmpty List<@Valid JournalLineRequest> lines
) {
}
