package com.cbs.payments.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "bank_directory", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BankDirectory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bank_code", nullable = false, unique = true, length = 20)
    private String bankCode;

    @Column(name = "bank_name", nullable = false, length = 200)
    private String bankName;

    @Column(name = "short_name", length = 50)
    private String shortName;

    @Column(name = "swift_code", length = 11)
    private String swiftCode;

    @Column(name = "nip_code", length = 10)
    private String nipCode;

    @Column(name = "country_code", nullable = false, length = 3)
    @Builder.Default
    private String countryCode = "NGA";

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
