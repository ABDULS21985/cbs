package com.cbs.collections.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "collection_action", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CollectionAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", nullable = false)
    private CollectionCase collectionCase;

    @Column(name = "action_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private CollectionActionType actionType;

    @Column(name = "action_date", nullable = false)
    @Builder.Default
    private Instant actionDate = Instant.now();

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "outcome", length = 50)
    private String outcome;

    @Column(name = "promised_amount", precision = 18, scale = 2)
    private BigDecimal promisedAmount;

    @Column(name = "promised_date")
    private LocalDate promisedDate;

    @Column(name = "promise_kept")
    private Boolean promiseKept;

    @Column(name = "contact_number", length = 20)
    private String contactNumber;

    @Column(name = "contact_person", length = 100)
    private String contactPerson;

    @Column(name = "visit_latitude", precision = 10, scale = 7)
    private BigDecimal visitLatitude;

    @Column(name = "visit_longitude", precision = 10, scale = 7)
    private BigDecimal visitLongitude;

    @Column(name = "visit_photo_url", length = 500)
    private String visitPhotoUrl;

    @Column(name = "next_action_date")
    private LocalDate nextActionDate;

    @Column(name = "next_action_type", length = 30)
    private String nextActionType;

    @Column(name = "performed_by", nullable = false, length = 100)
    private String performedBy;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Version
    @Column(name = "version")
    private Long version;
}
