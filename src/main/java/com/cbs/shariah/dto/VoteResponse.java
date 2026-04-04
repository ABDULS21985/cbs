package com.cbs.shariah.dto;

import com.cbs.shariah.entity.VoteType;
import lombok.*;

import java.time.Instant;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VoteResponse {
    private Long id;
    private Long reviewRequestId;
    private Long memberId;
    private String memberName;
    private VoteType vote;
    private String comments;
    private Instant votedAt;
}
