package com.cbs.shariah.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Entity @Table(name = "ssb_board_member", schema = "cbs") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SsbBoardMember {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false, unique = true, length = 30)
    private String memberId;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "title", length = 80)
    private String title;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "qualifications", columnDefinition = "jsonb")
    private List<String> qualifications;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "specializations", columnDefinition = "jsonb")
    private List<String> specializations;

    @Column(name = "appointment_date", nullable = false)
    private LocalDate appointmentDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "is_active", nullable = false) @Builder.Default
    private Boolean isActive = true;

    @Column(name = "is_chairman", nullable = false) @Builder.Default
    private Boolean isChairman = false;

    @Column(name = "voting_weight", nullable = false) @Builder.Default
    private Integer votingWeight = 1;

    @Column(name = "contact_email", length = 150)
    private String contactEmail;

    @Column(name = "contact_phone", length = 30)
    private String contactPhone;

    @Column(name = "nationality", length = 60)
    private String nationality;

    @Column(name = "created_at", nullable = false, updatable = false) @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at") @Builder.Default
    private Instant updatedAt = Instant.now();

    @Version @Column(name = "version")
    private Long version;

    @PreUpdate
    void onUpdate() { this.updatedAt = Instant.now(); }
}
