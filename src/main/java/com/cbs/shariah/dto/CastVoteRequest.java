package com.cbs.shariah.dto;

import com.cbs.shariah.entity.VoteType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CastVoteRequest {

    private Long memberId;

    @NotNull(message = "Vote is required")
    private VoteType vote;

    private String comments;
}
