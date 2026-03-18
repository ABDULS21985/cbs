package com.cbs.contactcenter.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
@Entity @Table(name = "contact_interaction")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContactInteraction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String interactionId;
    private Long centerId;
    private Long customerId;
    private String agentId;
    @Column(nullable = false, length = 20) private String channel;
    @Column(nullable = false, length = 10) private String direction;
    private String contactReason;
    private String queueName;
    @Builder.Default private Integer waitTimeSec = 0;
    @Builder.Default private Integer handleTimeSec = 0;
    @Builder.Default private Integer wrapUpTimeSec = 0;
    @Builder.Default private Integer transferCount = 0;
    private String disposition;
    private String sentiment;
    @Builder.Default private Boolean firstContactResolution = false;
    private Long caseId;
    @Column(columnDefinition = "TEXT") private String notes;
    private String recordingRef;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ACTIVE";
    @Builder.Default private Instant startedAt = Instant.now();
    private Instant endedAt;
    @Builder.Default private Instant createdAt = Instant.now();
}
