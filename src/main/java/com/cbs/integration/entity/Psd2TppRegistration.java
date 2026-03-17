package com.cbs.integration.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.List;

@Entity @Table(name = "psd2_tpp_registration")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Psd2TppRegistration {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 80) private String tppId;
    @Column(nullable = false, length = 200) private String tppName;
    @Column(nullable = false, length = 20) private String tppType;
    private String nationalAuthority;
    private String authorizationNumber;
    @Column(columnDefinition = "TEXT") private String eidasCertificate;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> redirectUris;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> allowedScopes;
    @Column(nullable = false, length = 20) @Builder.Default private String scaApproach = "REDIRECT";
    @Column(nullable = false, length = 20) @Builder.Default private String status = "PENDING";
    @JdbcTypeCode(SqlTypes.JSON) private List<String> passportingCountries;
    private Instant lastCertificateCheck;
    @Builder.Default private Boolean certificateValid = true;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
