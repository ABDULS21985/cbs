package com.cbs.locationref.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "location_reference")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LocationReference {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String locationCode;

    @Column(nullable = false, length = 20)
    private String locationType;

    @Column(nullable = false, length = 200)
    private String locationName;

    private Long parentLocationId;

    @Column(length = 3)
    private String isoCountryCode;

    @Column(length = 6)
    private String isoSubdivisionCode;

    private BigDecimal latitude;
    private BigDecimal longitude;

    @Column(length = 40)
    private String timezone;

    @Column(length = 3)
    private String currency;

    @Column(length = 40)
    private String regulatoryZone;

    @Builder.Default
    private Boolean isActive = true;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
