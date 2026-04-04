package com.cbs.shariah.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity @Table(name = "ssb_vote", schema = "cbs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"review_request_id", "member_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SsbVote {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "review_request_id", nullable = false)
    private Long reviewRequestId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Enumerated(EnumType.STRING)
    @Column(name = "vote", nullable = false, length = 20)
    private VoteType vote;

    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    @Column(name = "voted_at", nullable = false) @Builder.Default
    private Instant votedAt = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false) @Builder.Default
    private Instant createdAt = Instant.now();
}
