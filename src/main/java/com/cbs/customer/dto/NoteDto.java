package com.cbs.customer.dto;

import com.cbs.customer.entity.NoteType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NoteDto {

    private Long id;

    private NoteType noteType;

    @Size(max = 200)
    private String subject;

    @NotBlank(message = "Note content is required")
    private String content;

    private Boolean isPinned;
    private Instant createdAt;
    private String createdBy;
}
