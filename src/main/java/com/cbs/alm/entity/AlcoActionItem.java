package com.cbs.alm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "alco_action_item", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AlcoActionItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @Column(name = "item_number", nullable = false, length = 20) private String itemNumber;
    @Column(name = "description", nullable = false, columnDefinition = "TEXT") private String description;
    @Column(name = "owner", nullable = false, length = 100) private String owner;
    @Column(name = "due_date", nullable = false) private LocalDate dueDate;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "OPEN";
    @Column(name = "update_notes", columnDefinition = "TEXT") @Builder.Default private String updateNotes = "";
    @Column(name = "meeting_date", nullable = false) private LocalDate meetingDate;

    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();

    @Version @Column(name = "version") private Long version;
}
