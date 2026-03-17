package com.cbs.microfinance.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "group_meeting", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GroupMeeting {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private LendingGroup group;

    @Column(name = "meeting_date", nullable = false)
    private LocalDate meetingDate;

    @Column(name = "attendance_count", nullable = false)
    @Builder.Default
    private Integer attendanceCount = 0;

    @Column(name = "total_collections", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalCollections = BigDecimal.ZERO;

    @Column(name = "total_disbursements", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalDisbursements = BigDecimal.ZERO;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "conducted_by", length = 100)
    private String conductedBy;

    @Column(name = "gps_latitude", precision = 10, scale = 7)
    private BigDecimal gpsLatitude;

    @Column(name = "gps_longitude", precision = 10, scale = 7)
    private BigDecimal gpsLongitude;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Version @Column(name = "version")
    private Long version;
}
